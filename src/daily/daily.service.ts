import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';

import { DailyGroup } from './entities/daily-group.entity';
import { DailyRow } from './entities/daily-row.entity';
import dayjs from 'dayjs';

import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Dayjs 설정 (한국 시간)
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Seoul');

@Injectable()
export class DailyService {
  private readonly logger = new Logger(DailyService.name);

  constructor(
    @InjectRepository(DailyGroup)
    private readonly groupRepo: Repository<DailyGroup>,
    @InjectRepository(DailyRow)
    private readonly rowRepo: Repository<DailyRow>,
  ) {}

  // 1. 해당 날짜의 데이터 조회
  async findByDate(date: string) {
    // 날짜 포맷 검증 또는 변환은 컨트롤러나 파이프에서 처리 권장
    return this.groupRepo.find({
      where: { date },
      relations: ['rows'],
      order: { createdAt: 'ASC' }, // 생성 순서대로 정렬
    });
  }

  // 2. 그룹 생성 (오늘 날짜 기준)
  async createGroup(date: string) {
    const newGroup = this.groupRepo.create({
      date,
      title: '',
      t1_label: '항목 1',
      b1_label: '확인',
      rows: [],
    });
    return this.groupRepo.save(newGroup);
  }

  // 3. 그룹 업데이트 (제목, Config, Skip)
  async updateGroup(id: string, data: Partial<DailyGroup>) {
    await this.groupRepo.update(id, data);
    return this.groupRepo.findOne({ where: { id }, relations: ['rows'] });
  }

  // 4. 그룹 삭제
  async deleteGroup(id: string) {
    await this.groupRepo.delete(id);
    return { success: true };
  }

  // 5. 행(Row) 생성
  async createRow(groupId: string) {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new Error('Group not found');

    const row = this.rowRepo.create({
      dailyGroup: group,
      b1: null,
      b2: null,
      disabledCells: [],
    });
    return this.rowRepo.save(row);
  }

  // 6. 행(Row) 업데이트
  async updateRow(id: string, data: Partial<DailyRow>) {
    await this.rowRepo.update(id, data);
    return { success: true };
  }

  // 7. 행(Row) 삭제
  async deleteRow(id: string) {
    await this.rowRepo.delete(id);
    return { success: true };
  }

  // =================================================================
  // [스케줄러] 매일 자정 (한국시간 00:00) 실행
  // =================================================================
  @Cron('0 0 0 * * *', { timeZone: 'Asia/Seoul' })
  async handleMidnightJob() {
    this.logger.log('Executing Daily Midnight Job (KST)...');

    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    // A. 이미 오늘 데이터가 생성되었는지 확인 (중복 방지)
    const exists = await this.groupRepo.count({ where: { date: today } });
    if (exists > 0) {
      this.logger.log('Today data already exists. Skipping generation.');
    } else {
      // B. 어제 데이터 가져오기
      const prevGroups = await this.groupRepo.find({
        where: { date: yesterday },
        relations: ['rows'],
      });

      if (prevGroups.length > 0) {
        // C. 데이터 복제 로직
        for (const prevGroup of prevGroups) {
          // 1. 그룹 복제
          const newGroup = this.groupRepo.create({
            ...prevGroup,
            id: undefined, // ID 새로 생성
            createdAt: undefined,
            updatedAt: undefined,
            date: today, // 날짜는 오늘로
            isSkipped: false, // [중요] 스킵 여부는 초기화(활성 상태로)
            rows: [],
          });
          const savedGroup = await this.groupRepo.save(newGroup);

          // 2. 행(Row) 복제
          if (prevGroup.rows && prevGroup.rows.length > 0) {
            const newRows = prevGroup.rows.map((prevRow) =>
              this.rowRepo.create({
                ...prevRow,
                id: undefined,
                createdAt: undefined,
                updatedAt: undefined,
                dailyGroup: savedGroup,
                // [중요] 체크 값은 초기화 (Null)
                b1: null,
                b2: null,
                // 텍스트(t1~t4)와 잠금상태(disabledCells)는 유지
              }),
            );
            await this.rowRepo.save(newRows);
          }
        }
        this.logger.log(`Created ${prevGroups.length} groups for ${today}.`);
      } else {
        this.logger.log('No previous data found. Starting fresh.');
      }
    }

    // D. 30일 지난 데이터 삭제 (비용 절감)
    const thirtyDaysAgo = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
    const deleteResult = await this.groupRepo.delete({
      date: LessThan(thirtyDaysAgo),
    });
    this.logger.log(`Deleted ${deleteResult.affected} old groups.`);
  }
}
