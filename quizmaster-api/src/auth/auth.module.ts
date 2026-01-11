import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService): JwtModuleOptions => {
        const secret = config.get<string>('JWT_SECRET');
        const isProduction = config.get<string>('NODE_ENV') === 'production';
        
        if (!secret) {
          if (isProduction) {
            throw new Error(
              'JWT_SECRET environment variable is required in production',
            );
          }
          console.warn(
            'WARNING: JWT_SECRET not set. Using default secret. Set JWT_SECRET in production.',
          );
        } else if (secret === 'dev-secret' && isProduction) {
          throw new Error(
            'JWT_SECRET cannot be "dev-secret" in production. Please set a secure secret.',
          );
        } else if (secret === 'dev-secret') {
          console.warn(
            'WARNING: Using default JWT secret "dev-secret". Set JWT_SECRET in production.',
          );
        }
        
        const expiration = config.get<string>('JWT_EXPIRATION', '7d');
        return {
          secret: secret || 'dev-secret-do-not-use-in-production',
          signOptions: {
            expiresIn: expiration,
          },
        } as JwtModuleOptions;
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
