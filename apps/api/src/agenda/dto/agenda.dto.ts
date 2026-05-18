import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BookAgendaDto {
  @IsUUID()
  slotId!: string;

  /** Dynamische formuliervelden (fieldKey → waarde), zoals cmap_field_* in WP. */
  @IsObject()
  fields!: Record<string, string>;
}

export class CancelAgendaDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(16)
  token!: string;

  /** Verplicht bij actieve afspraak; niet vereist als de boeking reeds geannuleerd is. */
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  wantsNewAppointment?: boolean;
}

export class ConfirmAttendanceDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(16)
  token!: string;
}

export class AgendaSlotsQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}

export class CreateAgendaSlotDto {
  @IsUUID()
  calendarId!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  slotDate!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;
}

export class AdminBookingsQueryDto {
  @IsOptional()
  @IsString()
  calendarSlug?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class CreateAgendaCalendarDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug: alleen kleine letters, cijfers en koppeltekens',
  })
  slug!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  durationMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  publicBooking?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  restrictToOpenDays?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  defaultDayStartTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  defaultDayEndTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  breakStart?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  breakEnd?: string;

  /** Tussen starttijden op open dagen (min). Leeg = zelfde als duur (geen overlap). */
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(5)
  slotStepMinutes?: number | null;

  /** HH:mm per regel; overschrijft de stap-tijdlijn als niet leeg. */
  @IsOptional()
  @IsString()
  optionalSlotStarts?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  showEndTimeOnPublic?: boolean;

  /** Bit 0=zo … 6=za; 0 = geen auto-sloten. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(127)
  weekdayOpenMask?: number;

  /** Admin planning: tekst op gekleurde blokken. */
  @IsOptional()
  @IsString()
  @IsIn(['white', 'black'])
  planningTextOnColor?: 'white' | 'black';
}

export class UpdateAgendaCalendarDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug: alleen kleine letters, cijfers en koppeltekens',
  })
  slug?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  durationMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  publicBooking?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  restrictToOpenDays?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  defaultDayStartTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  defaultDayEndTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  breakStart?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  breakEnd?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(5)
  slotStepMinutes?: number | null;

  @IsOptional()
  @IsString()
  optionalSlotStarts?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  showEndTimeOnPublic?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(127)
  weekdayOpenMask?: number;

  @IsOptional()
  @IsString()
  @IsIn(['white', 'black'])
  planningTextOnColor?: 'white' | 'black';
}

export class AdminSlotsQueryDto {
  @IsUUID()
  calendarId!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}

export class BulkAgendaSlotsDto {
  @IsUUID()
  calendarId!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fromDate!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  toDate!: string;

  /** Zondag = 0 … zaterdag = 6 (zoals Date.getUTCDay()). */
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays!: number[];

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;
}

export class CreateClosedDayDto {
  @IsUUID()
  calendarId!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  closedDate!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminClosedDaysQueryDto {
  @IsUUID()
  calendarId!: string;
}

export class AdminCalendarMonthQueryDto {
  @IsUUID()
  calendarId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

export class AdminBookingsRangeQueryDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to!: string;

  /** Komma-gescheiden calendar UUIDs. Leeg = alle agenda's. */
  @IsOptional()
  @IsString()
  calendarIds?: string;

  /** Komma-gescheiden statussen (bv. confirmed,ingeschreven,cancelled). Leeg = actieve boekingen (niet geannuleerd). */
  @IsOptional()
  @IsString()
  statuses?: string;
}

export class UpdateAdminBookingDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  firstname?: string;

  @IsOptional()
  @IsString()
  lastname?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsObject()
  fieldsJson?: Record<string, string>;

  @IsOptional()
  @IsUUID()
  calendarId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  slotDate?: string;

  /** Startuur HH:mm */
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,2}:\d{2}$/)
  startTime?: string;

  /** Einduur HH:mm (admin kan afwijken van standaardduur) */
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,2}:\d{2}$/)
  endTime?: string;
}

export class CreateOpenDayDto {
  @IsUUID()
  calendarId!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  openDate!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  repeatYearly?: boolean;
}

export class AdminOpenDaysQueryDto {
  @IsUUID()
  calendarId!: string;
}

/** Handmatige afspraak in de planning (admin). */
export class CreateManualBookingDto {
  @IsUUID()
  calendarId!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  slotDate!: string;

  /** Startuur HH:mm (lokaal volgens opgeslagen slot-datum). */
  @IsString()
  @Matches(/^\d{1,2}:\d{2}$/)
  startTime!: string;

  /** Optioneel einduur HH:mm; anders agenda-duur vanaf start. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,2}:\d{2}$/)
  endTime?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  firstname?: string;

  @IsOptional()
  @IsString()
  lastname?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class BulkDeleteAgendaBookingsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids!: string[];
}

const NOTIFICATION_TRIGGERS = [
  'booking_created',
  'booking_cancelled',
  'booking_confirmed',
  'reminder',
  'followup',
] as const;

const NOTIFICATION_CHANNELS = ['email', 'sms'] as const;

export class CreateAgendaNotificationTemplateDto {
  @IsIn(NOTIFICATION_CHANNELS)
  channel!: (typeof NOTIFICATION_CHANNELS)[number];

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enabled?: boolean;

  @IsIn(NOTIFICATION_TRIGGERS)
  trigger!: (typeof NOTIFICATION_TRIGGERS)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  offsetMinutes?: number;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  @MinLength(1)
  body!: string;

  /** Minstens één agenda; alleen die krijgen dit sjabloon. */
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  calendarSlugs!: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpdateAgendaNotificationTemplateDto {
  @IsOptional()
  @IsIn(NOTIFICATION_CHANNELS)
  channel?: (typeof NOTIFICATION_CHANNELS)[number];

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsIn(NOTIFICATION_TRIGGERS)
  trigger?: (typeof NOTIFICATION_TRIGGERS)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  offsetMinutes?: number;

  @IsOptional()
  @IsString()
  subject?: string | null;

  @IsOptional()
  @IsString()
  body?: string;

  /** Leeg array = nergens; weglaten = ongewijzigd. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  calendarSlugs?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class ReorderAgendaNotificationTemplatesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  orderedIds!: string[];
}

export class UpdateAgendaMessagingSettingsDto {
  @IsOptional()
  @IsString()
  bulksmsUsername?: string | null;

  @IsOptional()
  @IsString()
  bulksmsPassword?: string | null;
}
