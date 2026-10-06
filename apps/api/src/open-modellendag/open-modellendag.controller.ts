import { Body, Controller, Post } from '@nestjs/common';
import { OpenModellendagRegisterDto } from './dto/register.dto';
import { OpenModellendagService } from './open-modellendag.service';

@Controller('open-modellendag')
export class OpenModellendagController {
  constructor(private service: OpenModellendagService) {}

  @Post('register')
  register(@Body() dto: OpenModellendagRegisterDto) {
    return this.service.register(dto);
  }
}
