import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ListExamplesDto } from './dto/examples.dto';

const CONTENT_STANDARDS = [
  { reasonCode: 'NO_DISCLOSURE', title: 'Disclosure of paid partnerships (#ad)', description: 'All sponsored content must be clearly disclosed.' },
  { reasonCode: 'LOW_RESOLUTION', title: 'Minimum video resolution (1080p)', description: 'Submitted videos must meet brand resolution requirements.' },
  { reasonCode: 'INAPPROPRIATE_CONTENT', title: 'Community guidelines compliance', description: 'Content must comply with platform community guidelines.' },
];

@Injectable()
export class EducationService {
  constructor(private prisma: PrismaService) {}

  private async creatorProfileId(userId: string) {
    const profile = await this.prisma.creatorProfile.findUniqueOrThrow({ where: { userId } });
    return profile.id;
  }

  async listCourses(userId: string) {
    const creatorProfileId = await this.creatorProfileId(userId);
    const [courses, completions] = await Promise.all([
      this.prisma.course.findMany({ orderBy: { order: 'asc' }, include: { lessons: true } }),
      this.prisma.lessonCompletion.findMany({ where: { creatorProfileId } }),
    ]);
    const completedLessonIds = new Set(completions.map((c) => c.lessonId));

    return {
      items: courses.map((course) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        duration: course.duration,
        lessons: course.lessons.length,
        completed: course.lessons.filter((l) => completedLessonIds.has(l.id)).length,
        isLocked: false,
        level: course.level,
        category: course.category,
        certification: course.certification,
      })),
    };
  }

  async completeLesson(userId: string, courseId: string, lessonId: string) {
    const creatorProfileId = await this.creatorProfileId(userId);
    const lesson = await this.prisma.lesson.findFirst({ where: { id: lessonId, courseId } });
    if (!lesson) throw new NotFoundException({ message: 'Lesson not found', code: 'LESSON_NOT_FOUND' });

    await this.prisma.lessonCompletion.upsert({
      where: { lessonId_creatorProfileId: { lessonId, creatorProfileId } },
      create: { lessonId, creatorProfileId },
      update: {},
    });

    const totalLessons = await this.prisma.lesson.count({ where: { courseId } });
    const completedLessons = await this.prisma.lessonCompletion.count({ where: { creatorProfileId, lesson: { courseId } } });

    return { courseId, completedLessons, totalLessons, courseCompleted: totalLessons > 0 && completedLessons === totalLessons };
  }

  async getCertificate(userId: string, courseId: string) {
    const creatorProfileId = await this.creatorProfileId(userId);
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException({ message: 'Course not found', code: 'COURSE_NOT_FOUND' });

    const totalLessons = await this.prisma.lesson.count({ where: { courseId } });
    const completedLessons = await this.prisma.lessonCompletion.count({ where: { creatorProfileId, lesson: { courseId } } });
    if (!course.certification || totalLessons === 0 || completedLessons < totalLessons) {
      throw new BadRequestException({ message: 'Course not yet completed', code: 'COURSE_NOT_COMPLETED' });
    }

    const certificate = await this.prisma.courseCertificate.upsert({
      where: { courseId_creatorProfileId: { courseId, creatorProfileId } },
      create: { courseId, creatorProfileId, certificateUrl: `https://cdn.kreativibe.example/certificates/${courseId}-${creatorProfileId}.pdf` },
      update: {},
    });

    return { certificateUrl: certificate.certificateUrl, issuedAt: certificate.issuedAt };
  }

  async listStandards(userId: string) {
    const creatorProfileId = await this.creatorProfileId(userId);
    const rejections = await this.prisma.rejectionReason.findMany({
      where: { moderationEntry: { content: { creatorProfileId } } },
      select: { reasonCode: true },
    });
    const failedCodes = new Set(rejections.map((r) => r.reasonCode));

    return {
      items: CONTENT_STANDARDS.map((s) => ({ title: s.title, description: s.description, passed: !failedCodes.has(s.reasonCode) })),
    };
  }

  async listExamples(dto: ListExamplesDto) {
    const items = await this.prisma.bestPracticeExample.findMany({
      where: dto.niche ? { niche: dto.niche } : undefined,
    });
    return { items };
  }
}
