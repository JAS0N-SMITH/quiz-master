import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private toSafeUser(user: User) {
    const { password, ...safe } = user;
    return safe;
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const created = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        name: dto.name,
        role: (dto.role as any) ?? 'STUDENT',
      },
    });

    const payload = { sub: created.id, email: created.email, role: created.role };
    const accessToken = await this.jwt.signAsync(payload);
    return { accessToken, user: this.toSafeUser(created) };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);
    return { accessToken, user: this.toSafeUser(user) };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.toSafeUser(user);
  }
}
