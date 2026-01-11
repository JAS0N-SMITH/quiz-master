import { Module } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SubmissionsModule } from '../submissions/submissions.module';

@Module({
  imports: [PrismaModule, SubmissionsModule],
  controllers: [QuizzesController],
  providers: [QuizzesService],
  exports: [QuizzesService],
})
export class QuizzesModule {}
