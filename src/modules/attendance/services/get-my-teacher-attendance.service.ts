import type { IPaginationMeta } from '../../../utils';
import type {
  ITeacherAttendanceQuery,
  ITeacherAttendanceSummaryResponse,
} from '../attendance.interface';
import { getTeacherAttendanceSummaryService } from './get-teacher-attendance-summary.service';

export const getMyTeacherAttendanceService = async (
  teacherId: string,
  query: ITeacherAttendanceQuery = {},
): Promise<{
  meta: IPaginationMeta;
  data: ITeacherAttendanceSummaryResponse;
}> => {
  return await getTeacherAttendanceSummaryService(teacherId, query);
};
