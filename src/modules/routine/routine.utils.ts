import { type Batch, DayOfWeek, type TeacherProfile, type User } from '@prisma/client';
import { areIntervalsOverlapping, parse } from 'date-fns';
import { prisma } from '../../config';
import { ApiError } from '../../utils';
import type { IDayTimetableGroup, IRoutineResponse } from './routine.interface';

export const DAYS_OF_WEEK_ORDER: DayOfWeek[] = [
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
];

type RawRoutineWithRelations = {
  id: string;
  batchId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  subject: string | null;
  room: string | null;
  teacherId: string | null;
  createdAt: Date;
  updatedAt: Date;
  batch?: Batch | null;
  teacher?: (User & { teacherProfile?: TeacherProfile | null }) | null;
};

/**
 * Checks if two time intervals [startA, endA) and [startB, endB) overlap using date-fns
 */
export const isTimeOverlapping = (
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean => {
  const baseDate = new Date(0);
  const aStart = parse(startA, 'HH:mm', baseDate);
  const aEnd = parse(endA, 'HH:mm', baseDate);
  const bStart = parse(startB, 'HH:mm', baseDate);
  const bEnd = parse(endB, 'HH:mm', baseDate);

  return areIntervalsOverlapping({ start: aStart, end: aEnd }, { start: bStart, end: bEnd });
};

/**
 * Formats a raw Prisma routine object into a clean, hydrated API response
 */
export const formatRoutineResponse = (routine: RawRoutineWithRelations): IRoutineResponse => {
  return {
    id: routine.id,
    batchId: routine.batchId,
    dayOfWeek: routine.dayOfWeek,
    startTime: routine.startTime,
    endTime: routine.endTime,
    subject: routine.subject,
    room: routine.room,
    teacherId: routine.teacherId,
    teacher: routine.teacher
      ? {
          id: routine.teacher.id,
          name: routine.teacher.name,
          email: routine.teacher.email,
          phone: routine.teacher.phone,
          designation: routine.teacher.teacherProfile?.designation ?? null,
          specialization: routine.teacher.teacherProfile?.specialization ?? null,
        }
      : null,
    batch: routine.batch
      ? {
          id: routine.batch.id,
          name: routine.batch.name,
          fee: Number(routine.batch.fee),
        }
      : null,
    createdAt: routine.createdAt,
    updatedAt: routine.updatedAt,
  };
};

/**
 * Groups an array of routine slots by day of week in academic order
 */
export const groupRoutinesByDay = (routines: IRoutineResponse[]): IDayTimetableGroup[] => {
  const groups: IDayTimetableGroup[] = DAYS_OF_WEEK_ORDER.map((day) => ({
    dayOfWeek: day,
    slots: [],
  }));

  const dayMap = new Map<DayOfWeek, IRoutineResponse[]>();
  for (const group of groups) {
    dayMap.set(group.dayOfWeek, group.slots);
  }

  for (const routine of routines) {
    const list = dayMap.get(routine.dayOfWeek);
    if (list) {
      list.push(routine);
    }
  }

  // Sort slots in each day by startTime
  for (const group of groups) {
    group.slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  return groups;
};

/**
 * Checks for time conflicts on the same batch
 */
export const checkBatchTimeConflict = async (
  batchId: string,
  dayOfWeek: DayOfWeek,
  startTime: string,
  endTime: string,
  excludeRoutineId?: string,
): Promise<void> => {
  const batchRoutines = await prisma.classRoutine.findMany({
    where: {
      batchId,
      dayOfWeek,
      ...(excludeRoutineId ? { id: { not: excludeRoutineId } } : {}),
      batch: { deletedAt: null },
    },
  });

  for (const r of batchRoutines) {
    if (isTimeOverlapping(startTime, endTime, r.startTime, r.endTime)) {
      throw ApiError.conflict(
        `Batch already has a scheduled class '${r.subject || 'Class'}' on ${dayOfWeek} from ${r.startTime} to ${r.endTime}.`,
      );
    }
  }
};

/**
 * Checks for teacher double-booking across all batches
 */
export const checkTeacherTimeConflict = async (
  teacherId: string,
  dayOfWeek: DayOfWeek,
  startTime: string,
  endTime: string,
  excludeRoutineId?: string,
): Promise<void> => {
  const teacherRoutines = await prisma.classRoutine.findMany({
    where: {
      teacherId,
      dayOfWeek,
      ...(excludeRoutineId ? { id: { not: excludeRoutineId } } : {}),
      batch: { deletedAt: null },
    },
    include: {
      batch: true,
      teacher: true,
    },
  });

  for (const r of teacherRoutines) {
    if (isTimeOverlapping(startTime, endTime, r.startTime, r.endTime)) {
      const teacherName = r.teacher?.name || 'Teacher';
      const conflictingBatch = r.batch?.name || 'another batch';
      throw ApiError.conflict(
        `${teacherName} is already assigned to '${conflictingBatch}' on ${dayOfWeek} from ${r.startTime} to ${r.endTime}.`,
      );
    }
  }
};

/**
 * Checks for physical room double-booking across all batches
 */
export const checkRoomTimeConflict = async (
  room: string,
  dayOfWeek: DayOfWeek,
  startTime: string,
  endTime: string,
  excludeRoutineId?: string,
): Promise<void> => {
  const roomRoutines = await prisma.classRoutine.findMany({
    where: {
      room: {
        equals: room.trim(),
        mode: 'insensitive',
      },
      dayOfWeek,
      ...(excludeRoutineId ? { id: { not: excludeRoutineId } } : {}),
      batch: { deletedAt: null },
    },
    include: {
      batch: true,
    },
  });

  for (const r of roomRoutines) {
    if (isTimeOverlapping(startTime, endTime, r.startTime, r.endTime)) {
      const conflictingBatch = r.batch?.name || 'another batch';
      throw ApiError.conflict(
        `Room '${room}' is already booked for '${conflictingBatch}' on ${dayOfWeek} from ${r.startTime} to ${r.endTime}.`,
      );
    }
  }
};

/**
 * Validates timetable schedule conflicts for Batch, Room, and Teacher
 */
export const validateRoutineScheduleConflicts = async (params: {
  batchId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  room?: string | null;
  teacherId?: string | null;
  excludeRoutineId?: string;
}): Promise<void> => {
  await checkBatchTimeConflict(
    params.batchId,
    params.dayOfWeek,
    params.startTime,
    params.endTime,
    params.excludeRoutineId,
  );

  if (params.teacherId) {
    await checkTeacherTimeConflict(
      params.teacherId,
      params.dayOfWeek,
      params.startTime,
      params.endTime,
      params.excludeRoutineId,
    );
  }

  if (params.room && params.room.trim().length > 0) {
    await checkRoomTimeConflict(
      params.room,
      params.dayOfWeek,
      params.startTime,
      params.endTime,
      params.excludeRoutineId,
    );
  }
};
