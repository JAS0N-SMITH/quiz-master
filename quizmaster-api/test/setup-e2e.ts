// Ensure DATABASE_URL exists for Prisma 7 runtime during e2e tests
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5432/quizmaster';
}
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
