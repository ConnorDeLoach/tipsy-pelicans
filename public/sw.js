/* Tipsy Service Worker v1 */

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

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      tag,
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
          } catch (e) {}
        })()
      );
      return;
    }
  }
  const url = (data && data.url) || "/";
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ("focus" in client) {
          const clientUrl = (client.url || "").split("#")[0];
          const targetUrl = new URL(url, self.location.origin).toString();
          if (clientUrl === targetUrl) {
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
