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
		got := isProtectedBranch(tt.branch, protected)
		if got != tt.want {
			t.Errorf("isProtectedBranch(%q) = %v, want %v", tt.branch, got, tt.want)
		}
	}
}
