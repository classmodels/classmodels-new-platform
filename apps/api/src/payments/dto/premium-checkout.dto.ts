import { IsBoolean, IsOptional } from 'class-validator';

export class PremiumCheckoutDto {
  @IsOptional()
  @IsBoolean()
  recurring?: boolean;
}
