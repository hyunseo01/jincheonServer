import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity'; // 경로 확인 필요

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  // [전체 유저 조회] Team과 Group 정보까지 Join해서 가져옴
  async findAll() {
    return await this.usersRepository.find({
      relations: {
        team: {
          group: true, // team 안의 group까지 연쇄적으로 가져옴
        },
      },
      order: {
        name: 'ASC', // 이름순 정렬
      },
      // select: { password: false } // 엔티티에서 이미 false로 되어있지만 명시적으로 제외 가능
    });
  }

  // [유저 삭제]
  async remove(id: string) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }
    // Soft Delete를 권장하지만, 일단 Hard Delete로 구현
    return await this.usersRepository.remove(user);
  }
}
