# QuizMaster - System Architecture (Revised)
## Version 1.1

This revision updates the authentication approach from Azure AD B2C to simple JWT authentication for faster development. Azure AD B2C can be added in a production deployment.

---

## 1. High-Level Architecture

### System Overview
```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Next.js 15 App (App Router)                         │   │
│  │  - Server Components (SSR)                           │   │
│  │  - Client Components (Interactive)                   │   │
│  │  - Zustand for auth state                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS/REST + JWT
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  NestJS Backend API                                  │   │
│  │  ├── Controllers (HTTP endpoints)                    │   │
│  │  ├── Services (Business logic)                       │   │
│  │  ├── Guards (JWT Auth, Roles)                        │   │
│  │  ├── DTOs (Data validation)                          │   │
│  │  └── Interceptors (Logging, transformation)          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Prisma ORM
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database                                 │   │
│  │  - Users (with hashed passwords)                     │   │
│  │  - Quizzes, Questions, Submissions, Answers          │   │
│  │  - Indexes, Constraints, Relations                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Pattern
- **Pattern**: Three-tier architecture (Presentation, Application, Data)
- **Communication**: RESTful API with JSON
- **Authentication**: JWT tokens with bcrypt password hashing
- **Data Flow**: Unidirectional (Client → API → Database)

---

## 2. Frontend Architecture (Next.js)

### Application Structure
```
quizmaster-ui/
├── src/
│   ├── app/
│   │   ├── (auth)/                   # Public auth pages
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/              # Protected routes
│   │   │   ├── layout.tsx            # Auth check + navigation
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   ├── quizzes/
│   │   │   │   ├── page.tsx          # Quiz list
│   │   │   │   ├── create/
│   │   │   │   │   └── page.tsx      # Create quiz (teachers)
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Quiz detail
│   │   │   │       ├── take/
│   │   │   │       │   └── page.tsx  # Take quiz
│   │   │   │       └── submissions/
│   │   │   │           └── page.tsx  # View submissions (teachers)
│   │   │   └── results/
│   │   │       └── [id]/
│   │   │           └── page.tsx      # Submission results
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Landing/redirect
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── quiz/
│   │   │   ├── QuizCard.tsx
│   │   │   ├── QuestionItem.tsx
│   │   │   ├── QuestionForm.tsx
│   │   │   └── QuizTimer.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── Sidebar.tsx
│   ├── lib/
│   │   ├── api.ts                    # Axios client with auth interceptor
│   │   └── utils.ts
│   ├── hooks/
│   │   └── useAuth.ts
│   ├── store/
│   │   └── authStore.ts              # Zustand auth state
│   └── types/
│       └── index.ts
```

### Component Strategy

**Server Components (Default)**
- Quiz list page (data fetching)
- Results display
- Static content

**Client Components ("use client")**
- Login/register forms
- Quiz taking interface (timer, state)
- Quiz creation form (dynamic fields)
- Any component using hooks or browser APIs

### State Management

**Auth State (Zustand)**
```typescript
// src/store/authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      
      login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        set({ user: response.data.user, token: response.data.accessToken });
      },
      
      logout: () => {
        set({ user: null, token: null });
      },
      
      loadUser: async () => {
        const token = get().token;
        if (!token) {
          set({ isLoading: false });
          return;
        }
        try {
          const response = await api.get('/auth/me');
          set({ user: response.data, isLoading: false });
        } catch {
          set({ user: null, token: null, isLoading: false });
        }
      },
    }),
    { name: 'auth-storage', partialize: (state) => ({ token: state.token }) }
  )
);
```

**Server State (React Query)**
```typescript
// Quiz list with caching
const { data: quizzes, isLoading } = useQuery({
  queryKey: ['quizzes', { published: true }],
  queryFn: () => api.get('/quizzes?published=true'),
});

// Submission with optimistic updates
const submitMutation = useMutation({
  mutationFn: (answers) => api.post(`/submissions/${id}/submit`, { answers }),
  onSuccess: () => {
    queryClient.invalidateQueries(['submissions']);
  },
});
```

### Authentication Flow (Revised)
```
┌──────────────────┐
│  Login Page      │
│  (email/password)│
└────────┬─────────┘
         │ 1. POST /auth/login
         ▼
