'use client';

import type { ReactNode } from 'react';
import {
  MODEL_PORTAL_PREMIUM_TAB_IDS,
  type ModelPortalTabId,
} from '@/components/model-portal/model-portal-nav';
import Link from 'next/link';
import { useModelPortalTabLabels } from '@/i18n/portal-labels';
import { ImpersonationBanner } from '@/components/model-portal/ImpersonationBanner';
import { CmText } from '@/components/CmText';

function ModelPortalHeroInner({
  userDisplayName,
  premiumButton,
}: {
  userDisplayName: string;
  premiumButton?: ReactNode;
}) {
  const greeting = userDisplayName.trim() ? `Welkom, ${userDisplayName.trim()}` : 'Welkom';

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_min(260px,34%)] md:items-center md:gap-8">
      <div>
        <CmText
          contentKey="portal.model.hero.kicker"
          as="p"
          className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/85"
          fallback="Model"
        />
        <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-white md:text-3xl lg:text-4xl">
          {greeting}
        </h2>
        <CmText
          contentKey="portal.model.hero.body"
          as="p"
          className="mt-3 max-w-xl text-sm leading-relaxed text-white/90"
          fallback="Beheer hier uw modellenaccount: opdrachten, uw modellenfiche, afspraken en berichten — met dezelfde duidelijke structuur als het gastenportaal."
        />
        {premiumButton ? <div className="mt-5 flex flex-wrap gap-2">{premiumButton}</div> : null}
      </div>
      <div className="border border-white/25 bg-black/20 p-4 text-xs leading-relaxed text-white/90 md:text-sm">
        <CmText
          contentKey="portal.model.hero.box.title"
          as="p"
          className="font-medium text-white"
          fallback="Class-Models"
        />
        <CmText
          contentKey="portal.model.hero.box.body"
          as="p"
          className="mt-2"
          fallback="Gebruik het menu links voor alle onderwerpen. Op de startpagina vindt u een volledige uitleg over uw traject, verplichte stappen en professionele verwachtingen."
        />
      </div>
    </div>
  );
}

