import { IsEmail, IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { OPEN_MODELLENDAG_SLOTS } from '../open-modellendag.constants';

export class OpenModellendagRegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(40)
  phone!: string;

  @Type(() => Number)
  @IsInt()
  @Min(6)
  @Max(99)
  age!: number;

  @IsString()
  @IsIn([...OPEN_MODELLENDAG_SLOTS])
  timeSlot!: string;
}
