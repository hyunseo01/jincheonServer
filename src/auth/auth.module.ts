import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from './entities/user.entity';
import { Team } from '../group/entities/team.entity';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Team]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => {
        const secret = cs.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET is missing');

        const expiresRaw = cs.get<string>('JWT_EXPIRES_IN') ?? '86400';
        const expiresIn = Number(expiresRaw);
        if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
          throw new Error('JWT_EXPIRES_IN must be a positive number (seconds)');
        }

        return {
          secret,
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
