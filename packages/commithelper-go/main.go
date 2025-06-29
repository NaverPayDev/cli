package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"regexp"
	"strings"
)

type Config struct {
	Rules map[string]*string `json:"rules"`
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

	branchName := getCurrentBranchName()
	config := loadConfig()

	prefix := generatePrefix(branchName, config)
	if prefix != "" {
		commitMessage = fmt.Sprintf("[%s] %s", prefix, commitMessage)
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
			return Config{Rules: map[string]*string{}}
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
