import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Body,
  Param,
  // [수정] ParseIntPipe 제거 (UUID는 문자열이므로 숫자 변환 불필요)
} from '@nestjs/common';
import { DailyService } from './daily.service';

@Controller('daily')
export class DailyController {
  constructor(private readonly dailyService: DailyService) {}

  // 날짜별 조회: GET /daily?date=2026-01-22
  @Get()
  getDaily(@Query('date') date: string) {
    if (!date) return []; // 혹은 에러 처리
    return this.dailyService.findByDate(date);
  }

  // 그룹 추가: POST /daily/groups?date=2026-01-22
  @Post('groups')
  createGroup(@Query('date') date: string) {
    return this.dailyService.createGroup(date);
  }

  // 그룹 수정: PATCH /daily/groups/:id
  @Patch('groups/:id')
  // [수정] id: number -> string, ParseIntPipe 제거
  updateGroup(@Param('id') id: string, @Body() body: any) {
    // body에는 title, config, isSkipped 등이 옴
    // rows는 별도 API나 Service에서 처리하지만, 여기선 config/title 위주
    const { rows, ...rest } = body;
    return this.dailyService.updateGroup(id, rest);
  }

  // 그룹 삭제
  @Delete('groups/:id')
  // [수정] id: number -> string, ParseIntPipe 제거
  deleteGroup(@Param('id') id: string) {
    return this.dailyService.deleteGroup(id);
  }

  // 행 추가: POST /daily/groups/:groupId/rows
  @Post('groups/:groupId/rows')
  // [수정] groupId: number -> string, ParseIntPipe 제거
  createRow(@Param('groupId') groupId: string) {
    return this.dailyService.createRow(groupId);
  }

  // 행 수정: PATCH /daily/rows/:id
  @Patch('rows/:id')
  // [수정] id: number -> string, ParseIntPipe 제거
  updateRow(@Param('id') id: string, @Body() body: any) {
    return this.dailyService.updateRow(id, body);
  }

  // 행 삭제
  @Delete('rows/:id')
  // [수정] id: number -> string, ParseIntPipe 제거
  deleteRow(@Param('id') id: string) {
    return this.dailyService.deleteRow(id);
  }
}
