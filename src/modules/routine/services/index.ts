import { createRoutineService } from './create-routine.service';
import { deleteRoutineService } from './delete-routine.service';
import { getAllRoutinesService } from './get-all-routines.service';
import { getBatchTimetableService } from './get-batch-timetable.service';
import { getRoutineByIdService } from './get-routine-by-id.service';
import { getStudentScheduleService } from './get-student-schedule.service';
import { getTeacherScheduleService } from './get-teacher-schedule.service';
import { updateRoutineService } from './update-routine.service';

export const routineService = Object.freeze({
  createRoutine: createRoutineService,
  getAllRoutines: getAllRoutinesService,
  getRoutineById: getRoutineByIdService,
  getBatchTimetable: getBatchTimetableService,
  getTeacherSchedule: getTeacherScheduleService,
  getStudentSchedule: getStudentScheduleService,
  updateRoutine: updateRoutineService,
  deleteRoutine: deleteRoutineService,
});

export {
  createRoutineService,
  deleteRoutineService,
  getAllRoutinesService,
  getBatchTimetableService,
  getRoutineByIdService,
  getStudentScheduleService,
  getTeacherScheduleService,
  updateRoutineService,
};
