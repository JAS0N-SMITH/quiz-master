import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const prismaMock = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    } as Partial<PrismaService> as PrismaService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array', () => {
      const result = service.findAll();

      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array by default', () => {
      const result = service.findAll();

      expect(result).toEqual([]);
    });
  });
});
