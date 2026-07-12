import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const countries = [
    { id: 'KE', name: 'Kenya', currency: 'KES', currencySymbol: 'Ksh', isActive: true },
    { id: 'UG', name: 'Uganda', currency: 'UGX', currencySymbol: 'USh', isActive: true },
    { id: 'TZ', name: 'Tanzania', currency: 'TZS', currencySymbol: 'TSh', isActive: true },
    { id: 'NG', name: 'Nigeria', currency: 'NGN', currencySymbol: '₦', isActive: true },
    { id: 'GH', name: 'Ghana', currency: 'GHS', currencySymbol: '₵', isActive: true },
    { id: 'ZA', name: 'South Africa', currency: 'ZAR', currencySymbol: 'R', isActive: true },
  ];

  for (const country of countries) {
    await prisma.country.upsert({
      where: { id: country.id },
      update: country,
      create: country,
    });
  }

  console.log(`Seeded ${countries.length} countries.`);

  const courses = [
    {
      title: 'Mastering Instagram Reels',
      description: 'Learn the fundamentals of high-engagement Reels.',
      duration: '45 min',
      level: 'BEGINNER',
      category: 'CONTENT_CREATION',
      certification: true,
      order: 1,
      lessons: ['Hook viewers in the first 3 seconds', 'Trending audio and pacing', 'Editing for retention', 'Captions and hashtags', 'Posting cadence', 'Analyzing your Reels insights'],
    },
    {
      title: 'Pricing Your Content Like a Pro',
      description: 'Set rates that reflect your reach and negotiate confidently with brands.',
      duration: '30 min',
      level: 'INTERMEDIATE',
      category: 'BUSINESS',
      certification: true,
      order: 2,
      lessons: ['Understanding CPM and engagement rate', 'Building a rate card', 'Negotiating with brands'],
    },
    {
      title: 'Disclosure & Compliance Essentials',
      description: 'Stay compliant with platform and advertising disclosure rules.',
      duration: '20 min',
      level: 'BEGINNER',
      category: 'COMPLIANCE',
      certification: false,
      order: 3,
      lessons: ['Why disclosure matters', 'How to disclose on each platform'],
    },
  ];

  for (const courseData of courses) {
    const { lessons, ...course } = courseData;
    const existing = await prisma.course.findFirst({ where: { title: course.title } });
    const created = existing
      ? await prisma.course.update({ where: { id: existing.id }, data: course })
      : await prisma.course.create({ data: course });

    for (const [i, title] of lessons.entries()) {
      const existingLesson = await prisma.lesson.findFirst({ where: { courseId: created.id, title } });
      if (!existingLesson) {
        await prisma.lesson.create({ data: { courseId: created.id, title, order: i + 1 } });
      }
    }
  }
  console.log(`Seeded ${courses.length} courses.`);

  const examples = [
    { title: 'Glow-up Routine', creator: 'Jane K.', platform: 'TIKTOK', views: 1200000, engagement: 9.4, niche: 'beauty' },
    { title: 'Unboxing Haul', creator: 'Mike O.', platform: 'INSTAGRAM', views: 450000, engagement: 6.1, niche: 'fashion' },
    { title: 'Quick Recipe Reel', creator: 'Aisha N.', platform: 'INSTAGRAM', views: 980000, engagement: 8.7, niche: 'food' },
    { title: 'Tech Review Short', creator: 'Brian K.', platform: 'YOUTUBE', views: 320000, engagement: 5.4, niche: 'tech' },
  ];

  for (const example of examples) {
    const existing = await prisma.bestPracticeExample.findFirst({ where: { title: example.title } });
    if (!existing) {
      await prisma.bestPracticeExample.create({ data: example as any });
    }
  }
  console.log(`Seeded ${examples.length} best-practice examples.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
