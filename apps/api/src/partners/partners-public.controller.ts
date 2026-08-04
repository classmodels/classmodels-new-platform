import { Controller, Get } from '@nestjs/common';
import { PartnersService } from './partners.service';

@Controller('partners')
export class PartnersPublicController {
  constructor(private partners: PartnersService) {}

  @Get()
  list() {
    return this.partners.listPublic();
  }
}