export function ModelPortalShell({
  activeTab,
  onTabChange,
  sectionTitle,
  sectionTitleSlot,
  replaceSectionTitleBar = false,
  sectionHeaderRight,
  sectionTitleBarClassName,
  sectionTitleBarInnerClassName,
  userDisplayName,
  premiumButton,
  pushUnreadCount = 0,
  isPremium = true,
  menuTabs,
  children,
}: {
  activeTab: ModelPortalTabId;
  onTabChange: (id: ModelPortalTabId) => void;
  /** Optioneel: bv. historiek/bericht verbergen zonder premium */
  menuTabs?: readonly { id: ModelPortalTabId; label: string }[];
  sectionTitle: string;
  sectionTitleSlot?: ReactNode | null;
  replaceSectionTitleBar?: boolean;
  sectionHeaderRight?: ReactNode;
  /** bv. `!h-auto min-h-[44px] py-1.5` als de rechterkant meerdere rijen knoppen heeft */
  sectionTitleBarClassName?: string;
  /** bv. `items-start !flex-wrap` voor langere toolbars */
  sectionTitleBarInnerClassName?: string;
  /** Volledige naam voor de welkomst (voornaam + familienaam). */
  userDisplayName: string;
  premiumButton?: ReactNode;
  /** Ongelezen pushberichten (tab Pushberichten in het menu). */
  pushUnreadCount?: number;
  /** Zonder premium: badge op premium-tabs in het menu. */
  isPremium?: boolean;
  children: ReactNode;
}) {
  const defaultTabs = useModelPortalTabLabels();
  const portalTabs = menuTabs ?? defaultTabs;

  const handleTabClick = (id: ModelPortalTabId) => {
    if (!isPremium && MODEL_PORTAL_PREMIUM_TAB_IDS.has(id)) {
      onTabChange('premium');
      return;
    }
    onTabChange(id);
  };

  return (
    <div className="min-h-[100dvh] bg-panel text-ink">
      <ImpersonationBanner />
      <div className="w-full bg-gradient-to-br from-burgundy via-burgundyDeep to-burgundy text-white shadow-[0_1px_0_rgba(0,0,0,0.06)]">
        <div className="mx-auto w-full max-w-page px-4 py-8 md:px-6 md:py-10">
          <ModelPortalHeroInner userDisplayName={userDisplayName} premiumButton={premiumButton} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-page px-4 pb-8 pt-6 md:px-6 md:pb-10 md:pt-8">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          <aside className="flex min-h-0 flex-col overflow-hidden border border-line bg-white shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start">
            <div className="cm-red-titlebar shrink-0 border-b border-line">
              <div className="cm-red-titlebar-inner">
                <CmText
                  contentKey="portal.model.sidebar.title"
                  as="p"
                  className="text-xs font-semibold uppercase tracking-wide text-white"
                  fallback="Menu"
                />
              </div>
            </div>
            <nav
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white"
              aria-label="Model menu"
            >
              {portalTabs.map((t, index) => {
                const isActive = activeTab === t.id;
                const showPremiumBadge = !isPremium && MODEL_PORTAL_PREMIUM_TAB_IDS.has(t.id);
                const rowClass = `flex w-full items-center gap-2 py-2 pl-3 pr-2 text-left text-[11px] font-medium transition ${
                  index > 0 ? 'border-t border-line' : ''
                } ${
                  isActive
                    ? 'bg-panel text-ink [box-shadow:inset_3px_0_0_0_#6f121b]'
                    : 'text-ink hover:bg-panel/70'
                }`;
                return (
                  <div key={t.id} className={rowClass}>
                    <button
                      type="button"
                      onClick={() => handleTabClick(t.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-burgundy/35 focus-visible:ring-offset-0"
                    >
                      <CmText
                        contentKey={`portal.model.nav.${t.id}.label`}
                        as="span"
                        className="min-w-0 truncate text-ink"
                        fallback={t.label}
                      />
                      {t.id === 'push' && isPremium ? (
                        <span
                          className={`push-menu-badge shrink-0 px-1.5 py-0.5 text-[9px] font-bold leading-none ${
                            pushUnreadCount > 0
                              ? 'bg-burgundy text-white'
                              : 'border border-zinc-200 bg-zinc-100 text-zinc-600'
                          }`}
                          aria-label={`${pushUnreadCount} ongelezen`}
                        >
                          {pushUnreadCount > 99 ? '99+' : pushUnreadCount}
                        </span>
                      ) : null}
                    </button>
                    {showPremiumBadge ? (
                      <Link
                        href="/portal/model?tab=premium"
                        className="shrink-0 rounded border border-amber-500/40 bg-amber-50 px-1.5 py-px text-[8px] font-normal leading-tight text-amber-950 hover:bg-amber-100"
                        title="Vereist premium — klik voor uitleg"
                      >
                        vereist premium
                      </Link>
                    ) : (
                      <span className="shrink-0 pr-0.5 text-muted" aria-hidden>
                        ›
                      </span>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border border-line bg-white shadow-sm">
            <div
              className={`cm-red-titlebar shrink-0 border-b border-line ${sectionTitleBarClassName ?? ''}`}
            >
              <div
                className={`cm-red-titlebar-inner ${sectionTitleBarInnerClassName ?? ''} ${
                  replaceSectionTitleBar ? '!h-auto min-h-0 flex-col items-stretch gap-2 py-2' : ''
                }`}
              >
                {replaceSectionTitleBar ? (
                  <div className="min-w-0 flex-1">
                    {sectionTitleSlot ?? (
                      <span className="text-xs text-white/80" aria-live="polite">
                        Laden…
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <h2 className="cm-red-titlebar-title min-w-0 shrink-0">{sectionTitle}</h2>
                    {sectionHeaderRight != null ? (
                      <div className="flex min-w-0 max-w-full flex-1 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                        {sectionHeaderRight}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
            <div className="min-h-0 flex-1 p-4 md:p-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
