import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export abstract class CoreEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 2. 생성 시간 자동 기록
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  // 3. 수정 시간 자동 기록
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // 4. 소프트 삭제 (데이터는 남기고 숨김 처리)
  // 자식 테이블이 주렁주렁 달렸을 때 안전장치 역할
  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
