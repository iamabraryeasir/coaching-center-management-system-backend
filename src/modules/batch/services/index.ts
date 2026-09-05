import { adminEnrollStudentService } from './admin-enroll-student.service';
import { approveEnrollmentService } from './approve-enrollment.service';
import { createBatchService } from './create-batch.service';
import { deleteBatchService } from './delete-batch.service';
import { getAllBatchesService } from './get-all-batches.service';
import { getBatchByIdService } from './get-batch-by-id.service';
import { getBatchStudentsService } from './get-batch-students.service';
import { getMyEnrolledBatchesService } from './get-my-enrolled-batches.service';
import { getPendingEnrollmentsService } from './get-pending-enrollments.service';
import { rejectEnrollmentService } from './reject-enrollment.service';
import { removeStudentFromBatchService } from './remove-student-from-batch.service';
import { studentEnrollService } from './student-enroll.service';
import { updateBatchService } from './update-batch.service';

export const batchService = Object.freeze({
  createBatch: createBatchService,
  getAllBatches: getAllBatchesService,
  getBatchById: getBatchByIdService,
  updateBatch: updateBatchService,
  deleteBatch: deleteBatchService,
  studentEnroll: studentEnrollService,
  adminEnrollStudent: adminEnrollStudentService,
  getPendingEnrollments: getPendingEnrollmentsService,
  approveEnrollment: approveEnrollmentService,
  rejectEnrollment: rejectEnrollmentService,
  getBatchStudents: getBatchStudentsService,
  removeStudentFromBatch: removeStudentFromBatchService,
  getMyEnrolledBatches: getMyEnrolledBatchesService,
});

export {
  adminEnrollStudentService,
  approveEnrollmentService,
  createBatchService,
  deleteBatchService,
  getAllBatchesService,
  getBatchByIdService,
  getBatchStudentsService,
  getMyEnrolledBatchesService,
  getPendingEnrollmentsService,
  rejectEnrollmentService,
  removeStudentFromBatchService,
  studentEnrollService,
  updateBatchService,
};
