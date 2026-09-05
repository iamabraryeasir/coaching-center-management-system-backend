export interface IInstitutionSummary {
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
}

export interface IInstitutionProfile {
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInstitutionStats {
  totalStudents: number;
  totalTeachers: number;
  totalBatches: number;
}

export interface IInstitutionResponse {
  institution: IInstitutionProfile;
  stats?: IInstitutionStats;
}

export interface IUpdateInstitutionInput {
  institutionName?: string;
  institutionAddress?: string;
  institutionPhone?: string;
  institutionEmail?: string;
  adminName?: string;
  adminPhone?: string;
}
