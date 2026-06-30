package main

import (
	"encoding/json"
	"testing"
)

func strPtr(s string) *string { return &s }

func TestIsProtectedBranch(t *testing.T) {
	protected := []string{"main", "release/*", "epic/*"}

	tests := []struct {
		branch string
		want   bool
	}{
		{"main", true},
		{"develop", false},
		{"release/1.0", true},
		{"release/v2", true},
		{"feature/123", false},
		{"epic/815_fix", true},
	}

	for _, tt := range tests {
		t.Run(tt.branch, func(t *testing.T) {
			t.Parallel()
			got, err := isProtectedBranch(tt.branch, protected)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Errorf("got %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIsProtectedBranch_InvalidPattern(t *testing.T) {
	_, err := isProtectedBranch("main", []string{"["})
	if err == nil {
		t.Error("expected error for invalid pattern, got nil")
	}
}

func TestResolvePrefix(t *testing.T) {
	config := Config{
		Rules: map[string]*string{
			"my-team": strPtr("my-org/my-repo"),
			"feature": nil,
		},
	}

	tests := []struct {
		name       string
		branch     string
		wantNil    bool
		wantPrefix string
	}{
		{"hyphenated prefix", "my-team/11", false, "my-org/my-repo#11"},
		{"simple prefix", "feature/42", false, "#42"},
		{"no match", "main", true, ""},
		{"unknown prefix", "unknown/99", true, ""},
		{"letter after slash is not prefix-shaped", "feature/PROJ-1", true, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			td := resolvePrefix(tt.branch, config)
			if tt.wantNil {
				if td != nil {
					t.Errorf("expected nil, got %+v", td)
				}
				return
			}
			if td == nil {
				t.Fatal("expected non-nil TemplateData, got nil")
			}
			if td.Prefix != tt.wantPrefix {
				t.Errorf("Prefix = %q, want %q", td.Prefix, tt.wantPrefix)
			}
		})
	}
}

func TestResolveVerbatim(t *testing.T) {
	tests := []struct {
		name       string
		pt         Passthrough
		branch     string
		wantNil    bool
		wantPrefix string
	}{
		{"listed key", Passthrough{Keys: []string{"PROJ"}}, "feature/PROJ-1871", false, "PROJ-1871"},
		{"bare key no prefix", Passthrough{Keys: []string{"PROJ"}}, "PROJ-1871", false, "PROJ-1871"},
		{"key with description suffix", Passthrough{Keys: []string{"PROJ"}}, "feature/PROJ-1871-add-login", false, "PROJ-1871"},
		{"unlisted project", Passthrough{Keys: []string{"PROJ"}}, "feature/OPS-42", true, ""},
		{"underscore suffix rejected (strict)", Passthrough{Keys: []string{"PROJ"}}, "feature/PROJ-1871_wip", true, ""},
		{"trailing -digit rejected (strict)", Passthrough{Keys: []string{"PROJ"}}, "feature/PROJ-1871-2024", true, ""},
		{"later valid key found after rejected one", Passthrough{All: true}, "feature/AB-12-34-CD-5", false, "CD-5"},
		{"all matches any shape", Passthrough{All: true}, "feature/OPS-42", false, "OPS-42"},
		{"all accepts non-tracker token (false positive)", Passthrough{All: true}, "chore/UTF-8-fix", false, "UTF-8"},
		{"invalid lowercase key filtered out", Passthrough{Keys: []string{"abc"}}, "feature/abc-1", true, ""},
		{"off when empty", Passthrough{}, "feature/PROJ-1871", true, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			td := resolveVerbatim(tt.branch, tt.pt)
			if tt.wantNil {
				if td != nil {
					t.Errorf("expected nil, got %+v", td)
				}
				return
			}
			if td == nil {
				t.Fatal("expected non-nil TemplateData, got nil")
			}
			if td.Prefix != tt.wantPrefix {
				t.Errorf("Prefix = %q, want %q", td.Prefix, tt.wantPrefix)
			}
		})
	}
}

func TestResolve_Priority(t *testing.T) {
	config := Config{
		Rules:       map[string]*string{"feature": nil},
		Passthrough: Passthrough{Keys: []string{"ABC"}},
	}

	tests := []struct {
		name       string
		branch     string
		wantNil    bool
		wantPrefix string
	}{
		{"github prefix", "feature/123", false, "#123"},
		{"verbatim key", "feature/ABC-99", false, "ABC-99"},
		{"double match prefers prefix", "feature/12-ABC-34", false, "#12"},
		{"neither", "wip", true, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			td := resolve(tt.branch, config)
			if tt.wantNil {
				if td != nil {
					t.Errorf("expected nil, got %+v", td)
				}
				return
			}
			if td == nil {
				t.Fatal("expected non-nil TemplateData, got nil")
			}
			if td.Prefix != tt.wantPrefix {
				t.Errorf("Prefix = %q, want %q", td.Prefix, tt.wantPrefix)
			}
		})
	}
}

func TestAlreadyHasRef(t *testing.T) {
	tests := []struct {
		name    string
		message string
		ref     string
		want    bool
	}{
		{"default front tag", "[#123] fix", "#123", true},
		{"longer number is not a match", "[#1234] fix", "#123", false},
		{"ref at bottom (template)", "fix\n\nRef. [#123]", "#123", true},
		{"verbatim key present", "[PROJ-1871] fix", "PROJ-1871", true},
		{"cross-repo ref present", "[org/repo#123] fix", "org/repo#123", true},
		{"absent", "fix login", "#123", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := alreadyHasRef(tt.message, tt.ref); got != tt.want {
				t.Errorf("alreadyHasRef(%q, %q) = %v, want %v", tt.message, tt.ref, got, tt.want)
			}
		})
	}
}

