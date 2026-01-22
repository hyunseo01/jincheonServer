import { Module } from '@nestjs/common';
import { DailyService } from './daily.service';
import { DailyController } from './daily.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyGroup } from './entities/daily-group.entity';
import { DailyRow } from './entities/daily-row.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DailyGroup, DailyRow]),
    ScheduleModule.forRoot(), // 스케줄러 활성화
  ],

  controllers: [DailyController],
  providers: [DailyService],
})
export class DailyModule {}
