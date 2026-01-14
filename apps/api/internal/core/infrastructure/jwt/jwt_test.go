package jwt

import (
	"encoding/base64"
	"testing"
)

func TestParseKeyRing(t *testing.T) {
	got := ParseKeyRing(" kid1:secret1, kid2:secret2 ")
	if got["kid1"] != "secret1" {
		t.Fatalf("expected kid1=secret1, got %q", got["kid1"])
	}
	if got["kid2"] != "secret2" {
		t.Fatalf("expected kid2=secret2, got %q", got["kid2"])
	}

	got = ParseKeyRing(" , bad, :nope, kid3:, : , kid4:secret4 ")
	if _, ok := got["kid3"]; ok {
		t.Fatalf("expected kid3 to be ignored")
	}
	if got["kid4"] != "secret4" {
		t.Fatalf("expected kid4=secret4, got %q", got["kid4"])
	}

	got = ParseKeyRing("")
	if len(got) != 0 {
		t.Fatalf("expected empty map, got len=%d", len(got))
	}
}

func TestTokenKIDFromString(t *testing.T) {
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","kid":"k1"}`))
	payload := base64.RawURLEncoding.EncodeToString([]byte(`{}`))
	tok := header + "." + payload + ".sig"

	if got := tokenKIDFromString(tok); got != "k1" {
		t.Fatalf("expected kid k1, got %q", got)
	}

	if got := tokenKIDFromString("not-a-jwt"); got != "" {
		t.Fatalf("expected empty kid for invalid token, got %q", got)
	}

	badHeader := "###" + "." + payload + ".sig"
	if got := tokenKIDFromString(badHeader); got != "" {
		t.Fatalf("expected empty kid for bad header encoding, got %q", got)
	}
}
