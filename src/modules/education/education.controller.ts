import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { EducationService } from './education.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { listExamplesSchema, ListExamplesDto } from './dto/examples.dto';

@Controller('education')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CREATOR)
export class EducationController {
  constructor(private education: EducationService) {}

  @Post('courses/list')
  listCourses(@CurrentUser() user: any) {
    return this.education.listCourses(user.id);
  }

  @Post('courses/:courseId/lessons/:lessonId/complete')
  completeLesson(@CurrentUser() user: any, @Param('courseId') courseId: string, @Param('lessonId') lessonId: string) {
    return this.education.completeLesson(user.id, courseId, lessonId);
  }

  @Post('courses/:courseId/certificate/get')
  getCertificate(@CurrentUser() user: any, @Param('courseId') courseId: string) {
    return this.education.getCertificate(user.id, courseId);
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
