import { IsUUID } from 'class-validator';

export class ImpersonateDto {
  @IsUUID('4')
  targetUserId!: string;
}
