import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBulkContactListDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateBulkContactListDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class ImportBulkListEntriesDto {
  /** Ruwe tekst: één e-mail of gsm per regel, of `naam;email;gsm` */
  @IsString()
  @MinLength(1)
  text!: string;
}

export class AddBulkListEntryDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}

export class BulkRecipientSelectionDto {
  @IsString()
  key!: string;

  @IsBoolean()
  include!: boolean;
}

export class BulkCommsPreviewDto {
  @IsIn(['email', 'sms'])
  channel!: 'email' | 'sms';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleSlugs?: string[];

  @IsOptional()
  @IsUUID()
  contactListId?: string;

  /** Bij verzenden: alleen uitgevinkte ontvangers (kleinere payload dan volledige lijst). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedKeys?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkRecipientSelectionDto)
  recipients?: BulkRecipientSelectionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkAdhocRecipientDto)
  adhoc?: BulkAdhocRecipientDto[];
}

export class BulkAdhocRecipientDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}

export class BulkCommsSendDto extends BulkCommsPreviewDto {
  @ValidateIf((o) => o.channel === 'email')
  @IsString()
  @MinLength(1)
  subject?: string;

  @ValidateIf((o) => o.channel === 'email')
  @IsString()
  @MinLength(1)
  htmlBody?: string;

  @ValidateIf((o) => o.channel === 'sms')
  @IsString()
  @MinLength(1)
  smsBody?: string;
}
