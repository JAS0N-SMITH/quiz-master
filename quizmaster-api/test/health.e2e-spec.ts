import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live should return ok', async () => {
    const res = await request(app.getHttpServer())
      .get('/health/live')
      .expect(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('GET /health should report overall OK and database up', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toHaveProperty('status', 'ok');
    const dbStatus =
      res.body?.info?.database?.status || res.body?.details?.database?.status;
    expect(dbStatus).toBe('up');
  });

  it('GET /health/ready should report OK and database up', async () => {
    const res = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);
    expect(res.body).toHaveProperty('status', 'ok');
    const dbStatus =
      res.body?.info?.database?.status || res.body?.details?.database?.status;
    expect(dbStatus).toBe('up');
  });
});
