package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
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
	numberTmpl := Config{
		Passthrough: []string{"PROJ"},
		Protect:     []string{"main"},
		Template:    strPtr("{{.Message}} (issue #{{.Number}})"),
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
		{"passthrough fills Number for custom template", "fix", "feature/PROJ-123", numberTmpl, "fix (issue #123)", false},
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

// ── extends: mergeConfigs ─────────────────────────────────────────────────────

func TestMergeConfigs_Rules(t *testing.T) {
	t.Run("local overrides base on same key", func(t *testing.T) {
		base := Config{Rules: map[string]*string{"feature": strPtr("base/repo")}}
		local := Config{Rules: map[string]*string{"feature": strPtr("local/repo")}}
		merged := mergeConfigs(base, local)
		if got := *merged.Rules["feature"]; got != "local/repo" {
			t.Errorf("got %q, want %q", got, "local/repo")
		}
	})

	t.Run("local null overrides base non-null", func(t *testing.T) {
		base := Config{Rules: map[string]*string{"feature": strPtr("base/repo")}}
		local := Config{Rules: map[string]*string{"feature": nil}}
		merged := mergeConfigs(base, local)
		if merged.Rules["feature"] != nil {
			t.Errorf("expected nil, got %q", *merged.Rules["feature"])
		}
	})

	t.Run("base rules preserved when not overridden", func(t *testing.T) {
		base := Config{Rules: map[string]*string{"plan": strPtr("org/plan"), "qa": strPtr("org/qa")}}
		local := Config{Rules: map[string]*string{"repo": nil}}
		merged := mergeConfigs(base, local)
		if _, ok := merged.Rules["plan"]; !ok {
			t.Error("expected plan rule from base")
		}
		if _, ok := merged.Rules["qa"]; !ok {
			t.Error("expected qa rule from base")
		}
		if _, ok := merged.Rules["repo"]; !ok {
			t.Error("expected repo rule from local")
		}
	})

	t.Run("nil local rules treated as empty", func(t *testing.T) {
		base := Config{Rules: map[string]*string{"plan": strPtr("org/plan")}}
		local := Config{}
		merged := mergeConfigs(base, local)
		if _, ok := merged.Rules["plan"]; !ok {
			t.Error("expected plan rule from base")
		}
	})
}

func TestMergeConfigs_Protect(t *testing.T) {
	t.Run("union of base and local", func(t *testing.T) {
		base := Config{Protect: []string{"main", "master"}}
		local := Config{Protect: []string{"release/*"}}
		merged := mergeConfigs(base, local)
		want := map[string]bool{"main": true, "master": true, "release/*": true}
		if len(merged.Protect) != 3 {
			t.Errorf("got %d protect entries, want 3: %v", len(merged.Protect), merged.Protect)
		}
		for _, p := range merged.Protect {
			if !want[p] {
				t.Errorf("unexpected protect entry %q", p)
			}
		}
	})

	t.Run("deduplicates overlapping entries", func(t *testing.T) {
		base := Config{Protect: []string{"main", "master"}}
		local := Config{Protect: []string{"main", "release/*"}}
		merged := mergeConfigs(base, local)
		count := 0
		for _, p := range merged.Protect {
			if p == "main" {
				count++
			}
		}
		if count != 1 {
			t.Errorf("main appears %d times, want 1", count)
		}
	})

	t.Run("base-only protect preserved", func(t *testing.T) {
		base := Config{Protect: []string{"main"}}
		local := Config{}
		merged := mergeConfigs(base, local)
		if len(merged.Protect) != 1 || merged.Protect[0] != "main" {
			t.Errorf("got %v, want [main]", merged.Protect)
		}
	})
}

func TestMergeConfigs_Passthrough(t *testing.T) {
	t.Run("union of base and local", func(t *testing.T) {
		base := Config{Passthrough: []string{"PROJ", "OPS"}}
		local := Config{Passthrough: []string{"FEAT"}}
		merged := mergeConfigs(base, local)
		want := map[string]bool{"PROJ": true, "OPS": true, "FEAT": true}
		if len(merged.Passthrough) != 3 {
			t.Errorf("got %d passthrough entries, want 3: %v", len(merged.Passthrough), merged.Passthrough)
		}
		for _, p := range merged.Passthrough {
			if !want[p] {
				t.Errorf("unexpected passthrough entry %q", p)
			}
		}
	})

	t.Run("deduplicates overlapping entries", func(t *testing.T) {
		base := Config{Passthrough: []string{"PROJ"}}
		local := Config{Passthrough: []string{"PROJ", "OPS"}}
		merged := mergeConfigs(base, local)
		count := 0
		for _, p := range merged.Passthrough {
			if p == "PROJ" {
				count++
			}
		}
		if count != 1 {
			t.Errorf("PROJ appears %d times, want 1", count)
		}
	})
}

func TestMergeConfigs_Template(t *testing.T) {
	t.Run("local template wins", func(t *testing.T) {
		base := Config{Template: strPtr("base: {{.Message}}")}
		local := Config{Template: strPtr("local: {{.Message}}")}
		merged := mergeConfigs(base, local)
		if *merged.Template != "local: {{.Message}}" {
			t.Errorf("got %q, want local template", *merged.Template)
		}
	})

	t.Run("base template used when local is nil", func(t *testing.T) {
		base := Config{Template: strPtr("base: {{.Message}}")}
		local := Config{}
		merged := mergeConfigs(base, local)
		if merged.Template == nil || *merged.Template != "base: {{.Message}}" {
			t.Errorf("expected base template, got %v", merged.Template)
		}
	})

	t.Run("both nil stays nil", func(t *testing.T) {
		merged := mergeConfigs(Config{}, Config{})
		if merged.Template != nil {
			t.Errorf("expected nil template, got %q", *merged.Template)
		}
	})
}

// ── extends: fetchExtendsConfig ───────────────────────────────────────────────

func TestFetchExtendsConfig(t *testing.T) {
	t.Run("valid remote config is fetched and parsed", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprint(w, `{
				"protect": ["main", "master"],
				"rules": {"plan": "org/plan", "qa": "org/qa"},
				"passthrough": ["PROJ"]
			}`)
		}))
		defer srv.Close()

		cfg, err := fetchExtendsConfig(srv.URL)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(cfg.Protect) != 2 {
			t.Errorf("protect: got %v, want [main master]", cfg.Protect)
		}
		if repo, ok := cfg.Rules["plan"]; !ok || *repo != "org/plan" {
			t.Errorf("rules[plan]: got %v", cfg.Rules["plan"])
		}
		if len(cfg.Passthrough) != 1 || cfg.Passthrough[0] != "PROJ" {
			t.Errorf("passthrough: got %v, want [PROJ]", cfg.Passthrough)
		}
	})

	t.Run("non-http URL is rejected", func(t *testing.T) {
		_, err := fetchExtendsConfig("file:///etc/passwd")
		if err == nil {
			t.Error("expected error for non-http URL, got nil")
		}
	})

	t.Run("HTTP error status is rejected", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNotFound)
		}))
		defer srv.Close()

		_, err := fetchExtendsConfig(srv.URL)
		if err == nil {
			t.Error("expected error for 404, got nil")
		}
	})

	t.Run("invalid JSON is rejected", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprint(w, `not json`)
		}))
		defer srv.Close()

		_, err := fetchExtendsConfig(srv.URL)
		if err == nil {
			t.Error("expected error for invalid JSON, got nil")
		}
	})

	t.Run("extends field in remote config is not followed (no recursion)", func(t *testing.T) {
		// Remote config has its own "extends" — it must be ignored.
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprint(w, `{"extends":"http://should-not-be-called","rules":{"plan":"org/plan"}}`)
		}))
		defer srv.Close()

		cfg, err := fetchExtendsConfig(srv.URL)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		// Just verify the config was parsed; the nested extends is not followed
		if _, ok := cfg.Rules["plan"]; !ok {
			t.Error("expected plan rule from remote")
		}
	})
}

// ── extends: end-to-end merge via processMessage ─────────────────────────────

func TestProcessMessage_WithExtends(t *testing.T) {
	// Simulate what loadConfig produces after merging a remote base config.
	// Base (remote): plan → org/plan, protect: main
	// Local: qa → org/qa, protect: release/*
	// Merged result should have all of them.
	merged := mergeConfigs(
		Config{
			Rules:   map[string]*string{"plan": strPtr("org/plan")},
			Protect: []string{"main"},
		},
		Config{
			Rules:   map[string]*string{"qa": strPtr("org/qa")},
			Protect: []string{"release/*"},
		},
	)

	tests := []struct {
		name      string
		message   string
		branch    string
		want      string
		wantError bool
	}{
		{"base rule still works", "fix", "plan/42", "[org/plan#42] fix", false},
		{"local rule works", "fix", "qa/99", "[org/qa#99] fix", false},
		{"base protect blocks", "fix", "main", "", true},
		{"local protect blocks", "fix", "release/1.0", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := processMessage(tt.message, tt.branch, merged)
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
				t.Errorf("got %q, want %q", got, tt.want)
			}
		})
	}
}
