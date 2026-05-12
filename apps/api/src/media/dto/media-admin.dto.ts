import { IsArray, IsBoolean, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class MoveToTrashDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
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
}

export class DownloadAckDto {
  @IsUUID('4')
  assetId!: string;
}
