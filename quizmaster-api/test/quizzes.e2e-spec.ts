import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Quizzes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let teacherToken: string;
  let studentToken: string;
  let teacherId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Create test users and get tokens
    const teacherResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'e2e-teacher@example.com',
        password: 'password123',
        name: 'E2E Teacher',
        role: 'TEACHER',
      });
    teacherToken = teacherResponse.body.accessToken;
    teacherId = teacherResponse.body.user.id;

    const studentResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'e2e-student@example.com',
        password: 'password123',
        name: 'E2E Student',
        role: 'STUDENT',
      });
    studentToken = studentResponse.body.accessToken;
  });

  describe('GET /quizzes', () => {
    it('should return list of quizzes', async () => {
      const response = await request(app.getHttpServer())
        .get('/quizzes')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toBeDefined();
    });

    it('should filter by published status', async () => {
      const response = await request(app.getHttpServer())
        .get('/quizzes?published=true')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      response.body.data.forEach((quiz: any) => {
        expect(quiz.published).toBe(true);
      });
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/quizzes')
        .expect(401);
    });
  });

  describe('POST /quizzes', () => {
    const createQuizDto = {
      title: 'E2E Test Quiz',
      description: 'A quiz created during E2E testing',
      timeLimit: 30,
      published: false,
      questions: [
        {
          text: 'What is 2 + 2?',
          options: ['3', '4', '5', '6'],
          correctOption: 1,
          explanation: 'Basic arithmetic: 2 + 2 = 4',
          order: 1,
        },
        {
          text: 'What color is the sky on a clear day?',
          options: ['Red', 'Green', 'Blue', 'Yellow'],
          correctOption: 2,
          explanation: 'The sky appears blue due to light scattering.',
          order: 2,
        },
      ],
    };

    it('should create quiz as teacher', async () => {
      const response = await request(app.getHttpServer())
        .post('/quizzes')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(createQuizDto)
        .expect(201);

      expect(response.body.title).toBe(createQuizDto.title);
      expect(response.body.id).toBeDefined();
    });

    it('should reject quiz creation by student', async () => {
      await request(app.getHttpServer())
        .post('/quizzes')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(createQuizDto)
        .expect(403);
    });

    it('should validate quiz data', async () => {
      await request(app.getHttpServer())
        .post('/quizzes')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'AB', // Too short (min 3)
          timeLimit: 200, // Too long (max 180)
          questions: [],
        })
        .expect(400);
    });
  });

  describe('GET /quizzes/:id', () => {
    let quizId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/quizzes')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Test Quiz for GET',
          description: 'Test description',
          timeLimit: 30,
          questions: [
            {
              text: 'Test question?',
              options: ['A', 'B', 'C', 'D'],
              correctOption: 0,
              explanation: 'Test explanation',
              order: 1,
            },
          ],
        })
        .expect(201);
      quizId = response.body.id;
      expect(quizId).toBeDefined();
    });

    it('should return quiz by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.id).toBe(quizId);
      expect(response.body.title).toBe('Test Quiz for GET');
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/quizzes/${quizId}`)
        .expect(401);
    });
  });

  describe('PATCH /quizzes/:id', () => {
    let quizId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/quizzes')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Quiz to Update',
          description: 'Original description',
          timeLimit: 30,
          questions: [
            {
              text: 'What is a test question?',
              options: ['A', 'B', 'C', 'D'],
              correctOption: 0,
              explanation: 'Explanation',
              order: 1,
            },
          ],
        });
      
      if (response.status !== 201) {
        console.error('Quiz creation failed:', response.status, response.body);
      }
      expect(response.status).toBe(201);
      quizId = response.body.id;
      expect(quizId).toBeDefined();
    });

    it('should update quiz as owner', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Updated Quiz Title',
        })
        .expect(200);

      expect(response.body.title).toBe('Updated Quiz Title');
    });

    it('should reject update by non-owner', async () => {
      // Create another teacher
      const otherTeacherResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'e2e-teacher2@example.com',
          password: 'password123',
          name: 'Other Teacher',
          role: 'TEACHER',
        });
      const otherTeacherToken = otherTeacherResponse.body.accessToken;

      // Ensure quizId is set
      expect(quizId).toBeDefined();

      await request(app.getHttpServer())
        .patch(`/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${otherTeacherToken}`)
        .send({
          title: 'Hacked Title',
        })
        .expect(403);
    });

    it('should reject update by student', async () => {
      await request(app.getHttpServer())
        .patch(`/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Student Update',
        })
        .expect(403);
    });
  });

  describe('DELETE /quizzes/:id', () => {
    let quizId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/quizzes')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Quiz to Delete',
          description: 'Will be deleted',
          timeLimit: 30,
          questions: [
            {
              text: 'What is a test question?',
              options: ['A', 'B', 'C', 'D'],
              correctOption: 0,
              explanation: 'Explanation',
              order: 1,
            },
          ],
        });
      
      if (response.status !== 201) {
        console.error('Quiz creation failed:', response.status, response.body);
      }
      expect(response.status).toBe(201);
      quizId = response.body.id;
      expect(quizId).toBeDefined();
    });

    it('should soft delete quiz as owner', async () => {
      await request(app.getHttpServer())
        .delete(`/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      // Quiz should not be found after deletion
      await request(app.getHttpServer())
        .get(`/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);
    });

    it('should reject delete by non-owner', async () => {
      const otherTeacherResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'e2e-teacher3@example.com',
          password: 'password123',
          name: 'Another Teacher',
          role: 'TEACHER',
        });
      const otherTeacherToken = otherTeacherResponse.body.accessToken;

      // Ensure quizId is set
      expect(quizId).toBeDefined();

      await request(app.getHttpServer())
        .delete(`/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${otherTeacherToken}`)
        .expect(403);
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({
      where: { email: { contains: 'e2e-' } },
    });
    await prisma.quiz.deleteMany({
      where: { teacher: { email: { contains: 'e2e-' } } },
    });
    await app.close();
  });
});
