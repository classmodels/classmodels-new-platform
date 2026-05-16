import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
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
