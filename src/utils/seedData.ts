import { Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config, prisma } from '../config';
import { logger } from './logger';

export const seedData = async (): Promise<void> => {
  try {
    logger.info('Starting idempotent database seeding check via seedData...');

    // 1. Seed SuperAdmin
    const existingSuperAdmin = await prisma.user.findFirst({
      where: {
        OR: [{ email: config.SUPER_ADMIN_EMAIL }, { role: Role.SUPER_ADMIN }],
      },
    });

    if (!existingSuperAdmin) {
      logger.info(`Seeding SuperAdmin account: ${config.SUPER_ADMIN_EMAIL}`);
      const hashedPassword = await bcrypt.hash(
        config.SUPER_ADMIN_PASSWORD,
        config.BCRYPT_SALT_ROUNDS,
      );

      await prisma.user.create({
        data: {
          name: config.SUPER_ADMIN_NAME,
          email: config.SUPER_ADMIN_EMAIL,
          password: hashedPassword,
          phone: config.SUPER_ADMIN_PHONE,
          role: Role.SUPER_ADMIN,
          status: UserStatus.ACTIVE,
        },
      });

      logger.info('SuperAdmin account seeded successfully.');
    } else {
      logger.info('SuperAdmin account already exists. Skipping creation.');
    }

    // 2. Seed Default Branch Admin with Campus Profile (Admin = Branch)
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [{ email: config.ADMIN_EMAIL }, { phone: config.ADMIN_PHONE }],
      },
      include: {
        adminProfile: true,
      },
    });

    if (!existingAdmin) {
      logger.info(`Seeding Branch Admin account: ${config.ADMIN_EMAIL}`);
      const hashedPassword = await bcrypt.hash(config.ADMIN_PASSWORD, config.BCRYPT_SALT_ROUNDS);

      await prisma.user.create({
        data: {
          name: config.ADMIN_NAME,
          email: config.ADMIN_EMAIL,
          password: hashedPassword,
          phone: config.ADMIN_PHONE,
          role: Role.ADMIN,
          status: UserStatus.ACTIVE,
          adminProfile: {
            create: {
              branchName: config.ADMIN_BRANCH_NAME,
              branchAddress: config.ADMIN_BRANCH_ADDRESS,
              branchPhone: config.ADMIN_BRANCH_PHONE,
            },
          },
        },
      });

      logger.info('Branch Admin and Campus Profile seeded successfully.');
    } else {
      logger.info('Branch Admin account already exists. Skipping creation.');

      // Ensure campus profile exists if admin was created without it
      if (!existingAdmin.adminProfile && existingAdmin.role === Role.ADMIN) {
        await prisma.adminProfile.create({
          data: {
            userId: existingAdmin.id,
            branchName: config.ADMIN_BRANCH_NAME,
            branchAddress: config.ADMIN_BRANCH_ADDRESS,
            branchPhone: config.ADMIN_BRANCH_PHONE,
          },
        });
        logger.info('Attached missing Campus Profile to existing Branch Admin.');
      }
    }

    logger.info('Database seeding completed successfully.');
  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
};

// Allow direct script execution: `npx tsx src/utils/seedData.ts`
const isDirectExecution = process.argv[1]?.replace(/\\/g, '/').includes('seedData.ts');
if (isDirectExecution) {
  seedData()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (error) => {
      logger.error('Direct seed execution failed:', error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
