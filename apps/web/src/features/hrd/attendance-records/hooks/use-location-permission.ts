"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type PermissionState = "granted" | "denied" | "prompt" | "unknown";

interface UseLocationPermissionReturn {
  /** Current browser geolocation permission state */
  readonly permissionState: PermissionState;
  readonly isGranted: boolean;
  readonly isDenied: boolean;
  readonly isPrompt: boolean;
  /**
   * Trigger the browser permission prompt by calling getCurrentPosition.
   * Must be called synchronously from a user-gesture (click) handler.
   * When inside a Radix DropdownMenuItem, use `onSelect={e => e.preventDefault()}`
   * to keep the menu open so the browser popup can appear.
   */
  readonly requestPermission: () => void;
  /**
   * Try the native browser permission popup first. If the browser rejects
   * the request (PERMISSION_DENIED), invoke the `onDenied` callback so the
   * caller can show a fallback UI (e.g. instructions dialog).
   */
  readonly requestPermissionOrFallback: (onDenied: () => void) => void;
}

/**
 * Reactively watches the browser Geolocation permission state via
 * the Permissions API and exposes helpers to trigger the permission prompt.
 *
 * WHY: We need to know the permission state *before* the user clicks
 * clock-in so we can show alerts / disable buttons proactively.
 */
export function useLocationPermission(): UseLocationPermissionReturn {
  const [permissionState, setPermissionState] = useState<PermissionState>("unknown");
  const statusRef = useRef<PermissionStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    // -----------------------------------------------------------
    // WHY getCurrentPosition is the ground truth:
    // navigator.permissions.query() returns a CACHED state that
    // does NOT update when the user toggles location via Chrome's
    // padlock / site-info menu. Only a page reload refreshes it.
    // In contrast, getCurrentPosition() always checks the REAL,
    // live permission state — if the user just allowed it via the
    // padlock, getCurrentPosition succeeds immediately.
    // -----------------------------------------------------------
    function probeRealPermission() {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        () => {
          if (!cancelled) setPermissionState("granted");
        },
        (err) => {
          if (cancelled) return;
          if (err.code === err.PERMISSION_DENIED) {
            setPermissionState("denied");
          }
          // POSITION_UNAVAILABLE / TIMEOUT → permission is granted
          // but GPS hardware failed — still treat as "granted"
          // so the UI doesn't block the user.
          else {
            setPermissionState("granted");
          }
        },
        { timeout: 5000, maximumAge: Infinity }
      );
    }

    // Fast initial check via Permissions API (if available),
    // then verify with the real probe.
    async function initialCheck() {
      if (navigator.permissions) {
        try {
          const status = await navigator.permissions.query({ name: "geolocation" });
          if (cancelled) return;
          statusRef.current = status;
          setPermissionState(status.state as PermissionState);

          // Listen for the change event (works in some flows)
          const handleChange = () => {
            if (!cancelled) {
              setPermissionState(status.state as PermissionState);
            }
          };
          status.addEventListener("change", handleChange);
        } catch {
          // Permissions API unavailable — fall through to probe
        }
      }

      // Always verify with the real probe after the fast check
      probeRealPermission();
    }

    initialCheck();

    // WHY: When the user changes location permission via the padlock /
    // site-info menu, the Permissions API's cached state does NOT update.
    // Re-probing with getCurrentPosition() on visibility/focus catches
    // the change reliably — the user toggles the setting, clicks back
    // into the page, and we test the REAL permission.
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible" || document.hasFocus()) {
        probeRealPermission();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, []);

  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) return;

    // WHY: getCurrentPosition MUST be called synchronously within the
    // user-gesture (click) call stack. If deferred with setTimeout the
    // browser no longer considers it user-initiated and will silently
    // block the permission popup. Callers that live inside a Radix
    // DropdownMenuItem must use `onSelect={(e) => e.preventDefault()}`
    // to prevent the menu from closing and unmounting before the popup
    // appears.
    navigator.geolocation.getCurrentPosition(
      () => {
        setPermissionState("granted");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionState("denied");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // WHY: Tries the native browser popup. When the browser has already
  // remembered a "deny" decision it will NOT show the popup — it
  // silently fires the error callback with PERMISSION_DENIED. In that
  // case we invoke `onDenied` so the caller can open a fallback UI
  // (e.g. the LocationSettingsDialog with manual instructions).
  const requestPermissionOrFallback = useCallback((onDenied: () => void) => {
    if (!navigator.geolocation) {
      onDenied();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        setPermissionState("granted");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionState("denied");
          onDenied();
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return {
    permissionState,
    isGranted: permissionState === "granted",
    isDenied: permissionState === "denied",
    isPrompt: permissionState === "prompt",
    requestPermission,
    requestPermissionOrFallback,
  };
}
