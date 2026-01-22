import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // [1] 이거 추가
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from './entities/user.entity';
import { Team } from '../group/entities/team.entity'; // [2] User 엔티티 import

@Module({
  imports: [TypeOrmModule.forFeature([User, Team])],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
