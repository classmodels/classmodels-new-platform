import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { sendHtmlMailDetailed } from '../mail/send-html-mail';
import type { OpenModellendagRegisterDto } from './dto/register.dto';
import {
  ageGroupFromAge,
  isOpenModellendagSlotFull,
  OPEN_MODELLENDAG_DATE_LABEL,
  OPEN_MODELLENDAG_VENUE,
} from './open-modellendag.constants';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class OpenModellendagService {
  private readonly log = new Logger(OpenModellendagService.name);

  constructor(private prisma: PrismaService) {}

  async register(dto: OpenModellendagRegisterDto) {
    const name = dto.name.trim().replace(/\s+/g, ' ');
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone.trim();
    const age = dto.age;
    const timeSlot = dto.timeSlot;
    const ageGroup = ageGroupFromAge(age);

    if (ageGroup === 'onbekend') {
      throw new BadRequestException('Leeftijd moet tussen 6 en 99 jaar liggen.');
    }
    if (isOpenModellendagSlotFull(timeSlot)) {
      throw new BadRequestException(
        `Het startuur ${timeSlot.replace(':', '.')} u is volzet. Kies een ander startuur.`,
      );
    }

    try {
      const row = await this.prisma.openModellendagRegistration.create({
        data: { name, email, phone, age, timeSlot, ageGroup },
      });

      void this.sendConfirmation(row).catch((e) =>
        this.log.warn(`Bevestigingsmail mislukt voor ${email}: ${e}`),
      );
      void this.notifyOffice(row).catch((e) =>
        this.log.warn(`Kantoormelding mislukt voor ${email}: ${e}`),
      );

      return { ok: true as const, id: row.id, ageGroup, timeSlot };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException(
          'Dit e-mailadres staat al ingeschreven. Twijfel je over je startuur? Mail ons op info@class-models.be.',
        );
      }
      throw e;
    }
  }

  listAdmin() {
    return this.prisma.openModellendagRegistration.findMany({
      orderBy: [{ timeSlot: 'asc' }, { ageGroup: 'asc' }, { createdAt: 'asc' }],
    });
  }

  private async sendConfirmation(row: {
    name: string;
    email: string;
    phone: string;
    age: number;
    timeSlot: string;
    ageGroup: string;
  }) {
    const first = row.name.split(/\s+/)[0] || row.name;
    const html = `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1612;line-height:1.55">
        <p style="font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#856b3f;margin:0 0 8px">Class-Models</p>
        <h1 style="font-size:26px;margin:0 0 16px;font-weight:600">Je bent ingeschreven, ${escapeHtml(first)}!</h1>
        <p style="margin:0 0 14px">
          Wat fijn dat je erbij bent op onze <strong>Open Modellendag</strong>
          (${OPEN_MODELLENDAG_DATE_LABEL}).
        </p>
        <div style="background:#f7f1e6;border:1px solid #e4d5b5;border-radius:12px;padding:16px 18px;margin:0 0 18px">
          <p style="margin:0 0 6px"><strong>Jouw startuur:</strong> ${escapeHtml(row.timeSlot)}</p>
          <p style="margin:0 0 6px"><strong>Leeftijdsgroep:</strong> ${escapeHtml(row.ageGroup)} jaar</p>
          <p style="margin:0"><strong>Adres:</strong> ${OPEN_MODELLENDAG_VENUE}</p>
        </div>
        <p style="margin:0 0 14px">
          Die dag mag je gewoon <strong>komen kijken</strong> hoe een modellenbureau werkt —
          en optioneel meedoen met een <strong>gratis initiatieles catwalk</strong>.
          Het is geen examen: we laten zien hoe we werken, wat we zoeken en hoe opdrachten
          verlopen. Je mag al je vragen stellen.
        </p>
        <p style="margin:0 0 14px">
          Je staat <strong>niet</strong> tussen ervaren modellen. Iedereen in jouw groepje
          doet dit voor het eerst of bijna voor het eerst. Max. <strong>6 personen</strong>,
          opgedeeld op leeftijd. Niets moet — kijken mag ook.
        </p>
        <p style="margin:0 0 14px">
          Trek iets aan waarin je je goed voelt. We kijken ernaar uit je te verwelkomen.
        </p>
        <p style="margin:24px 0 0;font-size:14px;color:#4a453c">
          Tot ${OPEN_MODELLENDAG_DATE_LABEL} om ${escapeHtml(row.timeSlot)}!<br/>
          Het team van Class-Models<br/>
          <a href="mailto:info@class-models.be" style="color:#856b3f">info@class-models.be</a>
        </p>
      </div>
    `;
    const result = await sendHtmlMailDetailed(
      this.prisma,
      row.email,
      `Je bent ingeschreven — Open Modellendag ${row.timeSlot}`,
      html,
      { fast: true },
    );
    if (!result.ok) {
      this.log.warn(`Bevestiging niet verstuurd naar ${row.email}: ${result.error}`);
    }
  }

  private async notifyOffice(row: {
    name: string;
    email: string;
    phone: string;
    age: number;
    timeSlot: string;
    ageGroup: string;
  }) {
    const to = process.env.OPEN_MODELLENDAG_NOTIFY_TO?.trim() || 'info@class-models.be';
    const html = `
      <p><strong>Nieuwe inschrijving Open Modellendag</strong></p>
      <ul>
        <li>Naam: ${escapeHtml(row.name)}</li>
        <li>E-mail: ${escapeHtml(row.email)}</li>
        <li>Tel: ${escapeHtml(row.phone)}</li>
        <li>Leeftijd: ${row.age} (${escapeHtml(row.ageGroup)})</li>
        <li>Startuur: ${escapeHtml(row.timeSlot)}</li>
      </ul>
    `;
    await sendHtmlMailDetailed(
      this.prisma,
      to,
      `Inschrijving OMD ${row.timeSlot} — ${row.name}`,
      html,
      { fast: true },
    );
  }
}
