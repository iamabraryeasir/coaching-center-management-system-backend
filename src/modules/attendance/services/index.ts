import { getBatchAttendanceService } from './get-batch-attendance.service';
import { getMyAttendanceService } from './get-my-attendance.service';
import { getMyTeacherAttendanceService } from './get-my-teacher-attendance.service';
import { getStudentAttendanceService } from './get-student-attendance.service';
import { getTeacherAttendanceService } from './get-teacher-attendance.service';
import { getTeacherAttendanceSummaryService } from './get-teacher-attendance-summary.service';
import { markBulkAttendanceService } from './mark-bulk-attendance.service';
import { markBulkTeacherAttendanceService } from './mark-bulk-teacher-attendance.service';
import { selfCheckInTeacherService } from './self-check-in-teacher.service';
import { updateAttendanceRecordService } from './update-attendance-record.service';
import { updateTeacherAttendanceRecordService } from './update-teacher-attendance-record.service';

export const attendanceService = Object.freeze({
  markBulkAttendance: markBulkAttendanceService,
  updateAttendanceRecord: updateAttendanceRecordService,
  getBatchAttendance: getBatchAttendanceService,
  getStudentAttendance: getStudentAttendanceService,
  getMyAttendance: getMyAttendanceService,
  markBulkTeacherAttendance: markBulkTeacherAttendanceService,
  selfCheckInTeacher: selfCheckInTeacherService,
  getTeacherAttendance: getTeacherAttendanceService,
  getTeacherAttendanceSummary: getTeacherAttendanceSummaryService,
  getMyTeacherAttendance: getMyTeacherAttendanceService,
  updateTeacherAttendanceRecord: updateTeacherAttendanceRecordService,
});

export {
  getBatchAttendanceService,
  getMyAttendanceService,
  getMyTeacherAttendanceService,
  getStudentAttendanceService,
  getTeacherAttendanceService,
  getTeacherAttendanceSummaryService,
  markBulkAttendanceService,
  markBulkTeacherAttendanceService,
  selfCheckInTeacherService,
  updateAttendanceRecordService,
  updateTeacherAttendanceRecordService,
};
