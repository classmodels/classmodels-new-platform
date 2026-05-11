'use client';

import type { ReactNode } from 'react';
import { MODEL_PORTAL_TABS, type ModelPortalTabId } from '@/components/model-portal/model-portal-nav';
import { CmText } from '@/components/CmText';

function ModelPortalHeroInner({
  userFirstName,
  premiumButton,
}: {
  userFirstName: string;
  premiumButton?: ReactNode;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_min(260px,34%)] md:items-center md:gap-8">
      <div>
        <CmText
          contentKey="portal.model.hero.kicker"
          as="p"
          className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/85"
          fallback="Modellenportaal"
        />
        <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight md:text-3xl lg:text-4xl">
          <CmText contentKey="portal.model.hero.welcome" as="span" className="text-white" fallback="Welkom" />
          {userFirstName ? `, ${userFirstName}` : ''}
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
          fallback="Class-Models — modellenportaal"
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
  sectionHeaderRight,
  userFirstName,
  premiumButton,
  children,
}: {
  activeTab: ModelPortalTabId;
  onTabChange: (id: ModelPortalTabId) => void;
  sectionTitle: string;
  sectionHeaderRight?: ReactNode;
  userFirstName: string;
  premiumButton?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-panel text-ink">
      <div className="w-full bg-gradient-to-br from-burgundy via-burgundyDeep to-burgundy text-white shadow-[0_1px_0_rgba(0,0,0,0.06)]">
        <div className="mx-auto w-full max-w-page px-4 py-8 md:px-6 md:py-10">
          <ModelPortalHeroInner userFirstName={userFirstName} premiumButton={premiumButton} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-page px-4 pb-8 pt-6 md:px-6 md:pb-10 md:pt-8">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-stretch">
          <aside className="flex h-full min-h-0 flex-col overflow-hidden border border-line bg-white shadow-sm lg:sticky lg:top-4">
            <div className="cm-red-titlebar shrink-0 border-b border-line">
              <div className="cm-red-titlebar-inner">
                <CmText
                  contentKey="portal.model.sidebar.title"
                  as="p"
                  className="text-xs font-semibold uppercase tracking-wide text-white"
                  fallback="Snelle actie"
                />
              </div>
            </div>
            <nav className="flex min-h-0 flex-1 flex-col bg-white" aria-label="Modellenportaal">
              <div className="shrink-0">
                {MODEL_PORTAL_TABS.map((t, index) => {
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onTabChange(t.id)}
                      className={`flex w-full items-center justify-between gap-2 py-3 pl-4 pr-4 text-left text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-burgundy/35 focus-visible:ring-offset-0 ${
                        index > 0 ? 'border-t border-line' : ''
                      } ${
                        isActive
                          ? 'bg-panel text-ink [box-shadow:inset_3px_0_0_0_#6f121b]'
                          : 'text-ink hover:bg-panel/70'
                      }`}
                    >
                      <CmText
                        contentKey={`portal.model.nav.${t.id}.label`}
                        as="span"
                        className="text-ink"
                        fallback={t.label}
                      />
                      <span className="text-muted" aria-hidden>
                        ›
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="min-h-8 flex-1 bg-white" aria-hidden />
            </nav>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border border-line bg-white shadow-sm">
            <div className="cm-red-titlebar shrink-0 border-b border-line">
              <div className="cm-red-titlebar-inner">
                <h2 className="cm-red-titlebar-title">{sectionTitle}</h2>
                {sectionHeaderRight}
              </div>
            </div>
            <div className="min-h-0 flex-1 p-4 md:p-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
