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
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
