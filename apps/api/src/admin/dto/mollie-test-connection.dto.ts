import { IsIn } from 'class-validator';

export class MollieTestConnectionDto {
  @IsIn(['test', 'live'])
  mode!: 'test' | 'live';
}
