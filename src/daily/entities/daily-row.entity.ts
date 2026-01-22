import { Entity, Column, ManyToOne } from 'typeorm';
import { CoreEntity } from '../../common/entities/core.entity';
import { DailyGroup } from './daily-group.entity';

@Entity()
export class DailyRow extends CoreEntity {
  @Column({ default: '' })
  t1: string;
  @Column({ default: '' })
  t2: string;
  @Column({ default: '' })
  t3: string;
  @Column({ default: '' })
  t4: string;

  // [수정] 프론트엔드 로직 (Null / True / False)에 맞춰 수정
  @Column({ type: 'boolean', nullable: true })
  b1: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  b2: boolean | null;

  // [New] 잠긴 셀 정보를 JSON 배열로 저장 (예: ["b1"])
  @Column({ type: 'simple-json', nullable: true })
  disabledCells: string[];

  @ManyToOne(() => DailyGroup, (group) => group.rows, { onDelete: 'CASCADE' })
  dailyGroup: DailyGroup;
}
