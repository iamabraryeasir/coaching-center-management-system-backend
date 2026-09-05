import { bulkMarksEntryService } from './bulk-marks-entry.service';
import { createExamService } from './create-exam.service';
import { deleteExamService } from './delete-exam.service';
import { getExamByIdService } from './get-exam-by-id.service';
import { getExamResultsService } from './get-exam-results.service';
import { getExamsService } from './get-exams.service';
import { getMyExamResultsService } from './get-my-exam-results.service';
import { getMySingleExamResultService } from './get-my-single-exam-result.service';
import { publishExamResultsService } from './publish-exam-results.service';
import { unpublishExamResultsService } from './unpublish-exam-results.service';
import { updateExamService } from './update-exam.service';
import { updateStudentMarkService } from './update-student-mark.service';

export const examService = Object.freeze({
  createExam: createExamService,
  getExams: getExamsService,
  getExamById: getExamByIdService,
  updateExam: updateExamService,
  deleteExam: deleteExamService,
  bulkMarksEntry: bulkMarksEntryService,
  updateStudentMark: updateStudentMarkService,
  publishExamResults: publishExamResultsService,
  unpublishExamResults: unpublishExamResultsService,
  getExamResults: getExamResultsService,
  getMyExamResults: getMyExamResultsService,
  getMySingleExamResult: getMySingleExamResultService,
});

export {
  bulkMarksEntryService,
  createExamService,
  deleteExamService,
  getExamByIdService,
  getExamResultsService,
  getExamsService,
  getMyExamResultsService,
  getMySingleExamResultService,
  publishExamResultsService,
  unpublishExamResultsService,
  updateExamService,
  updateStudentMarkService,
};
