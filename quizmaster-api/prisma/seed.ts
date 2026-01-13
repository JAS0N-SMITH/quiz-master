import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma: PrismaClient = new PrismaClient();

/**
 * Hash password for seed data
 * NOTE: In production, use a strong password from environment variable
 * This default is only for development/demo purposes
 */
async function hashPassword(password: string) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function clearData() {
  await prisma.answer.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.user.deleteMany();
}

async function createUsers() {
  // Use environment variable for seed password, fallback to demo password for development
  // In production, ensure SEED_PASSWORD is set to a strong password
  // This is a seed file for development/demo purposes only - hardcoded password is intentional
  // deepcode ignore HardcodedNonCryptoSecret: This is seed data for development/demo only
  const seedPassword = process.env.SEED_PASSWORD || 'password123';
  const password = await hashPassword(seedPassword);

  const teacher1 = await prisma.user.create({
    data: {
      email: 'teacher1@demo.com',
      name: 'Alice Teacher',
      role: UserRole.TEACHER,
      password,
    },
  });
  const teacher2 = await prisma.user.create({
    data: {
      email: 'teacher2@demo.com',
      name: 'Bob Teacher',
      role: UserRole.TEACHER,
      password,
    },
  });

  const student1 = await prisma.user.create({
    data: {
      email: 'student1@demo.com',
      name: 'Charlie Student',
      role: UserRole.STUDENT,
      password,
    },
  });
  const student2 = await prisma.user.create({
    data: {
      email: 'student2@demo.com',
      name: 'Dana Student',
      role: UserRole.STUDENT,
      password,
    },
  });
  const student3 = await prisma.user.create({
    data: {
      email: 'student3@demo.com',
      name: 'Evan Student',
      role: UserRole.STUDENT,
      password,
    },
  });

  return { teacher1, teacher2, student1, student2, student3 };
}

type QuestionSeed = {
  text: string;
  options: string[];
  correctOption: number;
  explanation: string;
  order: number;
};

function jsBasicsQuestions(): QuestionSeed[] {
  return [
    {
      text: 'Which of the following declares a constant in JavaScript?',
      options: ['var', 'let', 'const', 'static'],
      correctOption: 2,
      explanation: 'Use const for variables that should not be reassigned.',
      order: 1,
    },
    {
      text: 'What is the output of typeof null in JavaScript?',
      options: ['null', 'object', 'undefined', 'string'],
      correctOption: 1,
      explanation: 'typeof null is a historical bug and returns \"object\".',
      order: 2,
    },
    {
      text: 'How do you create an array?',
      options: ['let a = []', 'let a = {}', 'let a = ()', 'let a = <>'],
      correctOption: 0,
      explanation: 'Square brackets denote array literals in JavaScript.',
      order: 3,
    },
    {
      text: 'Which method adds an element to the end of an array?',
      options: ['push', 'pop', 'shift', 'unshift'],
      correctOption: 0,
      explanation: 'push adds to the end; pop removes from the end.',
      order: 4,
    },
    {
      text: 'Which comparison operator checks both value and type?',
      options: ['==', '!=', '===', '=>'],
      correctOption: 2,
      explanation: '=== is strict equality, comparing both type and value.',
      order: 5,
    },
  ];
}

function reactFundamentalsQuestions(): QuestionSeed[] {
  return [
    {
      text: 'What is the purpose of useState in React?',
      options: ['Manage component state', 'Handle side effects', 'Render JSX', 'Define routes'],
      correctOption: 0,
      explanation: 'useState provides state in functional components.',
      order: 1,
    },
    {
      text: 'Which hook is used for side effects?',
      options: ['useMemo', 'useEffect', 'useCallback', 'useRef'],
      correctOption: 1,
      explanation: 'useEffect runs after render and can perform effects.',
      order: 2,
    },
    {
      text: 'What does JSX stand for?',
      options: ['Java Syntax Extension', 'JSON XML', 'JavaScript XML', 'Jest Syntax XML'],
      correctOption: 2,
      explanation: 'JSX is a JavaScript syntax extension resembling XML.',
      order: 3,
    },
    {
      text: 'How do you pass data from parent to child?',
      options: ['Context', 'Props', 'State', 'Events'],
      correctOption: 1,
      explanation: 'Props are used to pass data down the component tree.',
      order: 4,
    },
    {
      text: 'Which tool helps with managing global state?',
      options: ['Axios', 'Zustand', 'React Router', 'Jest'],
      correctOption: 1,
      explanation: 'Zustand is a popular lightweight state management library.',
      order: 5,
    },
  ];
}

async function createQuizzes(teacher1Id: string, teacher2Id: string) {
  const quiz1 = await prisma.quiz.create({
    data: {
      title: 'JavaScript Basics',
      description: 'Fundamental JavaScript concepts and syntax.',
      teacherId: teacher1Id,
      timeLimit: 30,
      published: true,
      questions: {
        create: jsBasicsQuestions().map((q) => ({
          text: q.text,
          options: q.options,
          correctOption: q.correctOption,
          explanation: q.explanation,
          order: q.order,
        })),
      },
    },
    include: { questions: true },
  });

  const quiz2 = await prisma.quiz.create({
    data: {
      title: 'React Fundamentals',
      description: 'Core React hooks and concepts.',
      teacherId: teacher2Id,
      timeLimit: 45,
      published: true,
      questions: {
        create: reactFundamentalsQuestions().map((q) => ({
          text: q.text,
          options: q.options,
          correctOption: q.correctOption,
          explanation: q.explanation,
          order: q.order,
        })),
      },
    },
    include: { questions: true },
  });

  return { quiz1, quiz2 };
}

async function createSubmissionWithAnswers(userId: string, quizId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { questions: true } });
  if (!quiz) throw new Error('Quiz not found');

  const submission = await prisma.submission.create({
    data: {
      userId,
      quizId,
      totalQuestions: quiz.questions.length,
      startedAt: new Date(),
    },
  });

  let score = 0;
  const answersData = quiz.questions.map((q, idx) => {
    // Make half correct deterministically
    const selectedOption = idx % 2 === 0 ? q.correctOption : (q.correctOption + 1) % 4;
    const isCorrect = selectedOption === q.correctOption;
    if (isCorrect) score += 1;
    return {
      submissionId: submission.id,
      questionId: q.id,
      selectedOption,
      isCorrect,
      createdAt: new Date(),
    };
  });

  await prisma.answer.createMany({ data: answersData });
  await prisma.submission.update({
    where: { id: submission.id },
    data: { score, submittedAt: new Date() },
  });

  return submission;
}

async function main() {
  await clearData();

  const { teacher1, teacher2, student1, student2, student3 } = await createUsers();
  const { quiz1, quiz2 } = await createQuizzes(teacher1.id, teacher2.id);

  await createSubmissionWithAnswers(student1.id, quiz1.id);
  await createSubmissionWithAnswers(student2.id, quiz1.id);
  await createSubmissionWithAnswers(student3.id, quiz2.id);
  await createSubmissionWithAnswers(student1.id, quiz2.id);

  console.log('Seed completed: users, quizzes, questions, submissions, answers');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
