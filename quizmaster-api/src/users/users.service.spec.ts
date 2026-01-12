import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
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
