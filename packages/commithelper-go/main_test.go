package main

import (
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

func TestResolveKey(t *testing.T) {
	tests := []struct {
		name        string
		passthrough []string
		branch      string
		wantNil     bool
		wantPrefix  string
	}{
		{"listed key", []string{"PROJ"}, "feature/PROJ-1871", false, "PROJ-1871"},
		{"bare key no prefix", []string{"PROJ"}, "PROJ-1871", false, "PROJ-1871"},
		{"description suffix", []string{"PROJ"}, "feature/PROJ-1871-add-login", false, "PROJ-1871"},
		{"date suffix recognized (Jigit rule)", []string{"PROJ"}, "feature/PROJ-1871-20260101", false, "PROJ-1871"},
		{"underscore recognized (Jigit rule)", []string{"PROJ"}, "feature/PROJ-1871_wip", false, "PROJ-1871"},
		{"unlisted project", []string{"PROJ"}, "feature/OPS-42", true, ""},
		{"eight-digit number rejected", []string{"PROJ"}, "feature/PROJ-12345678", true, ""},
		{"project not matched inside a longer key", []string{"PROJ"}, "XPROJ-123", true, ""},
		{"junk skipped, listed key chosen", []string{"PROJ"}, "chore/UTF-8-PROJ-123", false, "PROJ-123"},
		{"lowercase list entry does not match", []string{"proj"}, "feature/PROJ-1", true, ""},
		{"off when empty", nil, "feature/PROJ-1871", true, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			td := resolveKey(tt.branch, tt.passthrough)
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

func TestResolveKey_JigitParity(t *testing.T) {
	allowed := []string{"ABC"}
	tests := []struct {
		branch string
		want   string
	}{
		{"ABC-123", "ABC-123"},
		{"feature/ABC-123", "ABC-123"},
		{"feature_ABC-123", "ABC-123"},
		{"feature/ABC-123-modal", "ABC-123"},
		{"ABC-123_modal", "ABC-123"},
		{"[ABC-123] feature", "ABC-123"},
		{"release/test/ABC-123/fix", "ABC-123"},
		{"ABC-123-4", "ABC-123"},
		{"ABC-12345678", ""},
		{"abc-123", ""},
		{"Abc-123", ""},
		{"ABC_123", ""},
		{"ABC123", ""},
		{"ABC-abc", ""},
	}

	for _, tt := range tests {
		t.Run(tt.branch, func(t *testing.T) {
			t.Parallel()
			td := resolveKey(tt.branch, allowed)
			got := ""
			if td != nil {
				got = td.Prefix
			}
			if got != tt.want {
				t.Errorf("resolveKey(%q) = %q, want %q", tt.branch, got, tt.want)
			}
		})
	}
}

func TestResolve_Priority(t *testing.T) {
	config := Config{
		Rules:       map[string]*string{"feature": nil},
		Passthrough: []string{"ABC"},
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
		{"ref before a letter is not a match", "see AB-1abc here", "AB-1", false},
		{"ref inside a longer hyphenated key is not a match", "[MY-PROJ-1871] earlier", "PROJ-1871", false},
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
		Passthrough: []string{"PROJ"},
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
		{"embedded key not treated as tagged", "[MY-PROJ-1871] earlier", "feature/PROJ-1871", verbatim, "[PROJ-1871] [MY-PROJ-1871] earlier", false},
		{"key before a letter not treated as tagged", "work on PROJ-1abc", "feature/PROJ-1", verbatim, "[PROJ-1] work on PROJ-1abc", false},
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
