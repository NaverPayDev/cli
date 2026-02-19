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
