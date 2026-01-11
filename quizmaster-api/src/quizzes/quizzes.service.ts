import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';

interface QuizFilters {
  published?: boolean;
  teacherId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: QuizFilters = {}) {
    const { published, teacherId, search, page = 1, limit = 10 } = filters;

    const skip = (page - 1) * limit;
    const where: any = {
      deletedAt: null,
    };

    if (published !== undefined) {
      where.published = published;
    }

    if (teacherId) {
      where.teacherId = teacherId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [quizzes, total] = await Promise.all([
      this.prisma.quiz.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              questions: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
      }),
      this.prisma.quiz.count({ where }),
    ]);

    return {
      data: quizzes.map((quiz) => ({
        ...quiz,
        questionCount: quiz._count.questions,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where: {
        id,
        deletedAt: null,
      },
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
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    return quiz;
  }

  async create(dto: CreateQuizDto, teacherId: string) {
    return this.prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          title: dto.title,
          description: dto.description,
          timeLimit: dto.timeLimit,
          published: dto.published ?? false,
          teacherId,
          questions: {
            create: dto.questions.map((q) => ({
              text: q.text,
              options: q.options,
              correctOption: q.correctOption,
              explanation: q.explanation,
              order: q.order,
            })),
          },
        },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          questions: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      return quiz;
    });
  }

  async update(id: string, dto: UpdateQuizDto, userId: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    if (quiz.teacherId !== userId) {
      throw new ForbiddenException('You can only update your own quizzes');
    }

    if (quiz._count.submissions > 0) {
      throw new ConflictException(
        'Cannot modify a quiz that has existing submissions. Create a new quiz instead.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // If questions are being updated, delete old ones and create new ones
      if (dto.questions) {
        await tx.question.updateMany({
          where: { quizId: id },
          data: { deletedAt: new Date() },
        });
      }

      const updateData: any = {
        title: dto.title,
        description: dto.description,
        timeLimit: dto.timeLimit,
        published: dto.published,
      };

      // Remove undefined values
      Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key],
      );

      const quiz = await tx.quiz.update({
        where: { id },
        data: {
          ...updateData,
          ...(dto.questions && {
            questions: {
              create: dto.questions.map((q) => ({
                text: q.text,
                options: q.options,
                correctOption: q.correctOption,
                explanation: q.explanation,
                order: q.order,
              })),
            },
          }),
        },
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
      });

      return quiz;
    });
  }

  async remove(id: string, userId: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    if (quiz.teacherId !== userId) {
      throw new ForbiddenException('You can only delete your own quizzes');
    }

    return this.prisma.quiz.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
