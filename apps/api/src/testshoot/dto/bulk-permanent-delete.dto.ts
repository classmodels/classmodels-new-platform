import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class BulkPermanentDeleteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @IsUUID('4', { each: true })
  ids!: string[];
}
