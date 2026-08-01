import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class PremiumCheckoutDto {
  @IsOptional()
  @IsBoolean()
  recurring?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  returnOrigin?: string;
}
