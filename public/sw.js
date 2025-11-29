/* Tipsy Service Worker v2 */

const SW_VERSION = "2.0.0";

self.addEventListener("install", (event) => {
  // Skip waiting only after careful testing; keeping default for safety
  // self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // self.clients.claim(); // Consider enabling after QA
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    // Fallback to text if not JSON
    data = {
      title: "Notification",
      body: event.data && event.data.text ? event.data.text() : "",
    };
  }

  const title = data.title || "Tipsy";
  const body = data.body || "";
  const icon = data.icon || "/pwa/manifest-icon-192.maskable.png";
  const tag = data.tag;
  const actions = Array.isArray(data.actions) ? data.actions : undefined;
  const payload = data.data || {};

  const badge = data.badge || "/pwa/manifest-icon-192.maskable.png";
  const requireInteraction = data.requireInteraction === true;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      renotify: !!tag, // Alert user even when replacing existing notification with same tag
      requireInteraction,
      data: payload,
      actions,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = (event.notification && event.notification.data) || {};
  const action = event.action;
  if (action === "rsvp-in" || action === "rsvp-out") {
    const targetUrl =
      action === "rsvp-in" ? data?.rsvp?.inUrl : data?.rsvp?.outUrl;
    if (targetUrl) {
      event.waitUntil(
        (async () => {
          try {
            await fetch(targetUrl, { method: "GET", mode: "no-cors" });
          } catch (e) {
            console.error("[SW] RSVP action failed:", e);
          }
        })()
      );
      return;
    }
  }

  // Handle chat notification click - navigate to chat
  if (action === "open-chat" || data?.type === "chat") {
    const chatUrl = data?.url || "/chat";
    event.waitUntil(
      (async () => {
        const allClients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        // Try to focus an existing chat window
        for (const client of allClients) {
          const clientUrl = new URL(client.url);
          if (clientUrl.pathname === "/chat" && "focus" in client) {
            return client.focus();
          }
        }
        // Open new window if none found
        if (self.clients.openWindow) {
          return self.clients.openWindow(chatUrl);
        }
      })()
    );
    return;
  }
  const url = (data && data.url) || "/";
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Normalize URLs for comparison
      const targetUrl = new URL(url, self.location.origin);
      for (const client of allClients) {
        if ("focus" in client) {
          const clientUrl = new URL(client.url);
          // Compare pathname only to handle query strings/fragments gracefully
          if (clientUrl.pathname === targetUrl.pathname) {
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })()
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  // Can't re-subscribe without the applicationServerKey; notify pages to re-enable push
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        client.postMessage({ type: "PUSH_SUBSCRIPTION_CHANGED" });
      }
    })()
  );
});
