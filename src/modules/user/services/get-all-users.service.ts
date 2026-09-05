import type { Prisma } from '@prisma/client';
import { prisma } from '../../../config';
import { type IPaginationMeta, QueryBuilder } from '../../../utils';
import type { IUserProfileResponse, IUserQuery } from '../user.interface';
import { fetchInstitutionSummary, formatUserProfile } from '../user.utils';

export interface IGetUsersResult {
  meta: IPaginationMeta;
  data: IUserProfileResponse[];
}

export const getAllUsersService = async (query: IUserQuery = {}): Promise<IGetUsersResult> => {
  const queryBuilder = new QueryBuilder(query as Record<string, unknown>)
    .search([
      'name',
      'email',
      'phone',
      'studentProfile.guardianName',
      'studentProfile.guardianPhone',
      'studentProfile.rollNumber',
      'teacherProfile.designation',
      'teacherProfile.specialization',
    ])
    .filter({ exclude: ['search', 'searchTerm', 'page', 'limit', 'sortBy', 'sortOrder'] })
    .where({ deletedAt: null })
    .sort('createdAt', 'desc')
    .paginate(1, 10, 100);

  const prismaArgs = queryBuilder.build();

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: prismaArgs.where as Prisma.UserWhereInput,
      include: {
        studentProfile: true,
        teacherProfile: true,
        teacherPermissions: true,
        adminProfile: true,
      },
      orderBy: prismaArgs.orderBy as Prisma.UserOrderByWithRelationInput,
      skip: prismaArgs.skip,
      take: prismaArgs.take,
    }),
    prisma.user.count({
      where: prismaArgs.where as Prisma.UserWhereInput,
    }),
  ]);

  const institutionSummary = await fetchInstitutionSummary();

  return {
    meta: queryBuilder.getPaginationMeta(total),
    data: users.map((user) => formatUserProfile(user, institutionSummary)),
  };
};
