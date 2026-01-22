import { Entity, Column, OneToMany } from 'typeorm';
import { CoreEntity } from '../../common/entities/core.entity';
import { DailyRow } from './daily-row.entity';

@Entity()
export class DailyGroup extends CoreEntity {
  // [New] 날짜별 데이터 관리를 위해 추가 (YYYY-MM-DD)
  @Column({ type: 'date' })
  date: string;

  @Column()
  title: string;

  @Column({ default: false })
  isSkipped: boolean; // 그룹 전체 스킵 여부

  // --- Config ---
  @Column({ default: '' })
  t1_label: string;
  @Column({ default: '' })
  t2_label: string;
  @Column({ nullable: true })
  t3_label: string;
  @Column({ nullable: true })
  t4_label: string;
  @Column({ default: '확인' })
  b1_label: string;
  @Column({ nullable: true })
  b2_label: string;

  @OneToMany(() => DailyRow, (row) => row.dailyGroup, { cascade: true })
  rows: DailyRow[];
}
