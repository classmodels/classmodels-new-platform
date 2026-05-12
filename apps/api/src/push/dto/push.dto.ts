import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

class PushKeysDto {
  @IsString()
  p256dh!: string;

  @IsString()
  auth!: string;
}

class SubscriptionInnerDto {
  @IsString()
  endpoint!: string;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys!: PushKeysDto;
}

export class SubscribePushDto {
  @ValidateNested()
  @Type(() => SubscriptionInnerDto)
  subscription!: SubscriptionInnerDto;
}

export class UnsubscribePushDto {
  @IsString()
  endpoint!: string;
}

export class PatchModelPushSettingsDto {
  @IsOptional()
  notifyHistoryEvents?: boolean;

  @IsOptional()
  notifyAgencyBroadcasts?: boolean;
}

export class BroadcastPushDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  @IsString()
  @IsIn(['all_models', 'premium', 'non_premium', 'custom_list'])
  audienceKind!: 'all_models' | 'premium' | 'non_premium' | 'custom_list';

  @IsOptional()
  @IsUUID()
  listId?: string;
}

export class CreatePushListDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class PatchPushListDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class AddListMemberDto {
  @IsUUID()
  userId!: string;
}

export class InboxIdsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids!: string[];
}
