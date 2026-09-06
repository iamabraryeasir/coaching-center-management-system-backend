import bcrypt from 'bcryptjs';
import { addDays, startOfDay, subDays } from 'date-fns';
import {
  AttendanceStatus,
  BatchStatus,
  DayOfWeek,
  EnrollmentStatus,
  ExamStatus,
  PaymentMethod,
  PaymentStatus,
  Permission,
  ResultStatus,
  Role,
  UserStatus,
} from '@prisma/client';
import { config, prisma } from '../src/config';
import { logger } from '../src/utils';

async function main(): Promise<void> {
  logger.info('================================================================');
  logger.info('🚀 Starting Idempotent Database Seeding Pipeline...');
  logger.info('================================================================');

  const adminPasswordHash = await bcrypt.hash(
    config.ADMIN_PASSWORD || 'Admin@123456',
    config.BCRYPT_SALT_ROUNDS || 10,
  );
  const studentPassword = await bcrypt.hash('Student@123456', config.BCRYPT_SALT_ROUNDS || 10);
  const teacherPassword = await bcrypt.hash('Teacher@123456', config.BCRYPT_SALT_ROUNDS || 10);

  // 1. Seed System Admin
  logger.info('1. Bootstrapping Admin User & Institution Profile...');
  const adminEmail = config.ADMIN_EMAIL || 'admin@coaching.com';
  const adminName = config.ADMIN_NAME || 'System Administrator';
  const adminPhone = config.ADMIN_PHONE || '+8801700000001';

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      phone: adminPhone,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      password: adminPasswordHash,
    },
    create: {
      email: adminEmail,
      name: adminName,
      phone: adminPhone,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      password: adminPasswordHash,
      adminProfile: {
        create: {
          institutionName: config.ADMIN_INSTITUTION_NAME,
          institutionAddress: config.ADMIN_INSTITUTION_ADDRESS,
          institutionPhone: config.ADMIN_INSTITUTION_PHONE,
          institutionEmail: config.ADMIN_INSTITUTION_EMAIL,
        },
      },
    },
  });

  // Ensure admin profile exists
  await prisma.adminProfile.upsert({
    where: { userId: adminUser.id },
    update: {
      institutionName: config.ADMIN_INSTITUTION_NAME,
      institutionAddress: config.ADMIN_INSTITUTION_ADDRESS,
      institutionPhone: config.ADMIN_INSTITUTION_PHONE,
      institutionEmail: config.ADMIN_INSTITUTION_EMAIL,
    },
    create: {
      userId: adminUser.id,
      institutionName: config.ADMIN_INSTITUTION_NAME,
      institutionAddress: config.ADMIN_INSTITUTION_ADDRESS,
      institutionPhone: config.ADMIN_INSTITUTION_PHONE,
      institutionEmail: config.ADMIN_INSTITUTION_EMAIL,
    },
  });

  // 2. Seed Teachers
  logger.info('2. Bootstrapping Teaching Faculty & Delegated Permissions...');
  const teachersData = [
    {
      email: 'sarah.jenkins@apexacademy.edu',
      name: 'Dr. Sarah Jenkins',
      phone: '+8801711110001',
      profile: {
        designation: 'Head of Mathematics & Physics',
        qualification: 'Ph.D. in Applied Mathematics, BUET',
        specialization: 'Higher Mathematics & Physics',
        joiningDate: new Date('2023-01-01'),
      },
      permissions: [
        Permission.MANAGE_ATTENDANCE,
        Permission.MANAGE_EXAMS,
        Permission.MANAGE_ROUTINES,
      ],
    },
    {
      email: 'alan.walker@apexacademy.edu',
      name: 'Prof. Alan Walker',
      phone: '+8801711110002',
      profile: {
        designation: 'Senior Lecturer in Chemistry',
        qualification: 'M.Sc. in Organic Chemistry, DU',
        specialization: 'Chemistry & Organic Synthesis',
        joiningDate: new Date('2023-06-01'),
      },
      permissions: [Permission.MANAGE_ATTENDANCE, Permission.MANAGE_EXAMS],
    },
    {
      email: 'emily.watson@apexacademy.edu',
      name: 'Ms. Emily Watson',
      phone: '+8801711110003',
      profile: {
        designation: 'Lecturer in English & Humanities',
        qualification: 'M.A. in English Literature, JU',
        specialization: 'English Language & Creative Writing',
        joiningDate: new Date('2024-01-15'),
      },
      permissions: [Permission.MANAGE_ATTENDANCE],
    },
  ];

  const seededTeachers: Record<string, typeof adminUser> = {};

  for (const t of teachersData) {
    const teacher = await prisma.user.upsert({
      where: { email: t.email },
      update: {
        name: t.name,
        phone: t.phone,
        role: Role.TEACHER,
        status: UserStatus.ACTIVE,
        password: teacherPassword,
      },
      create: {
        email: t.email,
        name: t.name,
        phone: t.phone,
        role: Role.TEACHER,
        status: UserStatus.ACTIVE,
        password: teacherPassword,
        teacherProfile: {
          create: t.profile,
        },
      },
    });

    await prisma.teacherProfile.upsert({
      where: { userId: teacher.id },
      update: t.profile,
      create: {
        userId: teacher.id,
        ...t.profile,
      },
    });

    // Delegated permissions
    for (const perm of t.permissions) {
      await prisma.teacherPermission.upsert({
        where: {
          teacherId_permission: {
            teacherId: teacher.id,
            permission: perm,
          },
        },
        update: {},
        create: {
          teacherId: teacher.id,
          permission: perm,
        },
      });
    }

    seededTeachers[t.email] = teacher;
  }

  // 3. Seed Batches
  logger.info('3. Bootstrapping Academic Batches...');
  const batchesData = [
    {
      name: 'HSC 2026 - Higher Mathematics & Physics Masterclass',
      fee: 3500.0,
      status: BatchStatus.ONGOING,
    },
    {
      name: 'SSC 2026 - Comprehensive Science Foundation',
      fee: 2800.0,
      status: BatchStatus.ONGOING,
    },
    {
      name: 'Class 10 - Intensive English & Grammar',
      fee: 2200.0,
      status: BatchStatus.ONGOING,
    },
  ];

  const seededBatches: Record<string, { id: string; name: string; fee: number }> = {};

  for (const b of batchesData) {
    let batch = await prisma.batch.findFirst({
      where: { name: b.name, deletedAt: null },
    });

    if (!batch) {
      batch = await prisma.batch.create({
        data: {
          name: b.name,
          fee: b.fee,
          status: b.status,
        },
      });
    } else {
      batch = await prisma.batch.update({
        where: { id: batch.id },
        data: {
          fee: b.fee,
          status: b.status,
        },
      });
    }

    seededBatches[b.name] = { id: batch.id, name: batch.name, fee: Number(batch.fee) };
  }

  // 4. Seed Routines
  logger.info('4. Bootstrapping Conflict-Free Class Timetables...');
  const batch1Id = seededBatches['HSC 2026 - Higher Mathematics & Physics Masterclass'].id;
  const batch2Id = seededBatches['SSC 2026 - Comprehensive Science Foundation'].id;
  const batch3Id = seededBatches['Class 10 - Intensive English & Grammar'].id;

  const routinesData = [
    // Batch 1 Routines
    {
      batchId: batch1Id,
      dayOfWeek: DayOfWeek.SATURDAY,
      startTime: '10:00',
      endTime: '11:30',
      subject: 'Higher Mathematics (Calculus)',
      room: 'Lab 101',
      teacherId: seededTeachers['sarah.jenkins@apexacademy.edu'].id,
    },
    {
      batchId: batch1Id,
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '10:00',
      endTime: '11:30',
      subject: 'Physics (Electromagnetism)',
      room: 'Lab 101',
      teacherId: seededTeachers['sarah.jenkins@apexacademy.edu'].id,
    },
    {
      batchId: batch1Id,
      dayOfWeek: DayOfWeek.WEDNESDAY,
      startTime: '10:00',
      endTime: '11:30',
      subject: 'Chemistry (Organic Reactions)',
      room: 'Hall A',
      teacherId: seededTeachers['alan.walker@apexacademy.edu'].id,
    },
    // Batch 2 Routines
    {
      batchId: batch2Id,
      dayOfWeek: DayOfWeek.SUNDAY,
      startTime: '15:00',
      endTime: '16:30',
      subject: 'General Science & Biology',
      room: 'Room 203',
      teacherId: seededTeachers['alan.walker@apexacademy.edu'].id,
    },
    {
      batchId: batch2Id,
      dayOfWeek: DayOfWeek.TUESDAY,
      startTime: '15:00',
      endTime: '16:30',
      subject: 'General Mathematics',
      room: 'Room 203',
      teacherId: seededTeachers['sarah.jenkins@apexacademy.edu'].id,
    },
    {
      batchId: batch2Id,
      dayOfWeek: DayOfWeek.THURSDAY,
      startTime: '15:00',
      endTime: '16:30',
      subject: 'English Language Practice',
      room: 'Room 203',
      teacherId: seededTeachers['emily.watson@apexacademy.edu'].id,
    },
    // Batch 3 Routines
    {
      batchId: batch3Id,
      dayOfWeek: DayOfWeek.SATURDAY,
      startTime: '16:00',
      endTime: '17:30',
      subject: 'Grammar & Composition',
      room: 'Room 204',
      teacherId: seededTeachers['emily.watson@apexacademy.edu'].id,
    },
    {
      batchId: batch3Id,
      dayOfWeek: DayOfWeek.WEDNESDAY,
      startTime: '16:00',
      endTime: '17:30',
      subject: 'Literature & Comprehension',
      room: 'Room 204',
      teacherId: seededTeachers['emily.watson@apexacademy.edu'].id,
    },
  ];

  for (const r of routinesData) {
    const existing = await prisma.classRoutine.findFirst({
      where: {
        batchId: r.batchId,
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
      },
    });

    if (!existing) {
      await prisma.classRoutine.create({
        data: r,
      });
    }
  }

  // 5. Seed Students & Profiles
  logger.info('5. Bootstrapping Students & Student Profiles...');
  const studentsData = [
    {
      email: 'rahim.ahmed@student.apex.edu',
      name: 'Rahim Ahmed',
      phone: '+8801722220001',
      status: UserStatus.ACTIVE,
      profile: {
        guardianName: 'Kamal Ahmed',
        guardianPhone: '+8801733330001',
        institutionName: 'Notre Dame College, Dhaka',
        classLevel: 'HSC-2nd Year',
        rollNumber: 'HSC-101',
      },
    },
    {
      email: 'nusrat.jahan@student.apex.edu',
      name: 'Nusrat Jahan',
      phone: '+8801722220002',
      status: UserStatus.ACTIVE,
      profile: {
        guardianName: 'Rafiqul Islam',
        guardianPhone: '+8801733330002',
        institutionName: 'Viqarunnisa Noon College',
        classLevel: 'HSC-2nd Year',
        rollNumber: 'HSC-102',
      },
    },
    {
      email: 'tanvir.hasan@student.apex.edu',
      name: 'Tanvir Hasan',
      phone: '+8801722220003',
      status: UserStatus.ACTIVE,
      profile: {
        guardianName: 'Mahbub Hasan',
        guardianPhone: '+8801733330003',
        institutionName: 'Ideal School & College',
        classLevel: 'Class 10',
        rollNumber: 'SSC-201',
      },
    },
    {
      email: 'sadia.afrin@student.apex.edu',
      name: 'Sadia Afrin',
      phone: '+8801722220004',
      status: UserStatus.PENDING_ACTIVATION,
      profile: {
        guardianName: 'Farid Uddin',
        guardianPhone: '+8801733330004',
        institutionName: "Holy Cross Girls' High School",
        classLevel: 'Class 10',
        rollNumber: 'SSC-202',
      },
    },
  ];

  const seededStudents: Record<string, typeof adminUser> = {};

  for (const s of studentsData) {
    const student = await prisma.user.upsert({
      where: { email: s.email },
      update: {
        name: s.name,
        phone: s.phone,
        role: Role.STUDENT,
        status: s.status,
        password: studentPassword,
      },
      create: {
        email: s.email,
        name: s.name,
        phone: s.phone,
        role: Role.STUDENT,
        status: s.status,
        password: studentPassword,
        studentProfile: {
          create: s.profile,
        },
      },
    });

    await prisma.studentProfile.upsert({
      where: { userId: student.id },
      update: s.profile,
      create: {
        userId: student.id,
        ...s.profile,
      },
    });

    seededStudents[s.email] = student;
  }

  // 6. Seed Enrollments
  logger.info('6. Bootstrapping Batch Enrollments...');
  const enrollmentsData = [
    {
      studentId: seededStudents['rahim.ahmed@student.apex.edu'].id,
      batchId: batch1Id,
      status: EnrollmentStatus.ENROLLED,
      approvedAt: new Date(),
    },
    {
      studentId: seededStudents['nusrat.jahan@student.apex.edu'].id,
      batchId: batch1Id,
      status: EnrollmentStatus.ENROLLED,
      approvedAt: new Date(),
    },
    {
      studentId: seededStudents['tanvir.hasan@student.apex.edu'].id,
      batchId: batch2Id,
      status: EnrollmentStatus.ENROLLED,
      approvedAt: new Date(),
    },
    {
      studentId: seededStudents['tanvir.hasan@student.apex.edu'].id,
      batchId: batch3Id,
      status: EnrollmentStatus.ENROLLED,
      approvedAt: new Date(),
    },
    {
      studentId: seededStudents['sadia.afrin@student.apex.edu'].id,
      batchId: batch2Id,
      status: EnrollmentStatus.PENDING,
      approvedAt: null,
    },
  ];

  const seededEnrollments: Record<string, { id: string }> = {};

  for (const enr of enrollmentsData) {
    const enrollment = await prisma.enrollment.upsert({
      where: {
        batchId_studentId: {
          batchId: enr.batchId,
          studentId: enr.studentId,
        },
      },
      update: {
        status: enr.status,
        approvedAt: enr.approvedAt,
      },
      create: enr,
    });

    seededEnrollments[`${enr.batchId}_${enr.studentId}`] = { id: enrollment.id };
  }

  // 7. Seed Daily Attendance Records (Past 3 days)
  logger.info('7. Bootstrapping Attendance Records...');
  const today = startOfDay(new Date());
  const day1 = subDays(today, 2);
  const day2 = subDays(today, 1);
  const day3 = today;

  const attendanceEntries = [
    // Batch 1
    {
      batchId: batch1Id,
      studentId: seededStudents['rahim.ahmed@student.apex.edu'].id,
      markedById: seededTeachers['sarah.jenkins@apexacademy.edu'].id,
      date: day1,
      status: AttendanceStatus.PRESENT,
      remarks: 'Attentive in class',
    },
    {
      batchId: batch1Id,
      studentId: seededStudents['nusrat.jahan@student.apex.edu'].id,
      markedById: seededTeachers['sarah.jenkins@apexacademy.edu'].id,
      date: day1,
      status: AttendanceStatus.PRESENT,
      remarks: 'Present on time',
    },
    {
      batchId: batch1Id,
      studentId: seededStudents['rahim.ahmed@student.apex.edu'].id,
      markedById: seededTeachers['sarah.jenkins@apexacademy.edu'].id,
      date: day2,
      status: AttendanceStatus.PRESENT,
      remarks: null,
    },
    {
      batchId: batch1Id,
      studentId: seededStudents['nusrat.jahan@student.apex.edu'].id,
      markedById: seededTeachers['sarah.jenkins@apexacademy.edu'].id,
      date: day2,
      status: AttendanceStatus.LATE,
      remarks: 'Arrived 15 mins late due to traffic',
    },
    {
      batchId: batch1Id,
      studentId: seededStudents['rahim.ahmed@student.apex.edu'].id,
      markedById: seededTeachers['sarah.jenkins@apexacademy.edu'].id,
      date: day3,
      status: AttendanceStatus.PRESENT,
      remarks: null,
    },
    {
      batchId: batch1Id,
      studentId: seededStudents['nusrat.jahan@student.apex.edu'].id,
      markedById: seededTeachers['sarah.jenkins@apexacademy.edu'].id,
      date: day3,
      status: AttendanceStatus.PRESENT,
      remarks: null,
    },
    // Batch 2
    {
      batchId: batch2Id,
      studentId: seededStudents['tanvir.hasan@student.apex.edu'].id,
      markedById: seededTeachers['alan.walker@apexacademy.edu'].id,
      date: day1,
      status: AttendanceStatus.PRESENT,
      remarks: 'Active lab participation',
    },
    {
      batchId: batch2Id,
      studentId: seededStudents['tanvir.hasan@student.apex.edu'].id,
      markedById: seededTeachers['alan.walker@apexacademy.edu'].id,
      date: day2,
      status: AttendanceStatus.PRESENT,
      remarks: null,
    },
  ];

  for (const att of attendanceEntries) {
    await prisma.attendanceRecord.upsert({
      where: {
        batchId_studentId_date: {
          batchId: att.batchId,
          studentId: att.studentId,
          date: att.date,
        },
      },
      update: {
        status: att.status,
        remarks: att.remarks,
      },
      create: att,
    });
  }

  // Teacher Attendance
  for (const teacherEmail of Object.keys(seededTeachers)) {
    const tId = seededTeachers[teacherEmail].id;
    await prisma.teacherAttendanceRecord.upsert({
      where: {
        teacherId_date: {
          teacherId: tId,
          date: day3,
        },
      },
      update: {
        status: AttendanceStatus.PRESENT,
      },
      create: {
        teacherId: tId,
        markedById: adminUser.id,
        date: day3,
        status: AttendanceStatus.PRESENT,
        checkInTime: new Date(),
        remarks: 'Self checked-in / Admin confirmed',
      },
    });
  }

  // 8. Seed Exams & Results
  logger.info('8. Bootstrapping Examination Assessments & Published Merit Results...');
  // Exam 1 (Batch 1 - Completed & Published)
  let exam1 = await prisma.exam.findFirst({
    where: { batchId: batch1Id, title: 'Higher Math Mid-Term Assessment 2026' },
  });

  if (!exam1) {
    exam1 = await prisma.exam.create({
      data: {
        batchId: batch1Id,
        title: 'Higher Math Mid-Term Assessment 2026',
        description: 'Calculus, Derivatives & Limits',
        totalMarks: 100.0,
        passMarks: 40.0,
        examDate: subDays(today, 7),
        status: ExamStatus.COMPLETED,
        resultStatus: ResultStatus.PUBLISHED,
      },
    });
  }

  // Results for Exam 1
  const exam1Results = [
    {
      examId: exam1.id,
      studentId: seededStudents['rahim.ahmed@student.apex.edu'].id,
      marksObtained: 92.5,
      grade: 'A+',
      remarks: 'Outstanding conceptual clarity in differential calculus',
    },
    {
      examId: exam1.id,
      studentId: seededStudents['nusrat.jahan@student.apex.edu'].id,
      marksObtained: 84.0,
      grade: 'A+',
      remarks: 'Excellent analytical precision and problem-solving',
    },
  ];

  for (const res of exam1Results) {
    await prisma.examResult.upsert({
      where: {
        examId_studentId: {
          examId: res.examId,
          studentId: res.studentId,
        },
      },
      update: {
        marksObtained: res.marksObtained,
        grade: res.grade,
        remarks: res.remarks,
      },
      create: res,
    });
  }

  // Exam 2 (Batch 2 - Completed & Published)
  let exam2 = await prisma.exam.findFirst({
    where: { batchId: batch2Id, title: 'Science First Term Assessment' },
  });

  if (!exam2) {
    exam2 = await prisma.exam.create({
      data: {
        batchId: batch2Id,
        title: 'Science First Term Assessment',
        description: 'Basic Physics, Chemistry & Biology Fundamentals',
        totalMarks: 50.0,
        passMarks: 20.0,
        examDate: subDays(today, 3),
        status: ExamStatus.COMPLETED,
        resultStatus: ResultStatus.PUBLISHED,
      },
    });
  }

  // Results for Exam 2
  await prisma.examResult.upsert({
    where: {
      examId_studentId: {
        examId: exam2.id,
        studentId: seededStudents['tanvir.hasan@student.apex.edu'].id,
      },
    },
    update: {
      marksObtained: 44.5,
      grade: 'A+',
      remarks: 'Top score in general science',
    },
    create: {
      examId: exam2.id,
      studentId: seededStudents['tanvir.hasan@student.apex.edu'].id,
      marksObtained: 44.5,
      grade: 'A+',
      remarks: 'Top score in general science',
    },
  });

  // Exam 3 (Batch 1 - Upcoming)
  const existingExam3 = await prisma.exam.findFirst({
    where: { batchId: batch1Id, title: 'Physics Upcoming Chapter Test' },
  });

  if (!existingExam3) {
    await prisma.exam.create({
      data: {
        batchId: batch1Id,
        title: 'Physics Upcoming Chapter Test',
        description: 'Electromagnetism & Waves',
        totalMarks: 50.0,
        passMarks: 20.0,
        examDate: addDays(today, 5),
        status: ExamStatus.UPCOMING,
        resultStatus: ResultStatus.DRAFT,
      },
    });
  }

  // 9. Seed Financial Transactions & Receipts
  logger.info('9. Bootstrapping Stripe & Manual Financial Transactions & Receipts...');
  const paymentsData = [
    {
      studentId: seededStudents['rahim.ahmed@student.apex.edu'].id,
      batchId: batch1Id,
      enrollmentId:
        seededEnrollments[
          `${batch1Id}_${seededStudents['rahim.ahmed@student.apex.edu'].id}`
        ]?.id,
      amount: 3500.0,
      currency: 'bdt',
      paymentMethod: PaymentMethod.STRIPE,
      status: PaymentStatus.COMPLETED,
      stripeSessionId: 'cs_test_seed_rahim_001',
      stripePaymentIntentId: 'pi_test_seed_rahim_001',
      paidAt: subDays(today, 10),
      receiptNumber: 'REC-2026-0001',
    },
    {
      studentId: seededStudents['nusrat.jahan@student.apex.edu'].id,
      batchId: batch1Id,
      enrollmentId:
        seededEnrollments[
          `${batch1Id}_${seededStudents['nusrat.jahan@student.apex.edu'].id}`
        ]?.id,
      amount: 3500.0,
      currency: 'bdt',
      paymentMethod: PaymentMethod.BKASH,
      status: PaymentStatus.COMPLETED,
      stripeSessionId: null,
      stripePaymentIntentId: null,
      paidAt: subDays(today, 8),
      receiptNumber: 'REC-2026-0002',
    },
    {
      studentId: seededStudents['tanvir.hasan@student.apex.edu'].id,
      batchId: batch2Id,
      enrollmentId:
        seededEnrollments[
          `${batch2Id}_${seededStudents['tanvir.hasan@student.apex.edu'].id}`
        ]?.id,
      amount: 2800.0,
      currency: 'bdt',
      paymentMethod: PaymentMethod.CASH,
      status: PaymentStatus.COMPLETED,
      stripeSessionId: null,
      stripePaymentIntentId: null,
      paidAt: subDays(today, 5),
      receiptNumber: 'REC-2026-0003',
    },
  ];

  for (const pay of paymentsData) {
    let tx = await prisma.paymentTransaction.findFirst({
      where: {
        studentId: pay.studentId,
        batchId: pay.batchId,
        status: PaymentStatus.COMPLETED,
      },
      include: { receipt: true },
    });

    if (!tx) {
      tx = await prisma.paymentTransaction.create({
        data: {
          studentId: pay.studentId,
          batchId: pay.batchId,
          enrollmentId: pay.enrollmentId,
          amount: pay.amount,
          currency: pay.currency,
          paymentMethod: pay.paymentMethod,
          status: pay.status,
          stripeSessionId: pay.stripeSessionId,
          stripePaymentIntentId: pay.stripePaymentIntentId,
          paidAt: pay.paidAt,
          receipt: {
            create: {
              receiptNumber: pay.receiptNumber,
            },
          },
        },
        include: { receipt: true },
      });
    }
  }

  // 10. Seed Initial Audit Logs
  logger.info('10. Bootstrapping Immutable Administrative Audit Trail...');
  const auditLogsData = [
    {
      userId: adminUser.id,
      action: 'SYSTEM_BOOTSTRAPPED',
      entity: 'System',
      entityId: adminUser.id,
      details: JSON.stringify({
        institutionName: config.ADMIN_INSTITUTION_NAME,
        version: '1.0.0',
        environment: config.NODE_ENV,
      }),
    },
    {
      userId: adminUser.id,
      action: 'TEACHER_PROVISIONED',
      entity: 'User',
      entityId: seededTeachers['sarah.jenkins@apexacademy.edu'].id,
      details: JSON.stringify({
        teacherName: 'Dr. Sarah Jenkins',
        permissions: ['MANAGE_ATTENDANCE', 'MANAGE_EXAMS', 'MANAGE_ROUTINES'],
      }),
    },
    {
      userId: adminUser.id,
      action: 'BATCH_CREATED',
      entity: 'Batch',
      entityId: batch1Id,
      details: JSON.stringify({
        name: 'HSC 2026 - Higher Mathematics & Physics Masterclass',
        fee: 3500.0,
      }),
    },
    {
      userId: seededTeachers['sarah.jenkins@apexacademy.edu'].id,
      action: 'EXAM_RESULTS_PUBLISHED',
      entity: 'Exam',
      entityId: exam1.id,
      details: JSON.stringify({
        examTitle: 'Higher Math Mid-Term Assessment 2026',
        totalCandidates: 2,
        passRate: 100,
      }),
    },
  ];

  for (const log of auditLogsData) {
    await prisma.auditLog.create({
      data: log,
    });
  }

  logger.info('================================================================');
  logger.info('🎉 Database Seeding Complete & Verified Successfully!');
  logger.info('================================================================');
  logger.info('Seeded Credentials Overview:');
  logger.info(`  • Admin  : ${adminEmail} / Admin@123456`);
  logger.info('  • Teacher: sarah.jenkins@apexacademy.edu / Teacher@123456');
  logger.info('  • Teacher: alan.walker@apexacademy.edu / Teacher@123456');
  logger.info('  • Teacher: emily.watson@apexacademy.edu / Teacher@123456');
  logger.info('  • Student: rahim.ahmed@student.apex.edu / Student@123456');
  logger.info('  • Student: nusrat.jahan@student.apex.edu / Student@123456');
  logger.info('  • Student: tanvir.hasan@student.apex.edu / Student@123456');
  logger.info('  • Student (Pending): sadia.afrin@student.apex.edu / Student@123456');
  logger.info('================================================================');
}

main()
  .catch((err) => {
    logger.error('Error executing database seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
