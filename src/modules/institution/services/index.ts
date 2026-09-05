import { getInstitutionProfileService } from './get-institution.service';
import { updateInstitutionProfileService } from './update-institution.service';

export const institutionService = Object.freeze({
  getInstitution: getInstitutionProfileService,
  updateInstitution: updateInstitutionProfileService,
});

export { getInstitutionProfileService, updateInstitutionProfileService };
