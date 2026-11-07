import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  StreamableFile,
  UnauthorizedException,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PrismaService } from '../prisma/prisma.service';
import { MODEL_INTAKE_RUNTIME_TOKEN } from './admin-model-intake-settings.controller';

const SLOTS = ['full', 'face', 'side'] as const;

type IntakeRow = {
  id: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  email: string;
  gender: string;
  ageGroup: string;
  heightCm: number | null;
  childAge: number | null;
  paymentId: string;
  paymentStatus: string;
  checkout: string | null;
  emailSent: number | boolean;
  measures: string | null;
  report: string | null;
};

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toRecord(row: IntakeRow) {
  return {
    id: row.id,
    createdAt: row.createdAt,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    gender: row.gender,
    ageGroup: row.ageGroup === 'child' ? 'child' : 'adult',
    heightCm: row.heightCm == null ? null : Number(row.heightCm),
    childAge: row.childAge == null ? null : Number(row.childAge),
    paymentId: row.paymentId || '',
    paymentStatus: row.paymentStatus || 'open',
    checkout: row.checkout || '',
    emailSent: Boolean(row.emailSent),
    measures: parseJson<unknown[]>(row.measures, []),
    report: parseJson<unknown | null>(row.report, null),
  };
}

@Controller()
export class AdminModelIntakeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('model-intake/runtime')
  async list(@Headers('x-cm-model-intake') header?: string) {
    this.assertRuntime(header);
    await this.prisma.ensureModelIntake();
    const rows = await this.prisma.$queryRaw<IntakeRow[]>`
      SELECT id, createdAt, firstName, lastName, email, gender, ageGroup, heightCm, childAge,
             paymentId, paymentStatus, checkout, emailSent, measures, report
      FROM ModelIntake
      ORDER BY createdAt DESC
    `;
    return rows.map(toRecord);
  }

  @Get('model-intake/runtime/by-payment/:paymentId')
  async byPayment(@Headers('x-cm-model-intake') header: string | undefined, @Param('paymentId') paymentId: string) {
    this.assertRuntime(header);
    await this.prisma.ensureModelIntake();
    const rows = await this.prisma.$queryRaw<IntakeRow[]>`
      SELECT id, createdAt, firstName, lastName, email, gender, ageGroup, heightCm, childAge,
             paymentId, paymentStatus, checkout, emailSent, measures, report
      FROM ModelIntake
      WHERE paymentId = ${paymentId}
      LIMIT 1
    `;
    if (!rows[0]) throw new NotFoundException();
    return toRecord(rows[0]);
  }

  @Get('model-intake/runtime/:id')
  async one(@Headers('x-cm-model-intake') header: string | undefined, @Param('id') id: string) {
    this.assertRuntime(header);
    const row = await this.find(id);
    if (!row) throw new NotFoundException();
    return toRecord(row);
  }

  @Get('model-intake/runtime/:id/photo/:slot')
  async photo(
    @Headers('x-cm-model-intake') header: string | undefined,
    @Param('id') id: string,
    @Param('slot') slot: string,
  ) {
    this.assertRuntime(header);
    if (!SLOTS.includes(slot as (typeof SLOTS)[number])) throw new NotFoundException();
    await this.prisma.ensureModelIntake();
    const rows = await this.prisma.$queryRaw<Array<{ mime: string; data: string }>>`
      SELECT mime, data FROM ModelIntakePhoto WHERE intakeId = ${id} AND slot = ${slot} LIMIT 1
    `;
    if (!rows[0]?.data) throw new NotFoundException();
    const buf = Buffer.from(rows[0].data, 'base64');
    return new StreamableFile(buf, {
      type: rows[0].mime || 'image/jpeg',
      disposition: `inline; filename="${slot}.jpg"`,
    });
  }

  @Post('model-intake/runtime')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024, files: 3 },
    }),
  )
  async upsert(
    @Headers('x-cm-model-intake') header: string | undefined,
    @Body() body: { meta?: string },
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    this.assertRuntime(header);
    let meta: Record<string, unknown>;
    try {
      meta = JSON.parse(String(body?.meta || '')) as Record<string, unknown>;
    } catch {
      throw new BadRequestException('Dossier ontbreekt.');
    }
    const id = String(meta.id || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new BadRequestException('Ongeldig dossier.');
    await this.prisma.ensureModelIntake();
    const existing = await this.find(id);
    const report =
      meta.report == null
        ? existing?.report || null
        : JSON.stringify(meta.report);
    const measures =
      Array.isArray(meta.measures) && meta.measures.length
        ? JSON.stringify(meta.measures)
        : existing?.measures || JSON.stringify(Array.isArray(meta.measures) ? meta.measures : []);
    const emailSent = Boolean(meta.emailSent) || Boolean(existing?.emailSent) ? 1 : 0;
    const createdAt = String(meta.createdAt || existing?.createdAt || new Date().toISOString());
    const firstName = String(meta.firstName || existing?.firstName || '').slice(0, 191);
    const lastName = String(meta.lastName || existing?.lastName || '').slice(0, 191);
    const email = String(meta.email || existing?.email || '').slice(0, 191);
    const gender = String(meta.gender || existing?.gender || '').slice(0, 32);
    const ageGroup = meta.ageGroup === 'child' || existing?.ageGroup === 'child' ? 'child' : 'adult';
    const heightRaw = meta.heightCm == null || meta.heightCm === '' ? existing?.heightCm ?? null : Number(meta.heightCm);
    const heightCm = heightRaw == null || !Number.isFinite(Number(heightRaw)) ? null : Number(heightRaw);
    const ageRaw = meta.childAge == null || meta.childAge === '' ? existing?.childAge ?? null : Number(meta.childAge);
    const childAge = ageRaw == null || !Number.isFinite(Number(ageRaw)) ? null : Number(ageRaw);
    const paymentId = String(meta.paymentId ?? existing?.paymentId ?? '').slice(0, 64);
    const paymentStatus = String(meta.paymentStatus || existing?.paymentStatus || 'open').slice(0, 32);
    const checkout = String(meta.checkout ?? existing?.checkout ?? '');

    await this.prisma.$executeRaw`
      INSERT INTO ModelIntake (
        id, createdAt, firstName, lastName, email, gender, ageGroup, heightCm, childAge,
        paymentId, paymentStatus, checkout, emailSent, measures, report
      ) VALUES (
        ${id}, ${createdAt}, ${firstName}, ${lastName}, ${email}, ${gender}, ${ageGroup},
        ${heightCm}, ${childAge}, ${paymentId}, ${paymentStatus}, ${checkout}, ${emailSent},
        ${measures}, ${report}
      )
      ON DUPLICATE KEY UPDATE
        createdAt = ${createdAt},
        firstName = ${firstName},
        lastName = ${lastName},
        email = ${email},
        gender = ${gender},
        ageGroup = ${ageGroup},
        heightCm = ${heightCm},
        childAge = ${childAge},
        paymentId = ${paymentId},
        paymentStatus = ${paymentStatus},
        checkout = ${checkout},
        emailSent = ${emailSent},
        measures = ${measures},
        report = ${report}
    `;

    for (const file of files || []) {
      if (!SLOTS.includes(file.fieldname as (typeof SLOTS)[number]) || !file.buffer?.length) continue;
      const mime = file.mimetype || 'image/jpeg';
      const data = file.buffer.toString('base64');
      const slot = file.fieldname;
      await this.prisma.$executeRaw`
        INSERT INTO ModelIntakePhoto (intakeId, slot, mime, data)
        VALUES (${id}, ${slot}, ${mime}, ${data})
        ON DUPLICATE KEY UPDATE mime = ${mime}, data = ${data}
      `;
    }
    return { ok: true, id };
  }

  private assertRuntime(header?: string) {
    if (header !== MODEL_INTAKE_RUNTIME_TOKEN) throw new UnauthorizedException();
  }

  private async find(id: string) {
    await this.prisma.ensureModelIntake();
    const rows = await this.prisma.$queryRaw<IntakeRow[]>`
      SELECT id, createdAt, firstName, lastName, email, gender, ageGroup, heightCm, childAge,
             paymentId, paymentStatus, checkout, emailSent, measures, report
      FROM ModelIntake
      WHERE id = ${id}
      LIMIT 1
    `;
    return rows[0] || null;
  }
}
