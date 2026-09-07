import { type Prisma, Role, UserStatus } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, type IPaginationMeta, logger, QueryBuilder } from '../../../utils';
import type {
  IAuthUser,
  IInstitutionSummary,
  IPendingStudentItem,
  IPendingStudentQuery,
} from '../auth.interface';
import { sanitizeAuthUser } from '../auth.utils';

export interface IPendingStudentsResult {
  meta: IPaginationMeta;
  data: IPendingStudentItem[];
}

/**
 * Retrieves paginated list of students awaiting approval in the institution
 */
export const getPendingStudentsService = async (
  query: IPendingStudentQuery = {},
): Promise<IPendingStudentsResult> => {
  const queryBuilder = new QueryBuilder(query as Record<string, unknown>)
    .search([
      'name',
      'email',
      'phone',
      'studentProfile.guardianName',
      'studentProfile.guardianPhone',
      'studentProfile.classLevel',
      'studentProfile.rollNumber',
    ])
    .filter()
    .where({
      role: Role.STUDENT,
      status: UserStatus.PENDING_ACTIVATION,
      deletedAt: null,
    })
    .sort('createdAt', 'desc')
    .paginate(1, 10, 100);

  const prismaArgs = queryBuilder.build();

  const [students, total] = await Promise.all([
    prisma.user.findMany({
      where: prismaArgs.where as Prisma.UserWhereInput,
      include: {
        studentProfile: true,
      },
      orderBy: prismaArgs.orderBy as Prisma.UserOrderByWithRelationInput,
      skip: prismaArgs.skip,
      take: prismaArgs.take,
    }),
    prisma.user.count({
      where: prismaArgs.where as Prisma.UserWhereInput,
    }),
  ]);

  const sanitizedData: IPendingStudentItem[] = students.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    gender: s.gender,
    avatarUrl: s.avatarUrl,
    status: s.status,
    createdAt: s.createdAt,
    studentProfile: s.studentProfile
      ? {
          id: s.studentProfile.id,
          guardianName: s.studentProfile.guardianName,
          guardianPhone: s.studentProfile.guardianPhone,
          institutionName: s.studentProfile.institutionName,
          classLevel: s.studentProfile.classLevel,
          rollNumber: s.studentProfile.rollNumber,
        }
      : null,
  }));

  return {
    meta: queryBuilder.getPaginationMeta(total),
    data: sanitizedData,
  };
};

/**
 * Approves a pending student application and activates their account
 */
export const approveStudentService = async (
  studentId: string,
  reviewerEmail = 'admin',
): Promise<IAuthUser> => {
  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: Role.STUDENT,
      deletedAt: null,
    },
    include: {
      studentProfile: true,
    },
  });

  if (!student) {
    throw ApiError.notFound('Pending student was not found');
  }

  if (student.status !== UserStatus.PENDING_ACTIVATION) {
    throw ApiError.badRequest(`Cannot approve student with current status: ${student.status}`);
  }

  const updatedStudent = await prisma.user.update({
    where: { id: student.id },
    data: {
      status: UserStatus.ACTIVE,
    },
    include: {
      studentProfile: true,
    },
  });

  logger.audit('STUDENT_APPROVED', {
    studentId: updatedStudent.id,
    studentEmail: updatedStudent.email,
    studentName: updatedStudent.name,
    approvedBy: reviewerEmail,
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

  return sanitizeAuthUser(updatedStudent, institutionSummary);
};

/**
 * Rejects a pending student application and archives their account
 */
export const rejectStudentService = async (
  studentId: string,
  reviewerEmail = 'admin',
): Promise<{ message: string }> => {
  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: Role.STUDENT,
      deletedAt: null,
    },
  });

  if (!student) {
    throw ApiError.notFound('Pending student was not found');
  }

  if (student.status !== UserStatus.PENDING_ACTIVATION) {
    throw ApiError.badRequest(`Cannot reject student with status: ${student.status}`);
  }

  await prisma.user.update({
    where: { id: student.id },
    data: {
      status: UserStatus.INACTIVE,
      deletedAt: new Date(),
    },
  });

  logger.audit('STUDENT_REJECTED', {
    studentId: student.id,
    studentEmail: student.email,
    studentName: student.name,
    rejectedBy: reviewerEmail,
  });

  return { message: 'Student application has been rejected and archived' };
};