func TestProcessMessage(t *testing.T) {
	github := Config{
		Rules:   map[string]*string{"feature": nil},
		Protect: []string{"main"},
	}
	verbatim := Config{
		Passthrough: Passthrough{Keys: []string{"PROJ"}},
		Protect:     []string{"main"},
	}
	bottomRef := Config{
		Rules:    map[string]*string{"feature": nil},
		Protect:  []string{"main"},
		Template: strPtr("{{.Message}}\n\nRef. [{{.Prefix}}]"),
	}

	tests := []struct {
		name      string
		message   string
		branch    string
		config    Config
		want      string
		wantError bool
	}{
		{"protected branch blocks", "fix", "main", github, "", true},
		{"protected blocks even when already tagged", "[#1] fix", "main", github, "", true},
		{"github tagging", "fix", "feature/123", github, "[#123] fix", false},
		{"idempotent on re-run", "[#123] fix", "feature/123", github, "[#123] fix", false},
		{"unmatched branch passes through", "fix", "wip", github, "fix", false},
		{"verbatim tagging", "fix", "feature/PROJ-1871", verbatim, "[PROJ-1871] fix", false},
		{"custom template tags in body", "fix", "feature/123", bottomRef, "fix\n\nRef. [#123]", false},
		{"custom template idempotent on amend (D1)", "fix\n\nRef. [#123]", "feature/123", bottomRef, "fix\n\nRef. [#123]", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := processMessage(tt.message, tt.branch, tt.config)
			if tt.wantError {
				if err == nil {
					t.Fatalf("expected error, got nil (result %q)", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Errorf("processMessage(%q, %q) = %q, want %q", tt.message, tt.branch, got, tt.want)
			}
		})
	}
}

func TestPassthrough_UnmarshalJSON(t *testing.T) {
	tests := []struct {
		name     string
		json     string
		wantAll  bool
		wantKeys []string
		wantErr  bool
	}{
		{"uppercase means all", `{"passthrough":"uppercase"}`, true, nil, false},
		{"array of keys", `{"passthrough":["PROJ","OPS"]}`, false, []string{"PROJ", "OPS"}, false},
		{"absent means off", `{}`, false, nil, false},
		{"null means off", `{"passthrough":null}`, false, nil, false},
		{"other string is error", `{"passthrough":"all"}`, false, nil, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			var c Config
			err := json.Unmarshal([]byte(tt.json), &c)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if c.Passthrough.All != tt.wantAll {
				t.Errorf("All = %v, want %v", c.Passthrough.All, tt.wantAll)
			}
			if len(c.Passthrough.Keys) != len(tt.wantKeys) {
				t.Fatalf("Keys = %v, want %v", c.Passthrough.Keys, tt.wantKeys)
			}
			for i := range tt.wantKeys {
				if c.Passthrough.Keys[i] != tt.wantKeys[i] {
					t.Errorf("Keys[%d] = %q, want %q", i, c.Passthrough.Keys[i], tt.wantKeys[i])
				}
			}
		})
	}
}
