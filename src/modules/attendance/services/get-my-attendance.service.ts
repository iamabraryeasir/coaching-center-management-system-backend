import type { IPaginationMeta } from '../../../utils';
import type { IAttendanceQuery, IStudentAttendanceSummaryResponse } from '../attendance.interface';
import { getStudentAttendanceService } from './get-student-attendance.service';

export const getMyAttendanceService = async (
  studentUserId: string,
  query: IAttendanceQuery = {},
): Promise<{
  meta: IPaginationMeta;
  data: IStudentAttendanceSummaryResponse;
}> => {
  return await getStudentAttendanceService(studentUserId, query);
};
