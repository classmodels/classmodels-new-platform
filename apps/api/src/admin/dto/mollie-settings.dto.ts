import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PatchMollieSettingsDto {
  @IsOptional()
  @IsString()
  apiKeyTest?: string;

  @IsOptional()
  @IsString()
  apiKeyLive?: string;

  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  premiumPrice?: number;
}
