import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(dto: RegisterDto) {
    // TODO: Implement real registration logic
    return { id: 'placeholder', email: dto.email, name: dto.name, role: dto.role ?? 'STUDENT' };
  }

  async login(email: string, password: string) {
    // TODO: Implement real login logic
    const payload = { sub: 'placeholder', email, role: 'STUDENT' };
    const accessToken = await this.jwt.signAsync(payload);
    return { accessToken };
  }
}
