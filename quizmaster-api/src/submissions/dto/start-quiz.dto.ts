import { IsUUID } from 'class-validator';

export class StartQuizDto {
  @IsUUID()
  quizId: string;
}
