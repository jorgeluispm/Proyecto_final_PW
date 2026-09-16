import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

 // ya no se necesita en la integración del front con el backend '/'
  /*
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
    */
}

