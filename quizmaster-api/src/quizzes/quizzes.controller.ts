import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SubmissionsService } from '../submissions/submissions.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { QuizzesService } from './quizzes.service';

@Controller('quizzes')
@UseGuards(JwtAuthGuard)
export class QuizzesController {
  constructor(
    private readonly quizzesService: QuizzesService,
    private readonly submissionsService: SubmissionsService,
  ) {}

  @Get()
  findAll(
    @Query('published') published?: string,
    @Query('teacherId') teacherId?: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    const filters: any = {
      page,
      limit,
    };

    if (published !== undefined) {
      filters.published = published === 'true';
    }

    if (teacherId) {
      filters.teacherId = teacherId;
    }

    if (search) {
      filters.search = search;
    }

    return this.quizzesService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quizzesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  create(@Body() createQuizDto: CreateQuizDto, @CurrentUser() user: any) {
    return this.quizzesService.create(createQuizDto, user.id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  update(
    @Param('id') id: string,
    @Body() updateQuizDto: UpdateQuizDto,
    @CurrentUser() user: any,
  ) {
    return this.quizzesService.update(id, updateQuizDto, user.id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  patch(
    @Param('id') id: string,
    @Body() updateQuizDto: UpdateQuizDto,
    @CurrentUser() user: any,
  ) {
    return this.quizzesService.update(id, updateQuizDto, user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.quizzesService.remove(id, user.id);
  }

  @Get(':id/submissions')
  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  findQuizSubmissions(@Param('id') id: string, @CurrentUser() user: any) {
    return this.submissionsService.findQuizSubmissions(id, user.id);
  }
}
