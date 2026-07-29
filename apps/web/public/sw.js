/* Class-Models Web Push — scope: hele site */
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (_) {
      data = { body: event.data.text() };
    }
  }
  const title = data.title || 'Class-Models';
  const relativeUrl = typeof data.url === 'string' && data.url.length ? data.url : '/modellen?tab=push';
  const openUrl = self.location.origin + (relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`);
  const opts = {
    body: data.body || '',
    data: { url: openUrl },
    tag: data.tag || 'cm-push',
    renotify: true,
  };
  event.waitUntil(
    (async () => {
      // Voorvertoning: systeemnotificatie met titel + tekst van het pushbericht.
      await self.registration.showNotification(title, opts);
      // Teller op het app-icoon (Badging API): aantal ongelezen berichten,
      // of minstens "1" wanneer de server geen aantal meestuurt.
      const badge = typeof data.badgeUnread === 'number' ? data.badgeUnread : 1;
      const setBadge =
        (self.navigator && self.navigator.setAppBadge && self.navigator.setAppBadge.bind(self.navigator)) ||
        (self.registration.setAppBadge && self.registration.setAppBadge.bind(self.registration));
      const clearBadge =
        (self.navigator && self.navigator.clearAppBadge && self.navigator.clearAppBadge.bind(self.navigator)) ||
        (self.registration.clearAppBadge && self.registration.clearAppBadge.bind(self.registration));
      try {
        if (badge > 0 && setBadge) await setBadge(badge);
        else if (badge <= 0 && clearBadge) await clearBadge();
      } catch (_) {}
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url =
    event.notification.data && typeof event.notification.data.url === 'string'
      ? event.notification.data.url
      : self.location.origin + '/modellen?tab=push';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const c of clientList) {
        if (c.url && c.url.startsWith(self.location.origin) && 'focus' in c) {
          void c.navigate(url).catch(() => undefined);
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
