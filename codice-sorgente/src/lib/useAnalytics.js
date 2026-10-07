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

function detectDevice() {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobi|android|iphone|ipod|opera mini|iemobile|wpdesktop/i.test(ua)) return "mobile";
  return "desktop";
}

const ENTRY_KEY = "aei-entry";
const NOTRACK_KEY = "aei-notrack";
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|slack|curl|wget|python|axios|node-fetch|go-http|java\/|phantom|puppeteer|playwright|selenium/i;

/** Mostra per qualche secondo un avviso in basso (solo dopo ?notrack=…). */
function notice(text) {
  try {
    const el = document.createElement("div");
    el.textContent = text;
    el.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;background:#0a0a0a;color:#f8f4ed;font:500 13px/1.4 system-ui,sans-serif;padding:10px 16px;max-width:90vw;text-align:center";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  } catch {}
}

/**
 * false se questa visita non va contata:
 * - il proprietario ha escluso questo dispositivo con ?notrack=1 (si annulla con ?notrack=0)
 * - browser automatizzati e programmi che si dichiarano tali
 */
function trackingAllowed() {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.has("notrack")) {
      const off = q.get("notrack") !== "0";
      if (off) localStorage.setItem(NOTRACK_KEY, "1");
      else localStorage.removeItem(NOTRACK_KEY);
      q.delete("notrack");
      const qs = q.toString();
      window.history.replaceState(window.history.state, "", window.location.pathname + (qs ? "?" + qs : "") + window.location.hash);
      notice(off
        ? "Le tue visite da questo dispositivo non vengono più contate nelle statistiche."
        : "Le tue visite da questo dispositivo vengono di nuovo contate.");
    }
    if (localStorage.getItem(NOTRACK_KEY) === "1") return false;
  } catch {}
  if (navigator.webdriver) return false;
  if (BOT_UA.test(navigator.userAgent || "")) return false;
  return true;
}

/** true solo per il primo evento della sessione (ingresso nel sito). */
function isEntry() {
  try {
    if (sessionStorage.getItem(ENTRY_KEY)) return false;
    sessionStorage.setItem(ENTRY_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

function sendTrack(payload, { canBeEntry = true } = {}) {
  if (!trackingAllowed()) return;
  // Si conta solo chi resta almeno un secondo con la pagina visibile:
  // i programmi che caricano e chiudono subito restano fuori.
  setTimeout(() => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    sendNow(payload, canBeEntry);
  }, 1200);
}

function sendNow(payload, canBeEntry) {
  try {
    // Provenienza, dispositivo e luogo si contano una volta per sessione:
    // con la navigazione interna di Next document.referrer resta quello iniziale
    // e verrebbe contato a ogni pagina.
    const enriched = { ...payload };
    if (canBeEntry && isEntry()) {
      enriched.entry = true;
      if (typeof document !== "undefined" && document.referrer) {
        enriched.referrer = document.referrer;
      }
    }
    enriched.device = detectDevice();

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enriched),
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
  sendTrack({ type: "contact" }, { canBeEntry: false });
}
