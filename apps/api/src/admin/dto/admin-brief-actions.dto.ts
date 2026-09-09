import { IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class BriefPushSelectedDto {
  @IsArray()
  @IsUUID('4', { each: true })
  userIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  body?: string | null;
}

export class BriefEmailContractPdfDto {
  @IsArray()
  @IsUUID('4', { each: true })
  userIds!: string[];
}

export class BriefCustomModelMailDto {
  @IsUUID()
  modelUserId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body!: string;
}

export class BriefSelfTestMailDto {
  @IsIn(['submitted', 'accepted', 'declined', 'custom'])
  kind!: 'submitted' | 'accepted' | 'declined' | 'custom';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  body?: string;
}
