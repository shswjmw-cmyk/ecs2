import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import * as jwt from 'jsonwebtoken'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    let token: string | undefined

    // 优先从 Authorization Header 读取
    const authHeader = request.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]
    } else if (request.query.token) {
      // 支持从 URL 参数读取（用于 SSE EventSource）
      token = request.query.token as string
    }

    if (!token) {
      throw new UnauthorizedException('未登录')
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET', 'ecs-dev-secret')
      const decoded = jwt.verify(token, secret)
      request.user = decoded
      return true
    } catch {
      throw new UnauthorizedException('登录已过期')
    }
  }
}