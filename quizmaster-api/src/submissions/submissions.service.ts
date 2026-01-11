import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StartQuizDto } from './dto/start-quiz.dto';
import { SubmitAnswersDto } from './dto/submit-answers.dto';

@Injectable()
export class SubmissionsService {
  constructor(private prisma: PrismaService) {}

  async start(quizId: string, userId: string) {
    // Verify quiz exists and is published
    const quiz = await this.prisma.quiz.findFirst({
      where: {
        id: quizId,
        deletedAt: null,
        published: true,
      },
      include: {
        questions: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found or not published');
    }

    // Check if there's an active submission (not yet submitted)
    const activeSubmission = await this.prisma.submission.findFirst({
      where: {
        userId,
        quizId,
        submittedAt: null,
      },
    });

    if (activeSubmission) {
      throw new BadRequestException(
        'You already have an active submission for this quiz',
      );
    }

    // Create submission
    const submission = await this.prisma.submission.create({
      data: {
        userId,
        quizId,
        totalQuestions: quiz.questions.length,
      },
      include: {
        quiz: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            questions: {
              where: {
                deletedAt: null,
              },
              orderBy: {
                order: 'asc',
              },
              select: {
                id: true,
                text: true,
                options: true,
                order: true,
                explanation: true,
                // Don't include correctOption - students shouldn't see it yet
              },
            },
          },
        },
      },
    });

    return submission;
  }

  async submit(submissionId: string, dto: SubmitAnswersDto, userId: string) {
    // Verify submission belongs to user
    const submission = await this.prisma.submission.findFirst({
      where: {
        id: submissionId,
        userId,
      },
      include: {
        quiz: {
          include: {
            questions: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.submittedAt) {
      throw new BadRequestException('Quiz has already been submitted');
    }

    // Verify all questions are answered
    const questionIds = submission.quiz.questions.map((q) => q.id);
    const answeredQuestionIds = dto.answers.map((a) => a.questionId);

    if (questionIds.length !== answeredQuestionIds.length) {
      throw new BadRequestException('All questions must be answered');
    }

    const allAnswered = questionIds.every((id) =>
      answeredQuestionIds.includes(id),
    );
    if (!allAnswered) {
      throw new BadRequestException('All questions must be answered');
    }

    // Calculate score and create answers
    return this.prisma.$transaction(async (tx) => {
      let score = 0;
      const answersToCreate: Array<{
        submissionId: string;
        questionId: string;
        selectedOption: number;
        isCorrect: boolean;
      }> = [];

      for (const answerDto of dto.answers) {
        const question = submission.quiz.questions.find(
          (q) => q.id === answerDto.questionId,
        );

        if (!question) {
          throw new BadRequestException(
            `Question ${answerDto.questionId} not found in this quiz`,
          );
        }

        // Compare the selected option index with the correct option index
        const correctOptionIndex = question.correctOption;
        const isCorrectAnswer = answerDto.selectedOption === correctOptionIndex;

        if (isCorrectAnswer) {
          score++;
        }

        answersToCreate.push({
          submissionId,
          questionId: answerDto.questionId,
          selectedOption: answerDto.selectedOption,
          isCorrect: isCorrectAnswer,
        });
      }

      // Create all answers
      await tx.answer.createMany({
        data: answersToCreate,
      });

      // Update submission with score
      const updatedSubmission = await tx.submission.update({
        where: { id: submissionId },
        data: {
          score,
          submittedAt: new Date(),
        },
        include: {
          quiz: {
            include: {
              questions: {
                where: {
                  deletedAt: null,
                },
                orderBy: {
                  order: 'asc',
                },
              },
            },
          },
          answers: {
            include: {
              question: true,
            },
            orderBy: {
              question: {
                order: 'asc',
              },
            },
          },
        },
      });

      return updatedSubmission;
    });
  }

  async findUserSubmissions(userId: string, filters: any = {}) {
    const { page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where = {
      userId,
    };

    const [submissions, total] = await Promise.all([
      this.prisma.submission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              description: true,
              timeLimit: true,
              teacher: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.submission.count({ where }),
    ]);

    return {
      data: submissions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string) {
    const submission = await this.prisma.submission.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        quiz: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            questions: {
              where: {
                deletedAt: null,
              },
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
        answers: {
          include: {
            question: true,
          },
          orderBy: {
            question: {
              order: 'asc',
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return submission;
  }

  async findQuizSubmissions(quizId: string, teacherId: string) {
    // Verify teacher owns the quiz
    const quiz = await this.prisma.quiz.findFirst({
      where: {
        id: quizId,
        teacherId,
        deletedAt: null,
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found or you do not have access');
    }

    const submissions = await this.prisma.submission.findMany({
      where: {
        quizId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    return submissions;
  }
}
