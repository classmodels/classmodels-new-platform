import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateReviewAdminDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsString()
  authorName?: string;

  @IsOptional()
  @IsInt()
  rating?: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  approved?: boolean;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

export class UpdateReviewAdminDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  authorName?: string | null;

  @IsOptional()
  @IsInt()
  rating?: number | null;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  approved?: boolean;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}