┌──────────────────┐
│  NestJS API      │
│  - Validate creds│
│  - Generate JWT  │
└────────┬─────────┘
         │ 2. Return { user, accessToken }
         ▼
┌──────────────────┐
│  Frontend        │
│  - Store token   │
│  - Update state  │
│  - Redirect      │
└────────┬─────────┘
         │ 3. Subsequent requests include
         │    Authorization: Bearer <token>
         ▼
┌──────────────────┐
│  Protected Routes│
│  - JwtAuthGuard  │
│  - User attached │
│    to request    │
└──────────────────┘
```

### API Client Configuration
```typescript
// src/lib/api.ts
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 3. Backend Architecture (NestJS)

### Application Structure
```
quizmaster-api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── register.dto.ts
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   └── users.service.ts
│   ├── quizzes/
│   │   ├── quizzes.module.ts
│   │   ├── quizzes.controller.ts
│   │   ├── quizzes.service.ts
│   │   └── dto/
│   │       ├── create-quiz.dto.ts
│   │       └── update-quiz.dto.ts
│   ├── submissions/
│   │   ├── submissions.module.ts
│   │   ├── submissions.controller.ts
│   │   ├── submissions.service.ts
│   │   └── dto/
│   │       ├── start-quiz.dto.ts
│   │       └── submit-answers.dto.ts
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   └── common/
│       └── filters/
│           └── http-exception.filter.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
└── test/
```

### Auth Module Implementation

**JWT Strategy**
```typescript
// src/auth/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true },
    });
    
    if (!user) {
      throw new UnauthorizedException();
    }
    
    return user;
  }
}
```

**Auth Service**
```typescript
// src/auth/auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: dto.role || 'STUDENT',
      },
      select: { id: true, email: true, name: true, role: true },
    });

    const token = this.generateToken(user);
    
    return { user, accessToken: token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user);
    
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken: token,
    };
  }

  private generateToken(user: { id: string; email: string; role: string }) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }
}
```

**Guards**
```typescript
// src/auth/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// src/auth/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

**Decorators**
```typescript
// src/auth/decorators/roles.decorator.ts
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// src/auth/decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

### Module Pattern Example
```typescript
// src/quizzes/quizzes.controller.ts
@Controller('quizzes')
@UseGuards(JwtAuthGuard)
export class QuizzesController {
  constructor(private quizzesService: QuizzesService) {}

  @Get()
  findAll(@Query() query: QueryDto) {
    return this.quizzesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quizzesService.findOne(id);
  }

  @Post()
  @Roles('TEACHER', 'ADMIN')
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateQuizDto, @CurrentUser() user: User) {
    return this.quizzesService.create(dto, user.id);
  }

  @Put(':id')
  @Roles('TEACHER', 'ADMIN')
  @UseGuards(RolesGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQuizDto,
    @CurrentUser() user: User,
  ) {
    return this.quizzesService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles('TEACHER', 'ADMIN')
  @UseGuards(RolesGuard)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.quizzesService.remove(id, user.id);
  }
}
```

---

## 4. Database Architecture

### ORM: Prisma
- Type-safe database client
- Automatic migrations
- Schema-first approach
- Excellent TypeScript integration

### Key Design Decisions
- UUIDs for primary keys (security, no enumeration)
- Soft deletes for quizzes/questions (deletedAt field)
- Password field with bcrypt hashing (replaces azureId)
- Indexes on foreign keys and query fields

### Relationships
```
User (1) ───< (M) Quiz         # Teacher creates quizzes
Quiz (1) ───< (M) Question     # Quiz has questions
User (1) ───< (M) Submission   # Student submits quizzes
Quiz (1) ───< (M) Submission   # Quiz receives submissions
Submission (1) ───< (M) Answer # Submission contains answers
```

---

## 5. Security Architecture

### Authentication Flow
```
┌─────────────────┐
│ Client (Browser)│
└────────┬────────┘
         │
         │ 1. POST /auth/login { email, password }
         ▼
┌─────────────────┐
│ NestJS API      │
│ AuthService     │
│ - Find user     │
│ - bcrypt.compare│
│ - Generate JWT  │
└────────┬────────┘
         │
         │ 2. Return { user, accessToken }
         ▼
┌─────────────────┐
│ Client          │
│ - Store token   │
│ - Zustand state │
└────────┬────────┘
         │
         │ 3. GET /quizzes
         │    Authorization: Bearer <token>
         ▼
┌─────────────────┐
│ NestJS API      │
│ JwtAuthGuard    │
│ - Extract token │
│ - Verify sig    │
│ - Attach user   │
└─────────────────┘
```

