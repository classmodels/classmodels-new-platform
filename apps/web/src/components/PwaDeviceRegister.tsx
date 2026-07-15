'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { apiFetch } from '@/lib/api';

const DEVICE_ID_KEY = 'cm-device-id';
const SESSION_REG_KEY = 'cm-pwa-reg-session';

function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return `dev-${Date.now()}`;
  }
}

function getDisplayMode(): string {
  if (typeof window === 'undefined') return 'browser';
  if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone';
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui';
  if (window.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen';
  return 'browser';
}

function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

function detectPlatform(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

/** Registreert PWA-installatie / standalone-open bij de server (ingelogde modellen). */
export function PwaDeviceRegister() {
  const { token, can } = useAuth();

  useEffect(() => {
    if (!token || !can('portal.model.push.read')) return;

    const register = (source: 'standalone' | 'install') => {
      void apiFetch('/portal/model/pwa/register', {
        token,
        method: 'POST',
        body: JSON.stringify({
          deviceId: getOrCreateDeviceId(),
          displayMode: getDisplayMode(),
          platform: detectPlatform(),
          source,
        }),
      }).catch(() => undefined);
    };

    const onInstalled = () => register('install');

    if (isStandaloneApp()) {
      try {
        if (!sessionStorage.getItem(SESSION_REG_KEY)) {
          sessionStorage.setItem(SESSION_REG_KEY, '1');
          register('standalone');
        }
      } catch {
        register('standalone');
      }
    }

    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, [token, can]);

  return null;
}
