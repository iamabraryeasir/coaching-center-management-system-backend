import { createRoutineService } from './create-routine.service';
import { deleteRoutineService } from './delete-routine.service';
import { getAllRoutinesService } from './get-all-routines.service';
import { getBatchRoutinePdfService } from './get-batch-routine-pdf.service';
import { getBatchTimetableService } from './get-batch-timetable.service';
import { getRoutineByIdService } from './get-routine-by-id.service';
import { getStudentScheduleService } from './get-student-schedule.service';
import { getTeacherScheduleService } from './get-teacher-schedule.service';
import { updateRoutineService } from './update-routine.service';

export const routineService = Object.freeze({
  createRoutine: createRoutineService,
  updateRoutine: updateRoutineService,
  deleteRoutine: deleteRoutineService,
  getAllRoutines: getAllRoutinesService,
  getRoutineById: getRoutineByIdService,
  getBatchTimetable: getBatchTimetableService,
  getTeacherSchedule: getTeacherScheduleService,
  getStudentSchedule: getStudentScheduleService,
  getBatchRoutinePdf: getBatchRoutinePdfService,
});

export {
  createRoutineService,
  deleteRoutineService,
  getAllRoutinesService,
  getBatchRoutinePdfService,
  getBatchTimetableService,
  getRoutineByIdService,
  getStudentScheduleService,
  getTeacherScheduleService,
  updateRoutineService,
};
