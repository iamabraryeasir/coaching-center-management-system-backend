export interface IImageUploadResponse {
  url: string;
  publicId: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
}

export interface IAvatarUpdateResponse {
  userId: string;
  avatarUrl: string | null;
  message: string;
}

export interface IInstitutionLogoResponse {
  institutionName: string;
  logoUrl: string | null;
  message: string;
}
