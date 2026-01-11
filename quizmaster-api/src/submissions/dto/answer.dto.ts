import { IsUUID, IsInt, Min, Max } from 'class-validator';

export class AnswerDto {
  @IsUUID()
  questionId: string;

  @IsInt()
  @Min(0)
  @Max(3)
  selectedOption: number;
}
