import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from '../auth.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: AuthService;

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'STUDENT',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-jwt-secret'),
          },
        },
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    authService = module.get<AuthService>(AuthService);
  });

  describe('validate', () => {
    it('should return user when valid payload and user exists', async () => {
      const payload = {
        sub: 'user-id',
        email: 'test@example.com',
        role: 'STUDENT',
      };

      (authService.validateUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual(mockUser);
      expect(authService.validateUser).toHaveBeenCalledWith(payload.sub);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const payload = {
        sub: 'nonexistent-id',
        email: 'test@example.com',
        role: 'STUDENT',
      };

      (authService.validateUser as jest.Mock).mockRejectedValue(
        new UnauthorizedException(),
      );

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is deleted', async () => {
      const payload = {
        sub: 'deleted-user-id',
        email: 'test@example.com',
        role: 'STUDENT',
      };

      (authService.validateUser as jest.Mock).mockRejectedValue(
        new UnauthorizedException(),
      );

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
