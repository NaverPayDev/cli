package main

import "testing"

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

func strPtr(s string) *string { return &s }

func TestGenerateTemplateData_HyphenatedPrefix(t *testing.T) {
	config := Config{
		Rules: map[string]*string{
			"fe-plan": strPtr("card-fe/plan"),
			"feature": nil,
		},
	}

	tests := []struct {
		name       string
		branch     string
		wantNil    bool
		wantPrefix string
	}{
		{"hyphenated prefix", "fe-plan/11", false, "card-fe/plan#11"},
		{"simple prefix", "feature/42", false, "#42"},
		{"no match", "main", true, ""},
		{"unknown prefix", "unknown/99", true, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data := generateTemplateData(tt.branch, config, "Test")
			if tt.wantNil {
				if data != nil {
					t.Errorf("expected nil, got %+v", data)
				}
				return
			}
			if data == nil {
				t.Fatal("expected non-nil TemplateData, got nil")
			}
			if data.Prefix != tt.wantPrefix {
				t.Errorf("Prefix = %q, want %q", data.Prefix, tt.wantPrefix)
			}
		})
	}
}

func TestGeneratePrefix_HyphenatedPrefix(t *testing.T) {
	config := Config{
		Rules: map[string]*string{
			"fe-plan": strPtr("card-fe/plan"),
			"feature": nil,
		},
	}

	tests := []struct {
		name   string
		branch string
		want   string
	}{
		{"hyphenated prefix", "fe-plan/11", "card-fe/plan#11"},
		{"simple prefix", "feature/42", "#42"},
		{"no match", "main", ""},
		{"unknown prefix", "unknown/99", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := generatePrefix(tt.branch, config)
			if got != tt.want {
				t.Errorf("got %q, want %q", got, tt.want)
			}
		})
	}
}
