/**
 * Alle CMS-sleutels die de frontend verwacht (voor admin-overzicht + “ontbrekend aanmaken”).
 * Dynamische patronen worden uitgebreid op basis van vaste data in guest-portal-data en model-portal-nav.
 */
import { MODEL_PORTAL_TABS } from '@/components/model-portal/model-portal-nav';
import {
  CARD_MODEL_WORDEN,
  CASTING_PAGE,
  DOELGROEPEN_CARDS,
  GUEST_FAQ,
  GUEST_MENU,
  GRATIS_FOTOSHOOT_PAGE,
  INTAKE_GESPREK_PAGE,
  MODEL_WORDEN_STATS,
  MODEL_WORDEN_TRUST_BAR,
  WAAROM_CHECKLIST,
  WAAROM_PARAGRAPHS,
} from '@/components/guest-portal/guest-portal-data';

const LITERAL_KEYS: string[] = [
  'home.reviews.title',
  'portal.model.hero.kicker',
  'portal.model.hero.greeting',
  'portal.model.hero.welcome',
  'portal.model.hero.body',
  'portal.model.hero.box.title',
  'portal.model.hero.box.body',
  'portal.model.sidebar.title',
  'portal.model.premium.title',
  'portal.model.premium.intro',
  'portal.model.home.welcome.small',
  'portal.model.home.welcome.title',
  'portal.model.home.welcome.body',
  'portal.model.home.important.kicker',
  'portal.model.home.important.body',
  'portal.model.home.premium.return',
  'portal.model.home.steps.title',
  'portal.model.home.steps.intro',
  'portal.model.home.steps.1.title',
  'portal.model.home.steps.1.body',
  'portal.model.home.steps.2.title',
  'portal.model.home.steps.2.body',
  'portal.model.home.steps.3.title',
  'portal.model.home.steps.3.body',
  'portal.model.home.steps.outro',
  'portal.model.home.platformlist.title',
  'portal.model.home.platformlist.intro',
  'portal.model.home.platformlist.0',
  'portal.model.home.platformlist.1',
  'portal.model.home.platformlist.2',
  'portal.model.home.platformlist.3',
  'portal.model.home.platformlist.4',
  'portal.model.home.profile.title',
  'portal.model.home.profile.intro',
  'portal.model.home.profile.0',
  'portal.model.home.profile.1',
  'portal.model.home.profile.2',
  'portal.model.home.profile.footer',
  'portal.model.home.professional.title',
  'portal.model.home.professional.intro',
  'portal.model.home.professional.0',
  'portal.model.home.professional.1',
  'portal.model.home.professional.2',
  'portal.model.home.professional.3',
  'portal.model.home.professional.footer',
  'portal.model.home.aside.opdrachten.title',
  'portal.model.home.aside.opdrachten.body',
  'portal.model.home.aside.communicatie.title',
  'portal.model.home.aside.communicatie.body',
  'portal.model.home.aside.sms.title',
  'portal.model.home.aside.sms.body',
  'portal.model.home.aside.slot.title',
  'portal.model.home.aside.slot.body',
  'portal.model.home.loggedIn.prefix',
  'portal.model.home.remember.kicker',
  'portal.model.home.remember.body',
  'portal.model.home.quick.title',
  'portal.model.home.quick.opleiding.title',
  'portal.model.home.quick.opleiding.sub',
  'portal.model.home.quick.portfolio.title',
  'portal.model.home.quick.portfolio.sub',
  'portal.model.portfolio.info.title',
  'portal.model.portfolio.info.body',
  'portal.model.portfolio.summary.empty.title',
  'portal.model.portfolio.summary.empty.body',
  'portal.model.portfolio.booking.hint',
  'portal.model.portfolio.booked.prep.title',
  'portal.model.portfolio.booked.prep.body',
  'portal.model.home.quick.opdrachten.title',
  'portal.model.home.quick.opdrachten.sub',
  'portal.model.home.quick.bericht.title',
  'portal.model.home.quick.bericht.sub',
  'portal.model.home.quick.profiel.title',
  'portal.model.home.quick.profiel.sub',
  'portal.guest.testshoot.kicker',
  'portal.guest.testshoot.title',
  'portal.guest.testshoot.intro',
  'portal.guest.testshoot.backstage.before',
  'portal.guest.testshoot.backstage.path',
  'portal.guest.testshoot.backstage.after',
  'portal.guest.testshoot.loading',
  'portal.guest.testshoot.empty',
  'portal.guest.signature',
  'site.header.logo',
  'site.header.tagline',
  'site.header.nav.guest',
  'site.header.nav.model',
  'site.header.nav.client',
  'site.header.nav.reviews',
  'site.header.nav.contact',
  'site.header.nav.logout',
  'site.header.nav.login',
  'begin.title',
  'begin.subtitle',
  'begin.body',
  'begin.moreInfo',
  'begin.viewGuestPortal',
  'begin.tabModel',
  'begin.tabGuest',
  'begin.tabClient',
  'begin.tabPhotographer',
  'begin.modelLoginTitle',
  'begin.modelRegisterTitle',
  'begin.modelLoginHint',
  'begin.modelLoginBtn',
  'begin.modelRegisterBtn',
  'begin.noAccount',
  'begin.hasAccount',
  'begin.clientLoginTitle',
  'begin.clientRegisterTitle',
  'begin.clientLoginHint',
  'begin.clientLoginBtn',
  'begin.hasClientAccount',
  'begin.photographerTitle',
  'begin.photographerHint',
  'begin.photographerLoginBtn',
  'portal.guest.contact.hero.kicker',
  'portal.guest.contact.hero.intro',
  'portal.guest.contact.tile.adres.kicker',
  'portal.guest.contact.tile.email.kicker',
  'portal.guest.contact.tile.telefoon.kicker',
  'portal.guest.contact.tile.rekening.kicker',
  'portal.guest.contact.tile.btw.kicker',
  'portal.guest.contact.phone.prefix',
  'portal.guest.contact.form.title',
  'portal.guest.contact.form.intro',
  'portal.guest.contact.form.label.name',
  'portal.guest.contact.form.label.nameHint',
  'portal.guest.contact.form.label.email',
  'portal.guest.contact.form.label.message',
  'portal.guest.contact.form.submit',
  'portal.guest.contact.map.title',
  'portal.guest.contact.map.openMaps',
  'portal.guest.contact.footer.beforeLink',
  'portal.guest.contact.footer.link',
  'portal.guest.contact.footer.afterLink',
  'portal.guest.contact.form.placeholder.name',
  'portal.guest.contact.form.placeholder.email',
  'portal.guest.contact.form.placeholder.message',
  'portal.guest.contact.map.iframeTitle',
  'portal.guest.hero.kicker',
  'portal.guest.hero.welcome',
  'portal.guest.hero.body',
  'portal.guest.hero.btn.gratis',
  'portal.guest.hero.btn.casting',
  'portal.guest.hero.btn.intake',
  'portal.guest.cta.heading.line1',
  'portal.guest.cta.heading.line2',
  'portal.guest.cta.heading.sub',
  'portal.guest.cta.btn.gratis',
  'portal.guest.cta.btn.casting',
  'portal.guest.cta.btn.intake',
  'portal.guest.mail.preface',
  'portal.guest.mail.cta',
  'portal.guest.doelgroepen.sidebarTitle',
  'portal.guest.modelworden.waarom.kicker',
  'portal.guest.modelworden.waarom.title',
  'portal.guest.modelworden.doelgroepen.kicker',
  'portal.guest.modelworden.doelgroepen.title',
  'portal.guest.doelgroepen.intro',
  'portal.guest.faq.cta.contact',
  'portal.guest.faq.cta.home',
  'portal.guest.sidebar.title',
  'portal.guest.panel.title.booking',
  'portal.client.hero.kicker',
  'portal.client.hero.welcome',
  'portal.client.hero.body',
  'portal.client.sidebar.title',
  'portal.client.nav.overzicht',
  'portal.client.nav.profiel',
  'portal.client.nav.nieuw',
  'portal.client.nav.aanvragen',
  'portal.client.panel.title',
  'portal.client.title',
  'portal.client.intro',
  'portal.client.section2',
  'portal.client.profile.title',
  'portal.client.profile.save',
  'portal.client.brief.new.title',
  'portal.client.brief.new.submit',
  'portal.client.brief.list.title',
  'portal.client.brief.list.details',
  'portal.client.brief.list.empty',
];

