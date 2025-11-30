"use client";

import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";

/** ——— Utils ——— */
function normalizeBase64Url(s: string) {
  return s
    .trim()
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "");
}
function urlBase64ToUint8Array(base64String: string) {
  const normalized = normalizeBase64Url(base64String);
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const base64 = (normalized + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) arr[i] = rawData.charCodeAt(i);
  return arr;
}
function eqUint8(a?: ArrayBuffer | Uint8Array | null, b?: Uint8Array | null) {
  if (!a || !b) return false;
  const aa = a instanceof Uint8Array ? a : new Uint8Array(a);
  if (aa.length !== b.length) return false;
  for (let i = 0; i < aa.length; i++) if (aa[i] !== b[i]) return false;
  return true;
}
function detectPlatform(): "ios" | "android" | "desktop" | "unknown" {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/mac|win|linux/.test(ua)) return "desktop";
  return "unknown";
}

/** Bump this when you edit public/sw.js (and set Cache-Control: no-store for /sw.js). */
const SW_URL = "/sw.js?v=4";

type EnablePushResult =
  | { ok: true; reused?: boolean }
  | {
      ok: false;
      reason:
        | "unsupported"
        | "missing_public_key"
        | "bad_public_key"
        | "denied"
        | "exception";
      error?: string;
    };

export function useEnablePush() {
  const upsert = useMutation(api.push.upsertSubscription);
  const remove = useMutation(api.push.removeSubscription);

  const enablePush = async (): Promise<EnablePushResult> => {
    try {
      // Capability / secure context
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return { ok: false, reason: "unsupported" };
      }

      // VAPID public key (must be 65 bytes, uncompressed P-256 starting with 0x04)
      const raw = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
      if (!raw) return { ok: false, reason: "missing_public_key" };
      const keyBytes = urlBase64ToUint8Array(raw);
      if (keyBytes.length !== 65 || keyBytes[0] !== 4) {
        return { ok: false, reason: "bad_public_key" };
      }

      // Register service worker
      const reg = await navigator.serviceWorker.register(SW_URL);
      await navigator.serviceWorker.ready;

      // Reuse existing subscription if it matches our key, otherwise clean it up
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        // @ts-ignore (browser-specific)
        const existingKey: ArrayBuffer | undefined =
          existing.options?.applicationServerKey;
        if (eqUint8(existingKey ?? null, keyBytes)) {
          const { endpoint, keys } = existing.toJSON() as {
            endpoint: string;
            expirationTime: number | null;
            keys: { p256dh: string; auth: string };
          };
          await upsert({
            subscription: { endpoint, keys },
            ua: navigator.userAgent,
            platform: detectPlatform(),
            authVersion: "v1",
          });
          return { ok: true, reused: true };
        }
        await existing.unsubscribe();
      }

      // Request permission (must be triggered by a user gesture)
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return { ok: false, reason: "denied" };

      // Create a fresh subscription
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes,
      });

      // Only send fields your Convex validator accepts
      const { endpoint, keys } = subscription.toJSON() as {
        endpoint: string;
        expirationTime: number | null;
        keys: { p256dh: string; auth: string };
      };

      await upsert({
        subscription: { endpoint, keys },
        ua: navigator.userAgent,
        platform: detectPlatform(),
        authVersion: "v1",
      });

      return { ok: true };
    } catch (err) {
      const msg =
        err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      return { ok: false, reason: "exception", error: msg };
    }
  };

  const disablePush = async (): Promise<
    { ok: true; cleared: boolean } | { ok: false; reason: "unsupported" }
  > => {
    if (!("serviceWorker" in navigator))
      return { ok: false, reason: "unsupported" };
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return { ok: true, cleared: false };
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      // Also remove from Convex
      await remove({ endpoint });
      return { ok: true, cleared: true };
    }
    return { ok: true, cleared: false };
  };

  return { enablePush, disablePush };
}
