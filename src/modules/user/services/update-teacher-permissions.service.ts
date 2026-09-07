import { type Permission, Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IUpdateTeacherPermissionsInput, IUserProfileResponse } from '../user.interface';
import { fetchInstitutionSummary, formatUserProfile } from '../user.utils';

export const updateTeacherPermissionsService = async (
  teacherUserId: string,
  adminUserId: string,
  payload: IUpdateTeacherPermissionsInput,
): Promise<IUserProfileResponse> => {
  const targetUser = await prisma.user.findFirst({
    where: { id: teacherUserId, deletedAt: null },
    include: {
      studentProfile: true,
      teacherProfile: true,
      teacherPermissions: true,
      adminProfile: true,
    },
  });

  if (!targetUser) {
    throw ApiError.notFound('Teacher not found');
  }

  if (targetUser.role !== Role.TEACHER) {
    throw ApiError.badRequest('Permissions can only be updated for users with TEACHER role');
  }

  const uniquePermissions = Array.from(new Set(payload.permissions));

  const updatedTeacher = await prisma.$transaction(async (tx) => {
    // 1. Delete all existing permissions
    await tx.teacherPermission.deleteMany({
      where: { teacherId: teacherUserId },
    });

    // 2. Create newly assigned permissions
    if (uniquePermissions.length > 0) {
      await tx.teacherPermission.createMany({
        data: uniquePermissions.map((permission: Permission) => ({
          teacherId: teacherUserId,
          permission,
        })),
      });
    }

    // 3. Fetch refreshed teacher entity
    const user = await tx.user.findUniqueOrThrow({
      where: { id: teacherUserId },
      include: {
        studentProfile: true,
        teacherProfile: true,
        teacherPermissions: true,
        adminProfile: true,
      },
    });

    // 4. Record audit trail
    await tx.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'TEACHER_PERMISSIONS_UPDATED',
        entity: 'User',
        entityId: teacherUserId,
        details: JSON.stringify({
          teacherEmail: targetUser.email,
          previousPermissions: targetUser.teacherPermissions.map((tp) => tp.permission),
          newPermissions: uniquePermissions,
        }),
      },
    });

    return user;
  });

  logger.audit('TEACHER_PERMISSIONS_UPDATED', {
    teacherId: teacherUserId,
    adminId: adminUserId,
    permissionsCount: uniquePermissions.length,
  });

  const institution = await fetchInstitutionSummary();
  return formatUserProfile(updatedTeacher, institution);
};
