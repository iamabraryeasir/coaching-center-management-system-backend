import { Role } from '@prisma/client';
import { Router } from 'express';
import { checkAuth, validateRequest } from '../../middlewares';
import * as institutionController from './institution.controller';
import { updateInstitutionSchema } from './institution.validation';

const router = Router();

// Public: Get institution details (branding, contact, stats)
router.get('/', institutionController.getInstitution);

// Admin-only: Update institution profile & contact details
router.patch(
  '/',
  checkAuth(Role.ADMIN),
  validateRequest(updateInstitutionSchema),
  institutionController.updateInstitution,
);

export const institutionRouter = router;
