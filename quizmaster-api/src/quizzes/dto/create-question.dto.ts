import {
  IsString,
  IsArray,
  IsInt,
  IsOptional,
  MinLength,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  Max,
} from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  @MinLength(10, { message: 'Question text must be at least 10 characters' })
  text: string;

  @IsArray()
  @ArrayMinSize(4, { message: 'Must have exactly 4 options' })
  @ArrayMaxSize(4, { message: 'Must have exactly 4 options' })
  @IsString({ each: true })
  options: string[];

  @IsInt()
  @Min(0)
  @Max(3)
  correctOption: number;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsInt()
  @Min(0)
  order: number;
}
