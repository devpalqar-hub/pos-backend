import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule { }
