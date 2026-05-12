import { Controller, Get } from '@nestjs/common';
import { WebPushDeliveryService } from './webpush-delivery.service';

@Controller('push')
export class PushPublicController {
  constructor(private readonly webPush: WebPushDeliveryService) {}

  /** Publieke VAPID-sleutel voor `pushManager.subscribe` in de browser. */
  @Get('vapid-public-key')
  vapidPublicKey() {
    return { publicKey: this.webPush.getPublicKey() };
  }
}