function offerPageKeys(slug: 'gratis-fotoshoot' | 'casting') {
  const page = slug === 'casting' ? CASTING_PAGE : GRATIS_FOTOSHOOT_PAGE;
  const P = `portal.guest.page.${slug}`;
  const out = [`${P}.expectTitle`, `${P}.whyTitle`, `${P}.whyParagraph`, `${P}.ctaButton`];
  page.expectBullets.forEach((_, i) => out.push(`${P}.expectBullet.${i}`));
  return out;
}

function intakePageKeys() {
  const P = 'portal.guest.page.intake-gesprek';
  const out = [`${P}.howTitle`, `${P}.whyTitle`, `${P}.ctaButton`];
  INTAKE_GESPREK_PAGE.steps.forEach((_, i) => out.push(`${P}.step.${i}`));
  return out;
}

function guestMenuPanelTitles() {
  return GUEST_MENU.map((m) => `portal.guest.panel.title.${m.id}`);
}

export function buildKnownContentKeys(): string[] {
  const out = new Set<string>(LITERAL_KEYS);

  for (const t of MODEL_PORTAL_TABS) {
    out.add(`portal.model.nav.${t.id}.label`);
  }

  for (const m of GUEST_MENU) {
    out.add(`portal.guest.nav.${m.id}.label`);
    out.add(`portal.guest.nav.embedded.${m.id}`);
  }

  for (let i = 0; i < MODEL_WORDEN_TRUST_BAR.length; i++) {
    out.add(`portal.guest.trust.${i}.line1`);
    out.add(`portal.guest.trust.${i}.line2`);
  }

  for (let i = 0; i < DOELGROEPEN_CARDS.length; i++) {
    out.add(`portal.guest.doelgroepen.card.${i}.title`);
    out.add(`portal.guest.doelgroepen.card.${i}.body`);
  }

  for (let i = 0; i < GUEST_FAQ.length; i++) {
    out.add(`portal.guest.faq.${i}.q`);
    out.add(`portal.guest.faq.${i}.a`);
  }

  for (let i = 0; i < WAAROM_PARAGRAPHS.length; i++) {
    out.add(`portal.guest.waarom.paragraph.${i}`);
  }
  for (let i = 0; i < WAAROM_CHECKLIST.length; i++) {
    out.add(`portal.guest.waarom.bullet.${i}`);
  }

  for (let i = 0; i < MODEL_WORDEN_STATS.length; i++) {
    out.add(`portal.guest.stats.${i}.value`);
    out.add(`portal.guest.stats.${i}.label`);
  }

  CARD_MODEL_WORDEN.forEach((card, cardIndex) => {
    const p = `portal.guest.modelworden.card.${cardIndex}`;
    out.add(`${p}.kicker`);
    out.add(`${p}.title`);
    out.add(`${p}.cta`);
    card.bullets.forEach((_, bi) => out.add(`${p}.bullet.${bi}`));
  });

  offerPageKeys('gratis-fotoshoot').forEach((k) => out.add(k));
  offerPageKeys('casting').forEach((k) => out.add(k));
  intakePageKeys().forEach((k) => out.add(k));

  guestMenuPanelTitles().forEach((k) => out.add(k));

  return [...out].sort((a, b) => a.localeCompare(b));
}
