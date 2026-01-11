import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { StartQuizDto } from './dto/start-quiz.dto';
import { SubmitAnswersDto } from './dto/submit-answers.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post('start')
  start(@Body() startQuizDto: StartQuizDto, @CurrentUser() user: any) {
    return this.submissionsService.start(startQuizDto.quizId, user.id);
  }

  @Post(':id/submit')
  submit(
    @Param('id') id: string,
    @Body() submitAnswersDto: SubmitAnswersDto,
    @CurrentUser() user: any,
  ) {
    return this.submissionsService.submit(id, submitAnswersDto, user.id);
  }

  @Get('my-submissions')
  findUserSubmissions(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    return this.submissionsService.findUserSubmissions(user.id, {
      page,
      limit,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.submissionsService.findOne(id, user.id);
  }
}
