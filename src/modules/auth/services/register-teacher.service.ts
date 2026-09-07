import { type Permission, Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { parseISO } from 'date-fns';
import { config, prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type {
  IAuthUser,
  IClientMetadata,
  IInstitutionSummary,
  IRegisterTeacherInput,
} from '../auth.interface';
import { sanitizeAuthUser } from '../auth.utils';

/**
 * Validates uniqueness of teacher email and phone numbers
 */
const validateUniqueTeacherCredentials = async (email: string, phone: string): Promise<void> => {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { phone }],
      deletedAt: null,
    },
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw ApiError.conflict('An account with this email address already exists');
    }
    if (existingUser.phone === phone) {
      throw ApiError.conflict('An account with this phone number already exists');
    }
  }
};

/**
 * Registers a new Teacher account under the institution (Admin-only action)
 */
export const registerTeacherAccount = async (
  payload: IRegisterTeacherInput,
  metadata?: IClientMetadata,
): Promise<{ user: IAuthUser }> => {
  const normalizedEmail = payload.email.toLowerCase().trim();
  const normalizedPhone = payload.phone.trim();

  await validateUniqueTeacherCredentials(normalizedEmail, normalizedPhone);

  const hashedPassword = await bcrypt.hash(payload.password, config.BCRYPT_SALT_ROUNDS);

  // Execute atomic interactive transaction
  const newTeacher = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: payload.name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: normalizedPhone,
        gender: payload.gender || null,
        role: Role.TEACHER,
        status: UserStatus.ACTIVE,
        teacherProfile: {
          create: {
            designation: payload.designation.trim(),
            qualification: payload.qualification.trim(),
            specialization: payload.specialization.trim(),
            ...(payload.joiningDate ? { joiningDate: parseISO(payload.joiningDate) } : {}),
          },
        },
        ...(payload.permissions && payload.permissions.length > 0
          ? {
              teacherPermissions: {
                create: payload.permissions.map((perm: Permission) => ({
                  permission: perm,
                })),
              },
            }
          : {}),
      },
      include: {
        teacherProfile: true,
        teacherPermissions: true,
      },
    });

    // Record audit trail for teacher registration
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'TEACHER_REGISTERED',
        entity: 'User',
        entityId: user.id,
        details: JSON.stringify({
          email: user.email,
          designation: payload.designation,
          permissions: payload.permissions || [],
        }),
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      },
    });

    return user;
  });

  logger.audit('TEACHER_REGISTERED', {
    teacherId: newTeacher.id,
    teacherEmail: newTeacher.email,
  });

  let institutionSummary: IInstitutionSummary | null = null;
  const adminUser = await prisma.user.findFirst({
    where: { role: Role.ADMIN, deletedAt: null },
    include: { adminProfile: true },
  });
  if (adminUser?.adminProfile) {
    institutionSummary = {
      name: adminUser.adminProfile.institutionName,
      address: adminUser.adminProfile.institutionAddress,
      phone: adminUser.adminProfile.institutionPhone,
      email: adminUser.adminProfile.institutionEmail,
    };
  }

  return {
    user: sanitizeAuthUser(newTeacher, institutionSummary),
  };
};
