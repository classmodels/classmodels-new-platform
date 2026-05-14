import { BriefStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Admin: nieuwe opdracht (casting) — zelfde velden als WP-plugin `meta.php`. */
export class AdminCreateBriefDto {
  @IsUUID()
  clientId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50000)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  extraInfo?: string | null;

  @IsOptional()
  @IsDateString()
  eventDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  startTime?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  endTime?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  wantedMen?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  wantedWomen?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  wantedChildren?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  wantedTeenagers?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageManFrom?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageManTo?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageWomanFrom?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageWomanTo?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageChildFrom?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageChildTo?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageTeenFrom?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageTeenTo?: number | null;

  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(BriefStatus)
  status?: BriefStatus;
}

/** Admin: volledige bewerking van een opdracht. */
export class AdminUpdateBriefDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50000)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  extraInfo?: string | null;

  @IsOptional()
  @IsDateString()
  eventDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  startTime?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  endTime?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  wantedMen?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  wantedWomen?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  wantedChildren?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  wantedTeenagers?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageManFrom?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageManTo?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageWomanFrom?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageWomanTo?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageChildFrom?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageChildTo?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageTeenFrom?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageTeenTo?: number | null;

  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  eligibilityPush?: boolean;

  @IsOptional()
  @IsEnum(BriefStatus)
  status?: BriefStatus;
}
