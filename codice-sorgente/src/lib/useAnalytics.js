// lib/useAnalytics.js
// Client-side analytics tracking hook.
// Sends one track event per page per browser session to avoid excessive GitHub commits.
// Uses sessionStorage to deduplicate within the same tab session.

import { useEffect, useCallback } from "react";

const STORAGE_KEY = "aei-tracked";
const ENDPOINT = "/api/track";

function getTracked() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function markTracked(key) {
  try {
    const tracked = getTracked();
    tracked[key] = Date.now();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tracked));
  } catch {
    // sessionStorage not available
  }
}

function isAlreadyTracked(key) {
  return !!getTracked()[key];
}

function sendTrack(payload) {
  try {
    // Use fetch with keepalive for reliability
    // (sendBeacon doesn't allow setting Content-Type to application/json easily)
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Silently fail - analytics should never break the site
  }
}

/**
 * Track a page view. Call once per page mount.
 * @param {string} page - "art", "pro", "landing"
 * @param {string} [project] - e.g. "art/totem"
 */
export function useTrackPageView(page, project) {
  useEffect(() => {
    if (!page) return;
    const key = project ? `${page}:${project}` : `page:${page}`;
    if (isAlreadyTracked(key)) return;

    markTracked(key);
    sendTrack({ page, project: project || undefined });
  }, [page, project]);
}

/**
 * Returns a function to track photo views (on-demand, e.g. when viewer opens).
 * Deduplicates per session.
 */
export function useTrackPhoto() {
  return useCallback((photo, page) => {
    if (!photo) return;
    const key = `photo:${photo}`;
    if (isAlreadyTracked(key)) return;

    markTracked(key);
    sendTrack({ page: page || undefined, photo });
  }, []);
}

/**
 * Track a contact form submission (call from the contact form handler).
 */
export function trackContact() {
  sendTrack({ type: "contact" });
}
