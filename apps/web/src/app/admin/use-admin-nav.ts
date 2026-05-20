'use client';

import { useMemo } from 'react';
import { useI18n } from '@/i18n/context';
import type { AdminNavLeaf, AdminNavSection } from './admin-nav';
import { filterNavLeaves, filterNavSections } from './admin-nav';

export const ADMIN_DASHBOARD_ITEM_KEY = 'admin.dashboard';

export function useAdminNavSections(can: (permission: string) => boolean) {
  const { t } = useI18n();

  return useMemo(() => {
    const dashboard: AdminNavLeaf = { href: '/admin/dashboard', label: t('admin.dashboard') };

    const sections: AdminNavSection[] = [
      {
        id: 'portal-content',
        label: t('admin.sectionPortal'),
        icon: 'layout',
        items: [
          { href: '/admin/portalen', label: t('admin.portalen') },
          { href: '/admin/content', label: t('admin.content'), permission: 'content.strings.write' },
          { href: '/admin/menus', label: t('admin.menus'), permission: 'admin.menus.read' },
        ],
      },
      {
        id: 'opdrachten',
        label: t('admin.sectionJobs'),
        icon: 'clipboard',
        items: [{ href: '/admin/briefs', label: t('admin.briefs'), permission: 'admin.briefs.read' }],
      },
      {
        id: 'accounts',
        label: t('admin.sectionAccounts'),
        icon: 'users',
        items: [
          { href: '/admin/modellen-profielen', label: t('admin.models'), permission: 'admin.users.read' },
          { href: '/admin/gebruikers', label: t('admin.users'), permission: 'admin.users.read' },
          { href: '/admin/rollen', label: t('admin.roles'), permission: 'admin.roles.read' },
        ],
      },
      {
        id: 'billing',
        label: t('admin.sectionBilling'),
        icon: 'credit',
        items: [
          { href: '/admin/premium', label: t('admin.premium'), permission: 'admin.subscriptions.read' },
          { href: '/admin/tryout-modeshow', label: t('admin.tryout'), permission: 'admin.billing.read' },
          { href: '/admin/setkaart', label: 'Setkaarten gratis', permission: 'admin.users.write' },
          { href: '/admin/mollie', label: t('admin.mollie'), permission: 'admin.billing.read' },
          { href: '/admin/mail-instellingen', label: t('admin.mailSmtp'), permission: 'admin.agenda.read' },
        ],
      },
      {
        id: 'media',
        label: t('admin.sectionMedia'),
        icon: 'image',
        items: [
          { href: '/admin/media', label: t('admin.mediaLibrary'), permission: 'admin.media.read' },
          { href: '/admin/reviews', label: t('admin.reviews'), permission: 'admin.reviews.read' },
          { href: '/admin/testshoot', label: t('admin.testshoot'), permission: 'admin.testshoot.read' },
        ],
      },
      {
        id: 'agenda',
        label: t('admin.sectionAgenda'),
        icon: 'calendar',
        items: [
          { href: '/admin/agenda', label: t('admin.agendaOverview'), permission: 'admin.agenda.read' },
          { href: '/admin/agenda/boekingen', label: t('admin.agendaBookings'), permission: 'admin.agenda.read' },
          { href: '/admin/agenda/open-dagen', label: t('admin.agendaOpenDays'), permission: 'admin.agenda.read' },
          { href: '/admin/agenda/planning', label: t('admin.agendaPlanning'), permission: 'admin.agenda.read' },
          { href: '/admin/agenda/mail-preview', label: t('admin.agendaMail'), permission: 'admin.agenda.read' },
        ],
      },
      {
        id: 'communicatie',
        label: t('admin.sectionComms'),
        icon: 'bell',
        items: [
          { href: '/admin/communicatie/verzenden', label: t('admin.commsSend'), permission: 'admin.push.send' },
          { href: '/admin/communicatie/lijsten', label: t('admin.commsLists'), permission: 'admin.push.lists' },
          { href: '/admin/communicatie/geschiedenis', label: t('admin.commsHistory'), permission: 'admin.push.send' },
          { href: '/admin/push-berichten', label: t('admin.pushMessages'), permission: 'admin.push.send' },
          { href: '/admin/push-lijsten', label: t('admin.pushLists'), permission: 'admin.push.lists' },
        ],
      },
      {
        id: 'techniek',
        label: t('admin.sectionTech'),
        icon: 'wrench',
        items: [
          { href: '/admin/statistieken', label: 'Statistieken', permission: 'admin.agenda.read' },
          { href: '/admin/historiek', label: t('admin.history'), permission: 'admin.audit.read' },
          { href: '/admin/snippets', label: t('admin.snippets'), permission: 'admin.snippets.read' },
        ],
      },
    ];

    return {
      dashboard,
      sections: filterNavSections(sections, can),
    };
  }, [t, can]);
}

export function useAdminDashboardItem() {
  const { t } = useI18n();
  return useMemo(() => ({ href: '/admin/dashboard', label: t('admin.dashboard') }), [t]);
}
