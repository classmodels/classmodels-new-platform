import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RecordPageViewDto {
  @IsString()
  @MaxLength(191)
  path!: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  referrer?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
