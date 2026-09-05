import { Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config, prisma } from '../config';
import { logger } from './logger';

export const seedData = async (): Promise<void> => {
  try {
    logger.info('Starting idempotent database seeding check via seedData...');

    // Seed Default Admin with Institution Profile
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [{ email: config.ADMIN_EMAIL }, { phone: config.ADMIN_PHONE }],
      },
      include: {
        adminProfile: true,
      },
    });

    if (!existingAdmin) {
      logger.info(`Seeding Admin account: ${config.ADMIN_EMAIL}`);
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
              institutionName: config.ADMIN_INSTITUTION_NAME,
              institutionAddress: config.ADMIN_INSTITUTION_ADDRESS,
              institutionPhone: config.ADMIN_INSTITUTION_PHONE,
              institutionEmail: config.ADMIN_INSTITUTION_EMAIL,
            },
          },
        },
      });

      logger.info('Admin and Institution Profile seeded successfully.');
    } else {
      logger.info('Admin account already exists. Skipping creation.');

      // Ensure institution profile exists if admin was created without it
      if (!existingAdmin.adminProfile && existingAdmin.role === Role.ADMIN) {
        await prisma.adminProfile.create({
          data: {
            userId: existingAdmin.id,
            institutionName: config.ADMIN_INSTITUTION_NAME,
            institutionAddress: config.ADMIN_INSTITUTION_ADDRESS,
            institutionPhone: config.ADMIN_INSTITUTION_PHONE,
            institutionEmail: config.ADMIN_INSTITUTION_EMAIL,
          },
        });
        logger.info('Attached missing Institution Profile to existing Admin.');
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
