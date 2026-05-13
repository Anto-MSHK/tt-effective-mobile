import 'dotenv/config';

import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin1!Strong';
  const fullName = process.env.SEED_ADMIN_FULL_NAME ?? 'System Administrator';
  const dateOfBirth = new Date(process.env.SEED_ADMIN_DATE_OF_BIRTH ?? '1990-01-01');
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log(`Seed skipped: user with email ${email} already exists`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, rounds);

  await prisma.user.create({
    data: {
      email,
      fullName,
      dateOfBirth,
      passwordHash,
      role: 'admin',
      isActive: true,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Seed: admin user created (${email})`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
