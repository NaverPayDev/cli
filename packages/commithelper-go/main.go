package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"path"
	"regexp"
	"strings"
	"text/template"
)

// Passthrough declares which verbatim issue keys (e.g. "PROJ" in
// "PROJ-1871") the helper copies straight into the commit message —
// unchanged — as opposed to `rules`, which translate a prefix into a repo
// reference. In JSON it is either the string "uppercase" (recognize any
// uppercase key shape) or an array of project keys (recognize only those).
// Absent/null = off.
type Passthrough struct {
	All  bool
	Keys []string
}

func (p *Passthrough) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		return nil
	}

	var s string
	if err := json.Unmarshal(data, &s); err == nil {
		if s != "uppercase" {
			return fmt.Errorf("passthrough: string value must be %q, got %q", "uppercase", s)
		}
		p.All = true
		return nil
	}

	var arr []string
	if err := json.Unmarshal(data, &arr); err != nil {
		return fmt.Errorf("passthrough: must be %q or an array of key strings", "uppercase")
	}
	p.Keys = arr
	return nil
}

type Config struct {
	Rules       map[string]*string `json:"rules"`
	Passthrough Passthrough        `json:"passthrough"`
	Protect     []string           `json:"protect"`
	Template    *string            `json:"template,omitempty"`
}

type TemplateData struct {
	Message string
	Number  string
	Repo    string
	Prefix  string
}

var (
	// GitHub-style branch: <prefix>/<number>. The prefix is translated to a
	// repo via Config.Rules; the number becomes the issue reference.
	prefixPattern = regexp.MustCompile(`^([\w-]+)/(\d+)`)
	// Verbatim issue-key shape (uppercase project + number), used for the
	// "uppercase" mode and for validating declared keys.
	anyKeyPattern   = regexp.MustCompile(`\b([A-Z][A-Z0-9]+)-(\d{1,7})\b`)
	keyShapePattern = regexp.MustCompile(`^[A-Z][A-Z0-9]+$`)
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: commithelper-go <commit-message-file-or-text>")
		os.Exit(1)
	}

	input := os.Args[1]
	isFile := false
	var commitMessage string

	if _, err := os.Stat(input); err == nil {
		isFile = true
		commitMessageBytes, err := ioutil.ReadFile(input)
		if err != nil {
			fmt.Printf("Error reading commit message file: %v\n", err)
			os.Exit(1)
		}
		commitMessage = string(commitMessageBytes)
	} else {
		commitMessage = input
	}

	branchName := getCurrentBranchName()
	config := loadConfig()

	result, err := processMessage(commitMessage, branchName, config)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}

	if isFile {
		if err := ioutil.WriteFile(input, []byte(result), 0644); err != nil {
			fmt.Printf("Error writing to commit message file: %v\n", err)
			os.Exit(1)
		}
	} else {
		fmt.Println(result)
	}
}

// processMessage is the pure core: it gates protected branches, resolves the
// issue reference from the branch, and tags the message idempotently.
func processMessage(message, branch string, config Config) (string, error) {
	protected, err := isProtectedBranch(branch, config.Protect)
	if err != nil {
		return "", err
	}
	if protected {
		return "", fmt.Errorf("cannot commit to protected branch %q", branch)
	}

	td := resolve(branch, config)
	if td == nil {
		return message, nil
	}
	if alreadyHasRef(message, td.Prefix) {
		return message, nil
	}

	td.Message = message
	return applyTemplate(config, td), nil
}

// resolve maps a branch to an issue reference, trying the GitHub-style prefix
// rules first, then verbatim passthrough keys.
func resolve(branch string, config Config) *TemplateData {
	if td := resolvePrefix(branch, config); td != nil {
		return td
	}
	return resolveVerbatim(branch, config.Passthrough)
}

// resolvePrefix translates a "<prefix>/<number>" branch into a reference using
// Config.Rules (nil value → "#N", repo value → "repo#N").
func resolvePrefix(branch string, config Config) *TemplateData {
	matches := prefixPattern.FindStringSubmatch(branch)
	if len(matches) < 3 {
		return nil
	}

	prefixKey := matches[1]
	issueNumber := matches[2]

	repo, exists := config.Rules[prefixKey]
	if !exists {
		return nil
	}

	if repo == nil {
		return &TemplateData{
			Number: issueNumber,
			Prefix: fmt.Sprintf("#%s", issueNumber),
		}
	}
	return &TemplateData{
		Number: issueNumber,
		Repo:   *repo,
		Prefix: fmt.Sprintf("%s#%s", *repo, issueNumber),
	}
}

