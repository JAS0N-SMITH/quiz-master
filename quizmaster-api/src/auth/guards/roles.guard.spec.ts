import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockExecutionContext = (userRole: string): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-id', email: 'test@example.com', role: userRole },
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should return true when no roles are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const context = createMockExecutionContext('STUDENT');
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when roles array is empty', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const context = createMockExecutionContext('STUDENT');
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has required TEACHER role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['TEACHER']);

      const context = createMockExecutionContext('TEACHER');
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has required ADMIN role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      const context = createMockExecutionContext('ADMIN');
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user role matches one of multiple allowed roles', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['TEACHER', 'ADMIN']);

      const context = createMockExecutionContext('TEACHER');
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false when STUDENT tries to access TEACHER-only route', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['TEACHER']);

      const context = createMockExecutionContext('STUDENT');
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false when STUDENT tries to access ADMIN-only route', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      const context = createMockExecutionContext('STUDENT');
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false when TEACHER tries to access ADMIN-only route', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      const context = createMockExecutionContext('TEACHER');
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should check both handler and class for roles metadata', () => {
      const getAllAndOverrideSpy = jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['TEACHER']);

      const handler = jest.fn();
      const classRef = jest.fn();
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user-id', email: 'test@example.com', role: 'TEACHER' },
          }),
        }),
        getHandler: () => handler,
        getClass: () => classRef,
      } as unknown as ExecutionContext;

      guard.canActivate(context);

      expect(getAllAndOverrideSpy).toHaveBeenCalledWith(ROLES_KEY, [
        handler,
        classRef,
      ]);
    });

    it('should return false when user is not present in request', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['TEACHER']);

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: undefined,
          }),
        }),
        getHandler: () => jest.fn(),
        getClass: () => jest.fn(),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(context);

      // The guard checks `user && requiredRoles.includes(user.role)`
      // When user is undefined, the && short-circuits and returns undefined (falsy)
      expect(result).toBeFalsy();
    });
  });
});
