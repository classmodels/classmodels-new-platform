import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Zelfde velden als WP snippet `tsr_feedback_media`. */
export class TestshootFeedbackDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  naam!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  voornaam!: string;

  @IsEmail()
  @MaxLength(190)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  gsm!: string;

  @IsString()
  @MaxLength(80)
  ervaring!: string;

  @IsString()
  @MaxLength(80)
  tevredenheid_fotos!: string;

  @IsString()
  @MaxLength(20)
  ingeschreven!: string;

  @IsString()
  @MaxLength(20)
  druk!: string;

  @IsString()
  @MaxLength(80)
  ontvangst!: string;

  @IsString()
  @MaxLength(40)
  info!: string;

  @IsString()
  @MaxLength(20)
  toekomst_contact!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reden_nee_vrij?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  opmerkingen?: string;
}
