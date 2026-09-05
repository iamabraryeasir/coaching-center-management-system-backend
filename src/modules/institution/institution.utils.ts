import type { AdminProfile, User } from '@prisma/client';
import type { IInstitutionProfile } from './institution.interface';

export const formatInstitutionProfile = (
  adminUser: User & { adminProfile: AdminProfile | null },
): IInstitutionProfile => {
  return {
    name: adminUser.adminProfile?.institutionName || 'Radiant Way Academy',
    address: adminUser.adminProfile?.institutionAddress || 'Dhaka, Bangladesh',
    phone: adminUser.adminProfile?.institutionPhone || adminUser.phone,
    email: adminUser.adminProfile?.institutionEmail || adminUser.email,
    adminName: adminUser.name,
    adminEmail: adminUser.email,
    adminPhone: adminUser.phone,
    createdAt: adminUser.adminProfile?.createdAt || adminUser.createdAt,
    updatedAt: adminUser.adminProfile?.updatedAt || adminUser.updatedAt,
  };
};
