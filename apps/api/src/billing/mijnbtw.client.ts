import { Logger } from '@nestjs/common';

const log = new Logger('MijnBtw');

export type MijnBtwPerson = {
  type?: 'PERSON' | 'COMPANY';
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email: string;
  phone?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string;
  vatNumber?: string | null;
};

export type MijnBtwLine = {
  description: string;
  quantity?: number;
  unitPrice: number;
  vatRate?: number;
  unit?: string;
  pricesIncludeVat?: boolean;
};

export type MijnBtwInvoiceRequest = {
  customer: MijnBtwPerson;
  lines: MijnBtwLine[];
  sendEmail?: boolean;
  notes?: string | null;
  externalRef?: string | null;
  brandId?: string | null;
};

function configured(): { baseUrl: string; apiKey: string } | null {
  const baseUrl = (process.env.MIJNBTW_API_URL ?? '').replace(/\/$/, '');
  const apiKey = (process.env.MIJNBTW_API_KEY ?? '').trim();
  if (!baseUrl || !apiKey) return null;
  return { baseUrl, apiKey };
}

export function isMijnBtwConfigured(): boolean {
  return configured() !== null;
}

/**
 * Fire-and-forget create sales invoice in MijnBtw for this company's API key only.
 * Never throws — registration/payment must not fail if billing is down.
 */
export async function pushMijnBtwInvoice(payload: MijnBtwInvoiceRequest): Promise<void> {
  const cfg = configured();
  if (!cfg) {
    log.debug('MijnBtw overgeslagen (MIJNBTW_API_URL / MIJNBTW_API_KEY niet gezet).');
    return;
  }
  if (!payload.lines.length || payload.lines.every((l) => Number(l.unitPrice) <= 0)) {
    log.debug('MijnBtw overgeslagen (geen positief bedrag).');
    return;
  }

  try {
    const res = await fetch(`${cfg.baseUrl}/api/v1/external/invoices`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        sendEmail: payload.sendEmail !== false,
      }),
      signal: AbortSignal.timeout(25_000),
    });
    const json = (await res.json().catch(() => ({}))) as {
      invoiceNumber?: string;
      error?: string;
      emailSent?: boolean;
    };
    if (!res.ok) {
      log.warn(`MijnBtw factuur mislukt (${res.status}): ${json.error ?? res.statusText}`);
      return;
    }
    log.log(
      `MijnBtw factuur ${json.invoiceNumber ?? '?'} aangemaakt` +
        (json.emailSent ? ' + e-mail' : ''),
    );
  } catch (err) {
    log.warn(`MijnBtw call mislukt: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function modelRegisterInvoiceAmount(): number {
  const raw = process.env.MIJNBTW_MODEL_REGISTER_AMOUNT_EUROS;
  if (raw === undefined || raw === '') return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function modelRegisterInvoiceDescription(): string {
  return (
    process.env.MIJNBTW_MODEL_REGISTER_DESCRIPTION?.trim() ||
    'Inschrijving Class-Models (model)'
  );
}

export async function pushMijnBtwInvoiceForUser(params: {
  user: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  };
  description: string;
  amountInclEur: number;
  externalRef: string;
  notes?: string;
  vatRate?: number;
}): Promise<void> {
  const amount = Number(params.amountInclEur);
  if (!Number.isFinite(amount) || amount <= 0) return;
  await pushMijnBtwInvoice({
    customer: {
      type: 'PERSON',
      firstName: params.user.firstName,
      lastName: params.user.lastName,
      email: params.user.email,
      phone: params.user.phone,
    },
    lines: [
      {
        description: params.description,
        quantity: 1,
        unitPrice: amount,
        vatRate: params.vatRate ?? Number(process.env.MIJNBTW_DEFAULT_VAT_RATE ?? 21),
        pricesIncludeVat: true,
      },
    ],
    sendEmail: true,
    externalRef: params.externalRef,
    notes: params.notes ?? null,
  });
}

export type MijnBtwSignupRequest = {
  type?: 'PERSON' | 'COMPANY';
  role?: string | null;
  source?: string;
  externalUserId?: string | null;
  externalRef?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email: string;
  phone?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string;
  vatNumber?: string | null;
  notes?: string | null;
  invoiceAmountIncl?: number | null;
  invoiceDescription?: string | null;
};

/**
 * Fire-and-forget: create pending signup in MijnBtw for approve/reject → Customer.
 */
export async function pushMijnBtwSignupRequest(payload: MijnBtwSignupRequest): Promise<void> {
  const cfg = configured();
  if (!cfg) {
    log.debug('MijnBtw signup overgeslagen (niet geconfigureerd).');
    return;
  }
  if (!payload.email?.trim()) return;

  try {
    const res = await fetch(`${cfg.baseUrl}/api/v1/external/signup-requests`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        source: payload.source ?? 'class-models',
        ...payload,
      }),
      signal: AbortSignal.timeout(25_000),
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
    if (!res.ok) {
      log.warn(`MijnBtw signup mislukt (${res.status}): ${json.error ?? res.statusText}`);
      return;
    }
    log.log(`MijnBtw signup-aanvraag ${json.id ?? '?'} aangemaakt`);
  } catch (err) {
    log.warn(`MijnBtw signup call mislukt: ${err instanceof Error ? err.message : String(err)}`);
  }
}

