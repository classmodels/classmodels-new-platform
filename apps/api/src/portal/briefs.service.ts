import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { BriefStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ModelPortalHistoryService } from './model-portal-history.service';
import { ModelPushService } from '../push/model-push.service';
import { AgendaNotificationService } from '../agenda/agenda-notifications.service';
import { computeBriefEligibility, type BriefForEligibility } from './brief-eligibility';
import { sanitizeBriefForModelPortal } from './brief-frontend-visibility';
import { buildContractPdfFromLines } from './brief-contract-pdf';

const MODEL_ROLE_SLUGS = ['model', 'newface', 'tryout', 'inactief'] as const;

function coerceDetails(v: unknown): Prisma.InputJsonValue {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Prisma.InputJsonValue;
  return {};
}

function briefEligibilityShape(b: BriefForEligibility): BriefForEligibility {
  return {
    wantedMen: b.wantedMen,
    wantedWomen: b.wantedWomen,
    wantedChildren: b.wantedChildren,
    wantedTeenagers: b.wantedTeenagers,
    ageManFrom: b.ageManFrom,
    ageManTo: b.ageManTo,
    ageWomanFrom: b.ageWomanFrom,
    ageWomanTo: b.ageWomanTo,
    ageChildFrom: b.ageChildFrom,
    ageChildTo: b.ageChildTo,
    ageTeenFrom: b.ageTeenFrom,
    ageTeenTo: b.ageTeenTo,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class BriefsService {
  constructor(
    private prisma: PrismaService,
    private modelHistory: ModelPortalHistoryService,
    private modelPush: ModelPushService,
    private agendaMail: AgendaNotificationService,
  ) {}

  listForClient(clientId: string) {
    return this.prisma.clientBrief.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { responses: true } },
      },
    });
  }

  async getForClient(clientId: string, id: string) {
    const b = await this.prisma.clientBrief.findFirst({
      where: { id, clientId },
      include: {
        responses: {
          include: {
            model: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                bio: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!b) throw new NotFoundException();
    return b;
  }

  private briefDataFromAdminInput(input: {
    title: string;
    body: string;
    extraInfo?: string | null;
    eventDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    wantedMen?: number | null;
    wantedWomen?: number | null;
    wantedChildren?: number | null;
    wantedTeenagers?: number | null;
    ageManFrom?: number | null;
    ageManTo?: number | null;
    ageWomanFrom?: number | null;
    ageWomanTo?: number | null;
    ageChildFrom?: number | null;
    ageChildTo?: number | null;
    ageTeenFrom?: number | null;
    ageTeenTo?: number | null;
    details?: unknown;
    status?: BriefStatus;
  }): Omit<Prisma.ClientBriefCreateInput, 'client'> {
    const eventDate =
      input.eventDate && input.eventDate.trim() !== ''
        ? new Date(`${input.eventDate.slice(0, 10)}T12:00:00.000Z`)
        : null;
    return {
      title: input.title,
      body: input.body,
      extraInfo: input.extraInfo ?? null,
      eventDate,
      startTime: input.startTime?.trim() || null,
      endTime: input.endTime?.trim() || null,
      wantedMen: input.wantedMen ?? null,
      wantedWomen: input.wantedWomen ?? null,
      wantedChildren: input.wantedChildren ?? null,
      wantedTeenagers: input.wantedTeenagers ?? null,
      ageManFrom: input.ageManFrom ?? null,
      ageManTo: input.ageManTo ?? null,
      ageWomanFrom: input.ageWomanFrom ?? null,
      ageWomanTo: input.ageWomanTo ?? null,
      ageChildFrom: input.ageChildFrom ?? null,
      ageChildTo: input.ageChildTo ?? null,
      ageTeenFrom: input.ageTeenFrom ?? null,
      ageTeenTo: input.ageTeenTo ?? null,
      details: coerceDetails(input.details),
      status: input.status ?? 'open',
    };
  }

  createForClient(clientId: string, title: string, body: string) {
    return this.prisma.clientBrief.create({
      data: {
        client: { connect: { id: clientId } },
        ...this.briefDataFromAdminInput({ title, body, status: 'open' }),
      },
    });
  }

  private async notifyEligibleModelsForBrief(briefId: string) {
    const brief = await this.prisma.clientBrief.findUnique({ where: { id: briefId } });
    if (!brief || brief.status !== 'open') return;
    const shape = briefEligibilityShape(brief);
    const models = await this.prisma.user.findMany({
      where: {
        status: 'active',
        roles: { some: { role: { slug: { in: [...MODEL_ROLE_SLUGS] } } } },
      },
      select: { id: true, modelSheet: true },
    });
    for (const m of models) {
      const { eligible } = computeBriefEligibility(shape, m.modelSheet);
      if (eligible) void this.modelPush.notifyBriefCastingEligible(m.id, brief.title, brief.id);
    }
  }

  async adminCreate(
    clientId: string,
    input: {
      title: string;
      body: string;
      extraInfo?: string | null;
      eventDate?: string | null;
      startTime?: string | null;
      endTime?: string | null;
      wantedMen?: number | null;
      wantedWomen?: number | null;
      wantedChildren?: number | null;
      wantedTeenagers?: number | null;
      ageManFrom?: number | null;
      ageManTo?: number | null;
      ageWomanFrom?: number | null;
      ageWomanTo?: number | null;
      ageChildFrom?: number | null;
      ageChildTo?: number | null;
      ageTeenFrom?: number | null;
      ageTeenTo?: number | null;
      details?: unknown;
      status?: BriefStatus;
    },
  ) {
    const client = await this.prisma.user.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Klant niet gevonden');
    const row = await this.prisma.clientBrief.create({
      data: {
        client: { connect: { id: clientId } },
        ...this.briefDataFromAdminInput(input),
      },
      include: {
        client: { select: { email: true, companyName: true, firstName: true, lastName: true } },
        _count: { select: { responses: true } },
      },
    });
    if (row.status === 'open') void this.notifyEligibleModelsForBrief(row.id);
    return row;
  }

  async updateForClient(
    clientId: string,
    id: string,
    dto: {
      title?: string;
      body?: string;
      status?: BriefStatus;
      extraInfo?: string | null;
      eventDate?: string | null;
      startTime?: string | null;
      endTime?: string | null;
      wantedMen?: number | null;
      wantedWomen?: number | null;
      wantedChildren?: number | null;
      wantedTeenagers?: number | null;
      ageManFrom?: number | null;
      ageManTo?: number | null;
      ageWomanFrom?: number | null;
      ageWomanTo?: number | null;
      ageChildFrom?: number | null;
      ageChildTo?: number | null;
      ageTeenFrom?: number | null;
      ageTeenTo?: number | null;
      details?: unknown;
    },
  ) {
    const b = await this.prisma.clientBrief.findFirst({ where: { id, clientId } });
    if (!b) throw new NotFoundException();
    if (dto.title != null || dto.body != null || dto.extraInfo !== undefined) {
      if (b.status !== 'open') {
        throw new ForbiddenException('Alleen open aanvragen zijn bewerkbaar');
      }
    }
    const data: Prisma.ClientBriefUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.body !== undefined) data.body = dto.body;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.extraInfo !== undefined) data.extraInfo = dto.extraInfo;
    if (dto.eventDate !== undefined) {
      data.eventDate =
        dto.eventDate && dto.eventDate.trim() !== ''
          ? new Date(`${dto.eventDate.slice(0, 10)}T12:00:00.000Z`)
          : null;
    }
    if (dto.startTime !== undefined) data.startTime = dto.startTime?.trim() || null;
    if (dto.endTime !== undefined) data.endTime = dto.endTime?.trim() || null;
    if (dto.wantedMen !== undefined) data.wantedMen = dto.wantedMen;
    if (dto.wantedWomen !== undefined) data.wantedWomen = dto.wantedWomen;
    if (dto.wantedChildren !== undefined) data.wantedChildren = dto.wantedChildren;
    if (dto.wantedTeenagers !== undefined) data.wantedTeenagers = dto.wantedTeenagers;
    if (dto.ageManFrom !== undefined) data.ageManFrom = dto.ageManFrom;
    if (dto.ageManTo !== undefined) data.ageManTo = dto.ageManTo;
    if (dto.ageWomanFrom !== undefined) data.ageWomanFrom = dto.ageWomanFrom;
    if (dto.ageWomanTo !== undefined) data.ageWomanTo = dto.ageWomanTo;
    if (dto.ageChildFrom !== undefined) data.ageChildFrom = dto.ageChildFrom;
    if (dto.ageChildTo !== undefined) data.ageChildTo = dto.ageChildTo;
    if (dto.ageTeenFrom !== undefined) data.ageTeenFrom = dto.ageTeenFrom;
    if (dto.ageTeenTo !== undefined) data.ageTeenTo = dto.ageTeenTo;
    if (dto.details !== undefined) data.details = coerceDetails(dto.details);
    return this.prisma.clientBrief.update({ where: { id }, data });
  }

  async adminUpdate(id: string, dto: Record<string, unknown>) {
    const prev = await this.prisma.clientBrief.findUnique({ where: { id }, select: { status: true } });
    if (!prev) throw new NotFoundException();
    const b = await this.prisma.clientBrief.findUnique({ where: { id } });
    if (!b) throw new NotFoundException();
    const data: Prisma.ClientBriefUpdateInput = {};
    if (dto.clientId !== undefined && typeof dto.clientId === 'string') {
      data.client = { connect: { id: dto.clientId } };
    }
    if (dto.title !== undefined) data.title = dto.title as string;
    if (dto.body !== undefined) data.body = dto.body as string;
    if (dto.status !== undefined) data.status = dto.status as BriefStatus;
    if (dto.extraInfo !== undefined) data.extraInfo = (dto.extraInfo as string | null) ?? null;
    if (dto.eventDate !== undefined) {
      const ev = dto.eventDate as string | null | undefined;
      data.eventDate =
        ev && typeof ev === 'string' && ev.trim() !== ''
          ? new Date(`${ev.slice(0, 10)}T12:00:00.000Z`)
          : null;
    }
    if (dto.startTime !== undefined) data.startTime = (dto.startTime as string | null)?.trim() || null;
    if (dto.endTime !== undefined) data.endTime = (dto.endTime as string | null)?.trim() || null;
    if (dto.wantedMen !== undefined) data.wantedMen = dto.wantedMen as number | null;
    if (dto.wantedWomen !== undefined) data.wantedWomen = dto.wantedWomen as number | null;
    if (dto.wantedChildren !== undefined) data.wantedChildren = dto.wantedChildren as number | null;
    if (dto.wantedTeenagers !== undefined) data.wantedTeenagers = dto.wantedTeenagers as number | null;
    if (dto.ageManFrom !== undefined) data.ageManFrom = dto.ageManFrom as number | null;
    if (dto.ageManTo !== undefined) data.ageManTo = dto.ageManTo as number | null;
    if (dto.ageWomanFrom !== undefined) data.ageWomanFrom = dto.ageWomanFrom as number | null;
    if (dto.ageWomanTo !== undefined) data.ageWomanTo = dto.ageWomanTo as number | null;
    if (dto.ageChildFrom !== undefined) data.ageChildFrom = dto.ageChildFrom as number | null;
    if (dto.ageChildTo !== undefined) data.ageChildTo = dto.ageChildTo as number | null;
    if (dto.ageTeenFrom !== undefined) data.ageTeenFrom = dto.ageTeenFrom as number | null;
    if (dto.ageTeenTo !== undefined) data.ageTeenTo = dto.ageTeenTo as number | null;
    if (dto.details !== undefined) data.details = coerceDetails(dto.details);
    const row = await this.prisma.clientBrief.update({
      where: { id },
      data,
      include: {
        client: { select: { email: true, companyName: true, firstName: true, lastName: true } },
        _count: { select: { responses: true } },
      },
    });
    const opening = row.status === 'open' && prev.status !== 'open';
    const eligibilityPush = dto['eligibilityPush'] === true;
    if (row.status === 'open' && (opening || eligibilityPush)) {
      void this.notifyEligibleModelsForBrief(row.id);
    }
    return row;
  }

  listOpenForModels() {
    return this.prisma.clientBrief.findMany({
      where: { status: 'open' },
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            companyName: true,
            firstName: true,
            lastName: true,
          },
        },
        responses: { select: { modelUserId: true, status: true } },
      },
    });
  }

  /** Open opdrachten voor modellen: eerstvolgende datum bovenaan + eligibility voor dit profiel. */
  async listOpenForModelUser(modelUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: modelUserId },
      select: { modelSheet: true },
    });
    const rows = await this.prisma.clientBrief.findMany({
      where: { status: 'open' },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            companyName: true,
            firstName: true,
            lastName: true,
          },
        },
        responses: { select: { modelUserId: true, status: true } },
      },
    });
    const sorted = [...rows].sort((a, b) => {
      const ta = a.eventDate?.getTime() ?? Number.POSITIVE_INFINITY;
      const tb = b.eventDate?.getTime() ?? Number.POSITIVE_INFINITY;
      if (ta !== tb) return ta - tb;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    return sorted.map((b) => {
      const elig = computeBriefEligibility(briefEligibilityShape(b), user?.modelSheet ?? null);
      const sanitized = sanitizeBriefForModelPortal(b);
      return {
        ...sanitized,
        eligibility: elig,
      };
    });
  }

  async getOpenForModel(briefId: string) {
    const b = await this.prisma.clientBrief.findFirst({
      where: { id: briefId, status: 'open' },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            companyName: true,
            firstName: true,
            lastName: true,
          },
        },
        responses: true,
      },
    });
    if (!b) throw new NotFoundException();
    return sanitizeBriefForModelPortal(b);
  }

  async respondToBrief(briefId: string, modelUserId: string, message: string) {
    const brief = await this.prisma.clientBrief.findFirst({
      where: { id: briefId, status: 'open' },
    });
    if (!brief) throw new NotFoundException();
    const model = await this.prisma.user.findUnique({
      where: { id: modelUserId },
      select: { modelSheet: true },
    });
    const { eligible } = computeBriefEligibility(briefEligibilityShape(brief), model?.modelSheet ?? null);
    if (!eligible) {
      throw new ForbiddenException('Uw profiel komt niet in aanmerking voor deze opdracht.');
    }
    const row = await this.prisma.modelBriefResponse.upsert({
      where: { briefId_modelUserId: { briefId, modelUserId } },
      create: { briefId, modelUserId, message, status: 'submitted' },
      update: { message, status: 'submitted' },
    });
    void this.modelHistory.log(modelUserId, 'brief_interest_submitted', {
      briefId,
      briefTitle: brief.title,
      messageChars: message.length,
    });
    return row;
  }

  async withdrawResponse(briefId: string, modelUserId: string) {
    const r = await this.prisma.modelBriefResponse.findUnique({
      where: { briefId_modelUserId: { briefId, modelUserId } },
    });
    if (!r) throw new NotFoundException();
    const brief = await this.prisma.clientBrief.findUnique({
      where: { id: briefId },
      select: { title: true },
    });
    const row = await this.prisma.modelBriefResponse.update({
      where: { id: r.id },
      data: { status: 'withdrawn' },
    });
    void this.modelHistory.log(modelUserId, 'brief_interest_withdrawn', {
      briefId,
      briefTitle: brief?.title ?? '',
    });
    return row;
  }

  adminList() {
    return this.prisma.clientBrief.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        client: { select: { email: true, companyName: true, firstName: true, lastName: true } },
        _count: { select: { responses: true } },
      },
    });
  }

  async adminPatch(id: string, dto: Record<string, unknown>) {
    return this.adminUpdate(id, dto);
  }

  async adminSetResponseStatus(responseId: string, status: 'accepted' | 'declined') {
    const r = await this.prisma.modelBriefResponse.findUnique({
      where: { id: responseId },
      include: { brief: { select: { title: true } } },
    });
    if (!r) throw new NotFoundException();
    const row = await this.prisma.modelBriefResponse.update({
      where: { id: responseId },
      data: { status },
    });
    const kind = status === 'accepted' ? 'brief_selection_accepted' : 'brief_selection_declined';
    void this.modelHistory.log(r.modelUserId, kind, {
      briefId: r.briefId,
      briefTitle: r.brief.title,
      responseId: r.id,
    });
    return row;
  }

  adminGet(id: string) {
    return this.prisma.clientBrief.findUnique({
      where: { id },
      include: {
        client: { select: { email: true, companyName: true, firstName: true, lastName: true } },
        responses: {
          include: {
            model: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                modelSheet: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async adminMatchingSummary(briefId: string) {
    const brief = await this.prisma.clientBrief.findUnique({ where: { id: briefId } });
    if (!brief) throw new NotFoundException();
    const shape = briefEligibilityShape(brief);
    const models = await this.prisma.user.findMany({
      where: {
        status: 'active',
        roles: { some: { role: { slug: { in: [...MODEL_ROLE_SLUGS] } } } },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        modelSheet: true,
      },
      take: 800,
    });
    const eligible: { id: string; email: string; firstName: string | null; lastName: string | null; reason: string }[] =
      [];
    let ineligible = 0;
    for (const m of models) {
      const { eligible: ok, reason } = computeBriefEligibility(shape, m.modelSheet);
      if (ok) {
        eligible.push({
          id: m.id,
          email: m.email,
          firstName: m.firstName,
          lastName: m.lastName,
          reason,
        });
      } else {
        ineligible += 1;
      }
    }
    return { briefId, eligibleCount: eligible.length, ineligibleCount: ineligible, eligible };
  }

  async buildContractHtml(briefId: string, responseId: string): Promise<{ html: string; modelUserId: string; title: string }> {
    const r = await this.prisma.modelBriefResponse.findFirst({
      where: { id: responseId, briefId },
      include: {
        brief: true,
        model: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            modelSheet: true,
          },
        },
      },
    });
    if (!r || !r.model) throw new NotFoundException();
    const b = r.brief;
    const m = r.model;
    const sheet =
      m.modelSheet && typeof m.modelSheet === 'object' && !Array.isArray(m.modelSheet)
        ? (m.modelSheet as Record<string, unknown>)
        : {};
    const straat = String(sheet.straat ?? '');
    const postcode = String(sheet.postcode ?? '');
    const gemeente = String(sheet.gemeente ?? '');
    const details =
      b.details && typeof b.details === 'object' && !Array.isArray(b.details)
        ? (b.details as Record<string, unknown>)
        : {};
    const earnings = String(details.earningsText ?? details.verdiensten ?? '—');
    const ev = b.eventDate ? b.eventDate.toISOString().slice(0, 10) : '—';
    const agencyBlock = `
      <p><strong>Class-Models</strong> (prototype)</p>
      <p>België · contact via het bureau · dit document is een demonstratie-exemplaar zonder juridische geldigheid tot ondertekening door beide partijen.</p>
    `;
    const modelBlock = `
      <p><strong>Model</strong> ${escapeHtml([m.firstName, m.lastName].filter(Boolean).join(' ') || m.email)}<br/>
      E-mail: ${escapeHtml(m.email)}<br/>
      GSM: ${escapeHtml(m.phone ?? '—')}<br/>
      Adres (fiche): ${escapeHtml(straat)} ${escapeHtml(postcode)} ${escapeHtml(gemeente)}</p>
    `;
    const html = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8"/>
<title>Overeenkomst — ${escapeHtml(b.title)}</title>
<style>
  body { font-family: Georgia, serif; max-width: 720px; margin: 2rem auto; color: #111; line-height: 1.45; }
  h1 { font-size: 1.25rem; border-bottom: 2px solid #8B1538; padding-bottom: 0.35rem; color: #8B1538; }
  .box { border: 1px solid #ccc; padding: 1rem; margin: 1rem 0; background: #fafafa; }
  .muted { color: #555; font-size: 0.9rem; }
</style>
</head>
<body>
<h1>Zakelijke overeenkomst (prototype)</h1>
<p class="muted">Opdracht: <strong>${escapeHtml(b.title)}</strong> · Datum opdracht: ${escapeHtml(ev)}</p>
<div class="box">${agencyBlock}</div>
<div class="box">${modelBlock}</div>
<h2>1. Voorwerp</h2>
<p>Het model verbindt zich tot medewerking aan de in de opdracht beschreven prestatie, conform de briefing zoals vermeld op het platform.</p>
<h2>2. Vergoeding (indicatie)</h2>
<p>${escapeHtml(earnings)}</p>
<h2>3. Slotbepalingen (prototype)</h2>
<p>Partijen aanvaarden dat dit document automatisch werd gegenereerd als proef en dat de definitieve afspraken schriftelijk door Class-Models worden bevestigd.</p>
<p class="muted">Reactie-id: ${escapeHtml(r.id)} · Brief-id: ${escapeHtml(b.id)}</p>
</body>
</html>`;
    return { html, modelUserId: m.id, title: b.title };
  }

  async generateContractAndNotify(briefId: string, responseId: string) {
    const { html, modelUserId, title } = await this.buildContractHtml(briefId, responseId);
    void this.modelPush.notifyContractPrototype(modelUserId, title);
    return { html, notified: true };
  }

  private contractTextLines(
    b: {
      title: string;
      body: string;
      eventDate: Date | null;
      startTime: string | null;
      endTime: string | null;
      details: Prisma.JsonValue | null;
    },
    m: {
      email: string;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
      modelSheet: Prisma.JsonValue | null;
    },
  ): string[] {
    const sheet =
      m.modelSheet && typeof m.modelSheet === 'object' && !Array.isArray(m.modelSheet)
        ? (m.modelSheet as Record<string, unknown>)
        : {};
    const straat = String(sheet.straat ?? '');
    const postcode = String(sheet.postcode ?? '');
    const gemeente = String(sheet.gemeente ?? '');
    const details =
      b.details && typeof b.details === 'object' && !Array.isArray(b.details)
        ? (b.details as Record<string, unknown>)
        : {};
    const earnings = String(details.earningsText ?? details.verdiensten ?? '—');
    const ev = b.eventDate ? b.eventDate.toISOString().slice(0, 10) : '—';
    const nm = [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email;
    return [
      'CLASS-MODELS — OVEREENKOMST (PROTOTYPE / PDF)',
      '',
      `Opdracht: ${b.title}`,
      `Opdrachtdatum: ${ev}`,
      b.startTime ? `Startuur: ${b.startTime}` : '',
      b.endTime ? `Einduur: ${b.endTime}` : '',
      '',
      '1. Bureau',
      'Class-Models — contact via het bureau. Dit document is een demonstratie-exemplaar tot schriftelijke bevestiging.',
      '',
      '2. Model',
      `Naam: ${nm}`,
      `E-mail: ${m.email}`,
      `GSM: ${m.phone ?? '—'}`,
      `Adres (fiche): ${straat} ${postcode} ${gemeente}`.trim(),
      '',
      '3. Voorwerp',
      b.body.slice(0, 4000),
      '',
      '4. Vergoeding (indicatie)',
      earnings,
      '',
      '5. Slot',
      'Partijen aanvaarden dat dit document automatisch werd gegenereerd als proef.',
    ].filter((x) => x !== '');
  }

  async adminPushSelectedUsers(
    briefId: string,
    userIds: string[],
    title?: string | null,
    body?: string | null,
  ) {
    if (!userIds?.length) throw new BadRequestException('Geen ontvangers geselecteerd.');
    const brief = await this.prisma.clientBrief.findUnique({ where: { id: briefId } });
    if (!brief) throw new NotFoundException();
    const t =
      (title?.trim() || `Class-Models: ${brief.title}`).slice(0, 120);
    const b =
      (body?.trim() ||
        `Bericht over de opdracht “${brief.title}”. Open het modellenportaal, tab Opdrachten.`).slice(0, 500);
    await this.modelPush.sendBriefAdminBroadcast(userIds, t, b, { briefId });
    return { ok: true, count: userIds.length };
  }

  async adminEmailContractPdfToUsers(briefId: string, userIds: string[]) {
    if (!userIds?.length) throw new BadRequestException('Geen ontvangers geselecteerd.');
    const brief = await this.prisma.clientBrief.findUnique({ where: { id: briefId } });
    if (!brief) throw new NotFoundException();
    const shape = briefEligibilityShape(brief);
    const unique = [...new Set(userIds)];
    const sent: string[] = [];
    const errors: { userId: string; error: string }[] = [];

    for (const uid of unique) {
      try {
        const m = await this.prisma.user.findUnique({
          where: { id: uid },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            modelSheet: true,
          },
        });
        if (!m?.email) {
          errors.push({ userId: uid, error: 'Geen e-mail' });
          continue;
        }
        const { eligible } = computeBriefEligibility(shape, m.modelSheet);
        if (!eligible) {
          errors.push({ userId: uid, error: 'Komt niet in aanmerking' });
          continue;
        }
        const lines = this.contractTextLines(brief, m);
        const pdf = await buildContractPdfFromLines(lines);
        const buf = Buffer.from(pdf);
        const html = `<p>Beste ${escapeHtml([m.firstName, m.lastName].filter(Boolean).join(' ') || 'model')},</p>
<p>Hierbij ontvangt u in bijlage een <strong>prototype-overeenkomst (PDF)</strong> voor de opdracht <strong>${escapeHtml(brief.title)}</strong>.</p>
<p style="color:#555;font-size:14px;">Dit is een automatisch bericht van Class-Models. Bij vragen neemt u contact op met het bureau.</p>`;
        const ok = await this.agendaMail.sendHtmlMailWithAttachments(m.email, `Overeenkomst — ${brief.title}`, html, [
          { filename: `overeenkomst-${briefId.slice(0, 8)}.pdf`, content: buf },
        ]);
        if (!ok) {
          errors.push({
            userId: uid,
            error:
              'SMTP niet geconfigureerd (zet SMTP_HOST, SMTP_PORT, MAIL_FROM in apps/api/.env — zie agenda-mails).',
          });
          continue;
        }
        sent.push(uid);
      } catch (e) {
        errors.push({ userId: uid, error: e instanceof Error ? e.message : 'Onbekende fout' });
      }
    }

    return { sentCount: sent.length, sentUserIds: sent, errors };
  }
}
