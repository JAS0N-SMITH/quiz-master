import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        role: 'STUDENT',
      };

      const expectedResult = {
        user: {
          id: 'user-id',
          email: registerDto.email,
          name: registerDto.name,
          role: registerDto.role,
        },
        accessToken: 'jwt-token',
      };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(result).toEqual(expectedResult);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(authService.register).toHaveBeenCalledTimes(1);
    });

    it('should register a teacher', async () => {
      const registerDto: RegisterDto = {
        email: 'teacher@example.com',
        password: 'password123',
        name: 'Teacher User',
        role: 'TEACHER',
      };

      const expectedResult = {
        user: {
          id: 'teacher-id',
          email: registerDto.email,
          name: registerDto.name,
          role: 'TEACHER',
        },
        accessToken: 'jwt-token',
      };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(result.user.role).toBe('TEACHER');
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'user@example.com',
        password: 'password123',
      };

      const expectedResult = {
        user: {
          id: 'user-id',
          email: loginDto.email,
          name: 'Test User',
          role: 'STUDENT',
        },
        accessToken: 'jwt-token',
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(result).toEqual(expectedResult);
      expect(authService.login).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(authService.login).toHaveBeenCalledTimes(1);
    });
  });

  describe('me', () => {
    it('should return current user from request', () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User',
        role: 'STUDENT',
      };

      const result = controller.me(mockUser);

      expect(result).toEqual(mockUser);
    });
  });
});
