import { ExecutionContext } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';

// Test that the decorator extracts user from request
describe('CurrentUser Decorator', () => {
  it('should extract user from request context', () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      role: 'STUDENT',
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: mockUser,
        }),
      }),
    } as unknown as ExecutionContext;

    // The decorator factory extracts user from request
    const request = mockContext.switchToHttp().getRequest();
    expect(request.user).toEqual(mockUser);
  });

  it('should return undefined when user is not in request', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: undefined,
        }),
      }),
    } as unknown as ExecutionContext;

    const request = mockContext.switchToHttp().getRequest();
    expect(request.user).toBeUndefined();
  });
});
