package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"path"
	"regexp"
	"strings"
	"text/template"
	"time"
)

type Config struct {
	Extends     *string            `json:"extends,omitempty"`
	Rules       map[string]*string `json:"rules"`
	Passthrough []string           `json:"passthrough"`
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
	keyPattern    = regexp.MustCompile(`([A-Z][A-Z0-9]+)-([0-9]+)`)
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
	return resolveKey(branch, config.Passthrough)
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

func resolveKey(branch string, passthrough []string) *TemplateData {
	if len(passthrough) == 0 {
		return nil
	}
	allowed := make(map[string]bool, len(passthrough))
	for _, k := range passthrough {
		allowed[k] = true
	}
	for _, m := range keyPattern.FindAllStringSubmatch(branch, -1) {
		if len(m[2]) <= 7 && allowed[m[1]] {
			return &TemplateData{Prefix: m[0], Number: m[2]}
		}
	}
	return nil
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
		beforeOK := start == 0 || !isKeyByte(message[start-1])
		afterOK := end >= len(message) || !isKeyByte(message[end])
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

	if config.Extends != nil && *config.Extends != "" {
		baseConfig, err := fetchExtendsConfig(*config.Extends)
		if err != nil {
			fmt.Printf("Error loading extends config: %v\n", err)
			os.Exit(1)
		}
		config = mergeConfigs(baseConfig, config)
	}

	return config
}

// fetchExtendsConfig fetches and parses a remote .commithelperrc.json from url.
// Only http:// and https:// URLs are accepted.
func fetchExtendsConfig(url string) (Config, error) {
	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		return Config{}, fmt.Errorf("extends must be an http/https URL, got: %s", url)
	}
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return Config{}, fmt.Errorf("failed to fetch extends config from %q: %w", url, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return Config{}, fmt.Errorf("failed to fetch extends config from %q: HTTP %s", url, resp.Status)
	}
	data, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return Config{}, fmt.Errorf("failed to read extends config from %q: %w", url, err)
	}
	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return Config{}, fmt.Errorf("failed to parse extends config from %q: %w", url, err)
	}
	return cfg, nil
}

// mergeConfigs merges base (remote extends) and local configs.
// Merge strategy:
//   - rules:       base is the default; local overrides on key conflict
//   - protect:     union of base + local (deduped)
//   - passthrough: union of base + local (deduped)
//   - template:    local wins; falls back to base if local is unset
func mergeConfigs(base, local Config) Config {
	merged := Config{
		Rules:    make(map[string]*string),
		Template: local.Template,
	}
	if merged.Template == nil {
		merged.Template = base.Template
	}

	for k, v := range base.Rules {
		merged.Rules[k] = v
	}
	for k, v := range local.Rules {
		merged.Rules[k] = v
	}

	seen := make(map[string]bool)
	for _, p := range base.Protect {
		if !seen[p] {
			merged.Protect = append(merged.Protect, p)
			seen[p] = true
		}
	}
	for _, p := range local.Protect {
		if !seen[p] {
			merged.Protect = append(merged.Protect, p)
			seen[p] = true
		}
	}

	seenPT := make(map[string]bool)
	for _, p := range base.Passthrough {
		if !seenPT[p] {
			merged.Passthrough = append(merged.Passthrough, p)
			seenPT[p] = true
		}
	}
	for _, p := range local.Passthrough {
		if !seenPT[p] {
			merged.Passthrough = append(merged.Passthrough, p)
			seenPT[p] = true
		}
	}

	return merged
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

func isWordByte(b byte) bool {
	return b == '_' ||
		(b >= '0' && b <= '9') ||
		(b >= 'a' && b <= 'z') ||
		(b >= 'A' && b <= 'Z')
}

func isKeyByte(b byte) bool { return b == '-' || isWordByte(b) }