### Security Measures

**1. Password Security**
- Hashed with bcrypt (cost factor 10)
- Never returned in API responses
- Minimum length validation

**2. JWT Security**
- Signed with secret key
- Expiration (7 days default)
- Contains minimal payload (id, email, role)

**3. Input Validation**
- DTOs with class-validator
- Prisma prevents SQL injection
- React prevents XSS

**4. Authorization**
- Role-based guards (STUDENT, TEACHER, ADMIN)
- Resource ownership checks in services
- Quiz editing restricted to owner

**5. Rate Limiting (Optional)**
```typescript
@UseGuards(ThrottlerGuard)
@Throttle(5, 60) // 5 requests per minute
@Post('login')
async login(@Body() dto: LoginDto) {
  return this.authService.login(dto);
}
```

---

## 6. Deployment Architecture

### Development Environment
```
┌─────────────────────────────────────────────────────────┐
│                   Local Machine                          │
│                                                          │
│  ┌─────────────────┐      ┌─────────────────┐          │
│  │ Next.js         │      │ NestJS          │          │
│  │ localhost:3000  │ ──── │ localhost:3001  │          │
│  └─────────────────┘      └────────┬────────┘          │
│                                     │                   │
│                           ┌─────────▼─────────┐        │
│                           │ PostgreSQL        │        │
│                           │ (Docker)          │        │
│                           │ localhost:5432    │        │
│                           └───────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

### Production Environment (Azure)
```
┌────────────────────────────────────────────────────┐
│                  Azure Cloud                        │
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │  Azure Static Web Apps                       │ │
│  │  - Next.js Frontend                          │ │
│  │  - CDN for static assets                     │ │
│  └──────────────────────────────────────────────┘ │
│                      │                             │
│                      │ HTTPS                       │
│                      ▼                             │
│  ┌──────────────────────────────────────────────┐ │
│  │  Azure App Service                           │ │
│  │  - NestJS Backend                            │ │
│  │  - Environment variables                     │ │
│  └──────────────────────────────────────────────┘ │
│                      │                             │
│                      ▼                             │
│  ┌──────────────────────────────────────────────┐ │
│  │  Azure Database for PostgreSQL               │ │
│  │  - Flexible Server                           │ │
│  │  - Automated backups                         │ │
│  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

### Environment Variables

**Backend (.env)**
```
DATABASE_URL="postgresql://user:pass@localhost:5432/quizmaster"
JWT_SECRET="your-secret-key-min-32-chars"
JWT_EXPIRATION="7d"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

**Frontend (.env.local)**
```
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## 7. Technology Decisions

| Technology | Choice | Rationale |
|------------|--------|-----------|
| Frontend Framework | Next.js 15 | App Router, Server Components, TypeScript |
| Backend Framework | NestJS | Modular, TypeScript-first, decorators |
| Database | PostgreSQL | ACID compliance, JSON support, Azure native |
| ORM | Prisma | Type safety, migrations, excellent DX |
| Auth | JWT + bcrypt | Simple, stateless, well-understood |
| Styling | Tailwind + shadcn/ui | Rapid development, consistent design |
| State | Zustand + React Query | Lightweight, server/client separation |

### Why Simple JWT Instead of Azure AD B2C?
- Faster development (saves 2-3 hours)
- Fewer external dependencies
- Easier to debug during development
- Same auth patterns apply (guards, decorators)
- Can migrate to Azure AD B2C later if needed

---

## 8. Future Enhancements

### Authentication Upgrade Path
If Azure AD B2C is required for production:
1. Add `@azure/msal-node` to backend
2. Create Azure AD B2C tenant and app registration
3. Implement token validation in JWT strategy
4. Update frontend to use MSAL.js or NextAuth with Azure provider
5. Keep local auth as fallback for development

### Other Future Features
- WebSocket for real-time quiz updates
- Redis caching for leaderboards
- File uploads for quiz images
- Email notifications
- Advanced analytics with charts

---

## Summary

This architecture provides:
- Fast development with simple JWT auth
- Clear separation of concerns
- Type safety throughout
- Easy testing and debugging
- Upgrade path to enterprise auth
- Production-ready patterns
