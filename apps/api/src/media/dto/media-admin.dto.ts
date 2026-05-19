import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class MoveToTrashDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}

export class MoveAssetsFolderDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];

  @IsUUID('4')
  folderId!: string;
}

/** Nieuwe mediamap (slug wordt automatisch afgeleid, uniek). */
export class CreateMediaFolderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;
}

export class UpdateFolderSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  /** 0 = uitschakelen */
  deleteDaysAfterModelDownload?: number;

  @IsOptional()
  @IsBoolean()
  storeUploadsAsWebpOnly?: boolean;

  /** Bezoekers mogen ZIP van deze map via publieke link downloaden. */
  @IsOptional()
  @IsBoolean()
  publicZipDownload?: boolean;
}

export class DownloadAckDto {
  @IsUUID('4')
  assetId!: string;
}
