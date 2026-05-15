'use client';

import { useMemo } from 'react';
import { useI18n } from './context';
import type { GuestMenuId } from '@/components/guest-portal/guest-portal-data';
import type { ModelPortalTabId } from '@/components/model-portal/model-portal-nav';

export function useGuestMenuLabels() {
  const { t } = useI18n();
  return useMemo(
    () =>
      [
        { id: 'model-worden' as GuestMenuId, label: t('guest.menuModelWorden') },
        { id: 'gratis-fotoshoot' as GuestMenuId, label: t('guest.menuFotoshoot') },
        { id: 'casting' as GuestMenuId, label: t('guest.menuCasting') },
        { id: 'intake-gesprek' as GuestMenuId, label: t('guest.menuIntake') },
        { id: 'doelgroepen' as GuestMenuId, label: t('guest.menuDoelgroepen') },
        { id: 'veelgestelde-vragen' as GuestMenuId, label: t('guest.menuFaq') },
        { id: 'contact' as GuestMenuId, label: t('guest.menuContact') },
        { id: 'testshoot' as GuestMenuId, label: t('guest.menuTestshoot') },
      ] as const,
    [t],
  );
}

export function useModelPortalTabLabels() {
  const { t } = useI18n();
  return useMemo(
    () =>
      [
        { id: 'home' as ModelPortalTabId, label: t('modelPortal.tabHome') },
        { id: 'premium' as ModelPortalTabId, label: t('modelPortal.tabPremium') },
        { id: 'opdrachten' as ModelPortalTabId, label: t('modelPortal.tabJobs') },
        { id: 'tryout-modeshow' as ModelPortalTabId, label: t('modelPortal.tabTryout') },
        { id: 'profiel' as ModelPortalTabId, label: t('modelPortal.tabProfile') },
        { id: 'portfolio' as ModelPortalTabId, label: t('modelPortal.tabPortfolio') },
        { id: 'opleiding' as ModelPortalTabId, label: t('modelPortal.tabTraining') },
        { id: 'historiek' as ModelPortalTabId, label: t('modelPortal.tabHistory') },
        { id: 'push' as ModelPortalTabId, label: t('modelPortal.tabPush') },
        { id: 'bericht' as ModelPortalTabId, label: t('modelPortal.tabMessage') },
        { id: 'modellen' as ModelPortalTabId, label: t('modelPortal.tabModels') },
      ] as const,
    [t],
  );
}
