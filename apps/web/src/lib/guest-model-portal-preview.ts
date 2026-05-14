import type { AuthUser } from '@/context/auth-context';

/**
 * Alleen actief als `NEXT_PUBLIC_GUEST_MODEL_PORTAL_PREVIEW=1` in de web-build staat.
 * Laat `/portal/model` open zonder login zodat layout en publieke onderdelen (o.a. tab
 * Modellen / catalogus) getest kunnen worden. Zet dit uit op productie zodra klaar.
 */
export function isGuestModelPortalPreviewEnabled(): boolean {
  return process.env.NEXT_PUBLIC_GUEST_MODEL_PORTAL_PREVIEW === '1';
}

/** Placeholder-user voor UI; geen echte JWT — API-calls die een token vereisen blijven leeg. */
export const GUEST_MODEL_PORTAL_PREVIEW_USER: AuthUser = {
  id: '__guest_preview__',
  email: 'voorbeeld@class-models.local',
  firstName: 'Bezoeker',
  lastName: null,
  phone: null,
  roles: ['model'],
  permissions: [],
  isPremium: false,
  premiumUntil: null,
  push: {
    unreadCount: 0,
    notifyHistoryEvents: false,
    notifyAgencyBroadcasts: false,
    webPushConfigured: false,
    vapidPublicKey: null,
  },
};
