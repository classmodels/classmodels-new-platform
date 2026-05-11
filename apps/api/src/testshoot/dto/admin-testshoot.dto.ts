import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTestshootModelDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}

export class RenameTestshootModelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}
