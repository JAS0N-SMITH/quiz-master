import { Roles } from './roles.decorator';
import { SetMetadata } from '@nestjs/common';

jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn(),
}));

describe('Roles Decorator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set metadata with single role', () => {
    Roles('TEACHER');

    expect(SetMetadata).toHaveBeenCalledWith('roles', ['TEACHER']);
  });

  it('should set metadata with multiple roles', () => {
    Roles('TEACHER', 'ADMIN');

    expect(SetMetadata).toHaveBeenCalledWith('roles', ['TEACHER', 'ADMIN']);
  });

  it('should set metadata with all roles', () => {
    Roles('STUDENT', 'TEACHER', 'ADMIN');

    expect(SetMetadata).toHaveBeenCalledWith('roles', [
      'STUDENT',
      'TEACHER',
      'ADMIN',
    ]);
  });
});
