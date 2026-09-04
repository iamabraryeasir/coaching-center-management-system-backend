import { Role, UserStatus } from '@prisma/client';
import { prisma } from '../../../config';
import type { IBranchSummary } from '../auth.interface';

/**
 * Retrieves list of active coaching center branches for public student registration and onboarding
 */
export const getPublicBranches = async (): Promise<IBranchSummary[]> => {
  const branchAdmins = await prisma.user.findMany({
    where: {
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      deletedAt: null,
    },
    include: {
      adminProfile: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return branchAdmins
    .filter((admin) => admin.adminProfile !== null)
    .map((admin) => ({
      id: admin.id,
      branchName: admin.adminProfile?.branchName ?? 'Main Branch',
      branchAddress: admin.adminProfile?.branchAddress ?? 'Main Campus',
      branchPhone: admin.adminProfile?.branchPhone ?? null,
    }));
};
