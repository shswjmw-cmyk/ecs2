import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { User } from './entities/user.entity'
import { LoginDto, RegisterDto } from './dto/auth.dto'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userRepo.findOne({ where: { username: dto.username } })
    if (exists) {
      throw new BadRequestException('用户名已存在')
    }
    const hashedPassword = await bcrypt.hash(dto.password, 10)
    const user = this.userRepo.create({
      username: dto.username,
      password: hashedPassword,
      displayName: dto.displayName || dto.username,
    })
    await this.userRepo.save(user)
    return this.generateToken(user)
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { username: dto.username } })
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误')
    }
    const valid = await bcrypt.compare(dto.password, user.password)
    if (!valid) {
      throw new UnauthorizedException('用户名或密码错误')
    }
    return this.generateToken(user)
  }

  async getProfile(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException('用户不存在')
    }
    const { password, ...result } = user
    return result
  }

  private generateToken(user: User) {
    const secret = this.configService.get<string>('JWT_SECRET', 'ecs-dev-secret')
    const token = jwt.sign({ userId: user.id, username: user.username }, secret, { expiresIn: '7d' })
    const { password, ...userInfo } = user
    return { token, user: userInfo }
  }
}