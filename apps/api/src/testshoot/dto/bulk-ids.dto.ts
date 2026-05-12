import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsUUID } from 'class-validator';

export class BulkIdsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @IsUUID('4', { each: true })
  ids!: string[];
}

export class BulkMailDto extends BulkIdsDto {
  @IsEmail()
  to!: string;
}
