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

type Config struct {
	Rules    map[string]*string `json:"rules"`
	Protect  []string           `json:"protect"`
	Template *string            `json:"template,omitempty"`
}

type TemplateData struct {
	Message string
	Number  string
	Repo    string
	Prefix  string
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: commithelper-go <commit-message-file-or-text>")
		os.Exit(1)
	}

	input := os.Args[1]
	var commitMessage string

	if _, err := os.Stat(input); err == nil {
		// Input is a file path
		commitMessageBytes, err := ioutil.ReadFile(input)
		if err != nil {
			fmt.Printf("Error reading commit message file: %v\n", err)
			os.Exit(1)
		}
		commitMessage = string(commitMessageBytes)
	} else {
		// Input is a direct commit message
		commitMessage = input
	}

	// Check if commit message is already tagged
	if isAlreadyTagged(commitMessage) {
		// Do not modify if already tagged
		if _, err := os.Stat(input); err == nil {
			// Write back unchanged if input was a file
			err = ioutil.WriteFile(input, []byte(commitMessage), 0644)
			if err != nil {
				fmt.Printf("Error writing to commit message file: %v\n", err)
				os.Exit(1)
			}
		} else {
			// Print unchanged if input was a direct message
			fmt.Println(commitMessage)
		}
		return
	}

	branchName := getCurrentBranchName()
	config := loadConfig()

	// Check if current branch is protected
	if isProtectedBranch(branchName, config.Protect) {
		fmt.Printf("Error: Cannot commit to protected branch '%s'\n", branchName)
		os.Exit(1)
	}

	templateData := generateTemplateData(branchName, config, commitMessage)
	if templateData != nil {
		commitMessage = applyTemplate(config, templateData)
	}

	if _, err := os.Stat(input); err == nil {
		// Write back to the file if input was a file
		err = ioutil.WriteFile(input, []byte(commitMessage), 0644)
		if err != nil {
			fmt.Printf("Error writing to commit message file: %v\n", err)
			os.Exit(1)
		}
	} else {
		// Print the result if input was a direct message
		fmt.Println(commitMessage)
	}
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

func generatePrefix(branchName string, config Config) string {
	pattern := regexp.MustCompile(`^(\w+)/(\d+).*`)
	matches := pattern.FindStringSubmatch(branchName)
	if len(matches) < 3 {
		return ""
	}

	prefixKey := matches[1]
	issueNumber := matches[2]

	repo, exists := config.Rules[prefixKey]
	if !exists {
		return ""
	}

	if repo == nil {
		return fmt.Sprintf("#%s", issueNumber)
	}

	return fmt.Sprintf("%s#%s", *repo, issueNumber)
}

func generateTemplateData(branchName string, config Config, message string) *TemplateData {
	pattern := regexp.MustCompile(`^(\w+)/(\d+).*`)
	matches := pattern.FindStringSubmatch(branchName)
	if len(matches) < 3 {
		return nil
	}

	prefixKey := matches[1]
	issueNumber := matches[2]

	repo, exists := config.Rules[prefixKey]
	if !exists {
		return nil
	}

	var repoName string
	var prefix string
	if repo == nil {
		repoName = ""
		prefix = fmt.Sprintf("#%s", issueNumber)
	} else {
		repoName = *repo
		prefix = fmt.Sprintf("%s#%s", *repo, issueNumber)
	}

	return &TemplateData{
		Message: message,
		Number:  issueNumber,
		Repo:    repoName,
		Prefix:  prefix,
	}
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

func isProtectedBranch(branchName string, protectedBranches []string) bool {
	for _, pattern := range protectedBranches {
		if matched, _ := path.Match(pattern, branchName); matched {
			return true
		}
	}
	return false
}

func isAlreadyTagged(commitMessage string) bool {
	// Check if commit message already contains issue tag like [#123] or [org/repo#123]
	// This pattern matches:
	// - [#123] (simple issue number)
	// - [Some-Org/Some_Repo#123] (complex repo with special chars)
	pattern := regexp.MustCompile(`^\[.*?#\d+\]`)
	trimmedMessage := strings.TrimSpace(commitMessage)
	return pattern.MatchString(trimmedMessage)
}
