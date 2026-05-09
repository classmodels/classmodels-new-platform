import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PatchProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;
}
