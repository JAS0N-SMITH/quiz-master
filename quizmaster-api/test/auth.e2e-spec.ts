import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { contains: 'e2e-test' } },
    });
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'e2e-test-student@example.com',
          password: 'password123',
          name: 'E2E Test Student',
          role: 'STUDENT',
        })
        .expect(201);

      expect(response.body.user.email).toBe('e2e-test-student@example.com');
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user.password).toBeUndefined(); // Password not returned
    });

    it('should reject duplicate email', async () => {
      // First registration
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'e2e-test-duplicate@example.com',
        password: 'password123',
        name: 'First User',
      });

      // Duplicate attempt
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'e2e-test-duplicate@example.com',
          password: 'password456',
          name: 'Second User',
        })
        .expect(409);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com' }) // Missing password and name
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'e2e-test-login@example.com',
        password: 'password123',
        name: 'Login Test User',
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'e2e-test-login@example.com',
          password: 'password123',
        })
        .expect(201);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user.email).toBe('e2e-test-login@example.com');
    });

    it('should reject invalid password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'e2e-test-login@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    let token: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'e2e-test-me@example.com',
          password: 'password123',
          name: 'Me Test User',
        });
      token = response.body.accessToken;
    });

    it('should return current user with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.email).toBe('e2e-test-me@example.com');
    });

    it('should reject request without token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
