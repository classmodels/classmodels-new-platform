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
  const relativeUrl = typeof data.url === 'string' && data.url.length ? data.url : '/portal/model?tab=push';
  const openUrl = self.location.origin + (relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`);
  const opts = {
    body: data.body || '',
    data: { url: openUrl },
    tag: data.tag || 'cm-push',
    renotify: true,
  };
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, opts);
      if (self.registration.setAppBadge && typeof data.badgeUnread === 'number') {
        try {
          if (data.badgeUnread > 0) await self.registration.setAppBadge(data.badgeUnread);
          else await self.registration.clearAppBadge();
        } catch (_) {}
      }
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url =
    event.notification.data && typeof event.notification.data.url === 'string'
      ? event.notification.data.url
      : self.location.origin + '/portal/model?tab=push';
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