// resolveVerbatim finds an uppercase issue key in the branch and copies it
// as-is. Only keys allowed by Passthrough are recognized.
func resolveVerbatim(branch string, pt Passthrough) *TemplateData {
	var pattern *regexp.Regexp
	if pt.All {
		pattern = anyKeyPattern
	} else {
		valid := validKeys(pt.Keys)
		if len(valid) == 0 {
			return nil
		}
		pattern = buildKeyPattern(valid)
	}

	// Strict: mirror Jigit's (?!-\d). A key immediately followed by "-<digit>"
	// (e.g. a date suffix) is not recognized; skip it and try the next match so
	// a valid key later in the branch is still found.
	for _, loc := range pattern.FindAllStringSubmatchIndex(branch, -1) {
		end := loc[1]
		if end+1 < len(branch) && branch[end] == '-' && isDigit(branch[end+1]) {
			continue
		}
		return &TemplateData{Prefix: branch[loc[0]:loc[1]]}
	}
	return nil
}

// validKeys keeps only entries shaped like an uppercase project key. Invalid
// entries would never link, so they are warned about and skipped.
func validKeys(keys []string) []string {
	valid := make([]string, 0, len(keys))
	for _, k := range keys {
		if keyShapePattern.MatchString(k) {
			valid = append(valid, k)
		} else {
			fmt.Fprintf(os.Stderr, "commithelper: ignoring invalid passthrough entry %q (must match [A-Z][A-Z0-9]+)\n", k)
		}
	}
	return valid
}

func buildKeyPattern(keys []string) *regexp.Regexp {
	quoted := make([]string, len(keys))
	for i, k := range keys {
		quoted[i] = regexp.QuoteMeta(k)
	}
	return regexp.MustCompile(`\b(` + strings.Join(quoted, "|") + `)-(\d{1,7})\b`)
}

// alreadyHasRef reports whether the resolved reference is already present in
// the message, so re-runs (e.g. git commit --amend) do not tag twice. The
// reference must appear as a whole token, not as part of a longer number
// (so "#123" does not match "#1234").
func alreadyHasRef(message, ref string) bool {
	if ref == "" {
		return false
	}
	for from := 0; from <= len(message); {
		j := strings.Index(message[from:], ref)
		if j < 0 {
			return false
		}
		start := from + j
		end := start + len(ref)
		beforeOK := start == 0 || !isWordByte(message[start-1])
		afterOK := end >= len(message) || !isDigit(message[end])
		if beforeOK && afterOK {
			return true
		}
		from = start + 1
	}
	return false
}

func getCurrentBranchName() string {
	cmd := exec.Command("git", "branch", "--show-current")
	output, err := cmd.Output()
	if err != nil {
		fmt.Printf("Error fetching branch name: %v\n", err)
		os.Exit(1)
	}
	return strings.TrimSpace(string(output))
}

func loadConfig() Config {
	cwd, err := os.Getwd()
	if err != nil {
		fmt.Printf("Error getting current working directory: %v\n", err)
		os.Exit(1)
	}

	configPath := fmt.Sprintf("%s/.commithelperrc.json", cwd)
	file, err := os.Open(configPath)
	if err != nil {
		if os.IsNotExist(err) {
			// Return an empty config if the file does not exist
			return Config{Rules: map[string]*string{}, Protect: []string{}}
		}
		fmt.Printf("Error reading config file at %s: %v\n", configPath, err)
		os.Exit(1)
	}
	defer file.Close()

	bytes, err := ioutil.ReadAll(file)
	if err != nil {
		fmt.Printf("Error reading config file: %v\n", err)
		os.Exit(1)
	}

	var config Config
	if err := json.Unmarshal(bytes, &config); err != nil {
		fmt.Printf("Error parsing config file: %v\n", err)
		os.Exit(1)
	}

	return config
}

func applyTemplate(config Config, data *TemplateData) string {
	// If no template is configured, use default format
	if config.Template == nil || *config.Template == "" {
		return fmt.Sprintf("[%s] %s", data.Prefix, data.Message)
	}

	tmpl, err := template.New("commit").Parse(*config.Template)
	if err != nil {
		fmt.Printf("Error parsing template: %v\n", err)
		// Fallback to default format
		return fmt.Sprintf("[%s] %s", data.Prefix, data.Message)
	}

	var buf bytes.Buffer
	err = tmpl.Execute(&buf, data)
	if err != nil {
		fmt.Printf("Error executing template: %v\n", err)
		// Fallback to default format
		return fmt.Sprintf("[%s] %s", data.Prefix, data.Message)
	}

	return buf.String()
}

func isProtectedBranch(branchName string, protectedBranches []string) (bool, error) {
	for _, pattern := range protectedBranches {
		matched, err := path.Match(pattern, branchName)
		if err != nil {
			return false, fmt.Errorf("invalid protect pattern %q: %w", pattern, err)
		}
		if matched {
			return true, nil
		}
	}
	return false, nil
}

func isDigit(b byte) bool { return b >= '0' && b <= '9' }

func isWordByte(b byte) bool {
	return b == '_' ||
		(b >= '0' && b <= '9') ||
		(b >= 'a' && b <= 'z') ||
		(b >= 'A' && b <= 'Z')
}
