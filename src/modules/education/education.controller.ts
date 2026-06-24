import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { EducationService } from './education.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { listExamplesSchema, ListExamplesDto } from './dto/examples.dto';

const completeLessonSchema = z.object({
  courseId: z.string(),
  lessonId: z.string(),
});
type CompleteLessonDto = z.infer<typeof completeLessonSchema>;

const courseIdSchema = z.object({
  courseId: z.string(),
});
type CourseIdDto = z.infer<typeof courseIdSchema>;

@Controller('education')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CREATOR)
export class EducationController {
  constructor(private education: EducationService) {}

  @Post('courses/list')
  listCourses(@CurrentUser() user: any) {
    return this.education.listCourses(user.id);
  }

  @Post('courses/lessons/complete')
  completeLesson(@CurrentUser() user: any, @Body(new ZodValidationPipe(completeLessonSchema)) dto: CompleteLessonDto) {
    return this.education.completeLesson(user.id, dto.courseId, dto.lessonId);
  }

  @Post('courses/certificate/get')
  getCertificate(@CurrentUser() user: any, @Body(new ZodValidationPipe(courseIdSchema)) dto: CourseIdDto) {
    return this.education.getCertificate(user.id, dto.courseId);
  }

  @Post('standards/list')
  listStandards(@CurrentUser() user: any) {
    return this.education.listStandards(user.id);
  }

  @Post('examples/list')
  listExamples(@Body(new ZodValidationPipe(listExamplesSchema)) dto: ListExamplesDto) {
    return this.education.listExamples(dto);
  }
}
