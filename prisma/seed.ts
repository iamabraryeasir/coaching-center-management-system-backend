import bcrypt from 'bcryptjs';
import { addDays, startOfDay, subDays } from 'date-fns';
import {
  AttendanceStatus,
  BatchStatus,
  DayOfWeek,
  EnrollmentStatus,
  ExamStatus,
  PaymentBillStatus,
  PaymentMethod,
  PaymentStatus,
  Permission,
  ResultStatus,
  Role,
  UserStatus,
} from '@prisma/client';
import { config, pool, prisma } from '../src/config';
import { logger } from '../src/utils';

async function main(): Promise<void> {
  logger.info('================================================================');
  logger.info('🚀 Starting Clean Idempotent Database Seeding Pipeline...');
  logger.info('================================================================');

  const adminPasswordHash = await bcrypt.hash(
    config.ADMIN_PASSWORD || 'Admin@123456',
    config.BCRYPT_SALT_ROUNDS || 10,
  );
  const studentPassword = await bcrypt.hash('Student@123456', config.BCRYPT_SALT_ROUNDS || 10);
  const teacherPassword = await bcrypt.hash('Teacher@123456', config.BCRYPT_SALT_ROUNDS || 10);

  // 1. Seed System Admin
  logger.info('1. Bootstrapping Admin User & Institution Profile...');
  const adminEmail = config.ADMIN_EMAIL || 'admin@gmail.com';
  const adminName = config.ADMIN_NAME || 'Abrar Yeasir';
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
          institutionName: config.ADMIN_INSTITUTION_NAME || 'Radiant Coaching Center',
          institutionAddress: config.ADMIN_INSTITUTION_ADDRESS || 'Dhanmondi, Dhaka',
          institutionPhone: config.ADMIN_INSTITUTION_PHONE || '+8801700000001',
          institutionEmail: config.ADMIN_INSTITUTION_EMAIL || 'admin@gmail.com',
        },
      },
    },
  });

  await prisma.adminProfile.upsert({
    where: { userId: adminUser.id },
    update: {
      institutionName: config.ADMIN_INSTITUTION_NAME || 'Radiant Coaching Center',
      institutionAddress: config.ADMIN_INSTITUTION_ADDRESS || 'Dhanmondi, Dhaka',
      institutionPhone: config.ADMIN_INSTITUTION_PHONE || '+8801700000001',
      institutionEmail: config.ADMIN_INSTITUTION_EMAIL || 'admin@gmail.com',
    },
    create: {
      userId: adminUser.id,
      institutionName: config.ADMIN_INSTITUTION_NAME || 'Radiant Coaching Center',
      institutionAddress: config.ADMIN_INSTITUTION_ADDRESS || 'Dhanmondi, Dhaka',
      institutionPhone: config.ADMIN_INSTITUTION_PHONE || '+8801700000001',
      institutionEmail: config.ADMIN_INSTITUTION_EMAIL || 'admin@gmail.com',
    },
  });

  // 2. Seed Teachers
  logger.info('2. Bootstrapping Teachers & Permissions...');
  const teachersData = [
    {
      email: 'teacher1@gmail.com',
      name: 'Sarah Khan',
      phone: '+8801711000001',
      profile: {
        designation: 'Senior Teacher',
        qualification: 'M.Sc in Mathematics, BUET',
        specialization: 'Higher Mathematics',
        joiningDate: new Date('2024-01-01'),
      },
      permissions: [
        Permission.MANAGE_ATTENDANCE,
        Permission.MANAGE_EXAMS,
        Permission.MANAGE_ROUTINES,
      ],
    },
    {
      email: 'teacher2@gmail.com',
      name: 'Tanvir Ahmed',
      phone: '+8801711000002',
      profile: {
        designation: 'Senior Teacher',
        qualification: 'M.Sc in Applied Physics, DU',
        specialization: 'Physics',
        joiningDate: new Date('2024-02-01'),
      },
      permissions: [Permission.MANAGE_ATTENDANCE, Permission.MANAGE_EXAMS],
    },
    {
      email: 'teacher3@gmail.com',
      name: 'Ayesha Rahman',
      phone: '+8801711000003',
      profile: {
        designation: 'Teacher',
        qualification: 'M.Sc in Organic Chemistry, DU',
        specialization: 'Chemistry',
        joiningDate: new Date('2024-03-01'),
      },
      permissions: [Permission.MANAGE_ATTENDANCE],
    },
    {
      email: 'teacher4@gmail.com',
      name: 'Kamal Hossain',
      phone: '+8801711000004',
      profile: {
        designation: 'Teacher',
        qualification: 'M.A in English, JU',
        specialization: 'English',
        joiningDate: new Date('2024-04-01'),
      },
      permissions: [Permission.MANAGE_EXAMS],
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

    // Clean existing permissions and seed delegated ones
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
  logger.info('3. Bootstrapping Batches...');
  const batchesData = [
    {
      name: 'HSC 2026',
      fee: 3000.0,
      status: BatchStatus.ONGOING,
    },
    {
      name: 'SSC 2026',
      fee: 2500.0,
      status: BatchStatus.ONGOING,
    },
    {
      name: 'Class 10',
      fee: 2000.0,
      status: BatchStatus.ONGOING,
    },
    {
      name: 'Class 9',
      fee: 1800.0,
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
  logger.info('4. Bootstrapping Class Routines...');
  const batch1Id = seededBatches['HSC 2026'].id;
  const batch2Id = seededBatches['SSC 2026'].id;
  const batch3Id = seededBatches['Class 10'].id;
  const batch4Id = seededBatches['Class 9'].id;

  const routinesData = [
    // Batch 1: HSC 2026
    {
      batchId: batch1Id,
      dayOfWeek: DayOfWeek.SATURDAY,
      startTime: '10:00',
      endTime: '11:30',
      subject: 'Higher Mathematics',
      room: 'Room 101',
      teacherId: seededTeachers['teacher1@gmail.com'].id,
    },
    {
      batchId: batch1Id,
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '10:00',
      endTime: '11:30',
      subject: 'Physics',
      room: 'Room 101',
      teacherId: seededTeachers['teacher2@gmail.com'].id,
    },
    {
      batchId: batch1Id,
      dayOfWeek: DayOfWeek.WEDNESDAY,
      startTime: '10:00',
      endTime: '11:30',
      subject: 'Chemistry',
      room: 'Room 102',
      teacherId: seededTeachers['teacher3@gmail.com'].id,
    },

    // Batch 2: SSC 2026
    {
      batchId: batch2Id,
      dayOfWeek: DayOfWeek.SUNDAY,
      startTime: '15:00',
      endTime: '16:30',
      subject: 'General Science',
      room: 'Room 201',
      teacherId: seededTeachers['teacher2@gmail.com'].id,
    },
    {
      batchId: batch2Id,
      dayOfWeek: DayOfWeek.TUESDAY,
      startTime: '15:00',
      endTime: '16:30',
      subject: 'General Mathematics',
      room: 'Room 201',
      teacherId: seededTeachers['teacher1@gmail.com'].id,
    },
    {
      batchId: batch2Id,
      dayOfWeek: DayOfWeek.THURSDAY,
      startTime: '15:00',
      endTime: '16:30',
      subject: 'Chemistry',
      room: 'Room 201',
      teacherId: seededTeachers['teacher3@gmail.com'].id,
    },

    // Batch 3: Class 10
    {
      batchId: batch3Id,
      dayOfWeek: DayOfWeek.SATURDAY,
      startTime: '16:00',
      endTime: '17:30',
      subject: 'English',
      room: 'Room 202',
      teacherId: seededTeachers['teacher4@gmail.com'].id,
    },
    {
      batchId: batch3Id,
      dayOfWeek: DayOfWeek.WEDNESDAY,
      startTime: '16:00',
      endTime: '17:30',
      subject: 'Mathematics',
      room: 'Room 202',
      teacherId: seededTeachers['teacher1@gmail.com'].id,
    },

    // Batch 4: Class 9
    {
      batchId: batch4Id,
      dayOfWeek: DayOfWeek.SUNDAY,
      startTime: '16:00',
      endTime: '17:30',
      subject: 'General Science',
      room: 'Room 102',
      teacherId: seededTeachers['teacher2@gmail.com'].id,
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
  logger.info('5. Bootstrapping Students & Profiles...');
  const studentsData = [
    {
      email: 'student1@gmail.com',
      name: 'Rahim Ali',
      phone: '+8801722000001',
      status: UserStatus.ACTIVE,
      profile: {
        guardianName: 'Kamal Ali',
        guardianPhone: '+8801733000001',
        institutionName: 'Notre Dame College',
        classLevel: 'HSC',
        rollNumber: '101',
      },
    },
    {
      email: 'student2@gmail.com',
      name: 'Nusrat Jahan',
      phone: '+8801722000002',
      status: UserStatus.ACTIVE,
      profile: {
        guardianName: 'Rafiqul Islam',
        guardianPhone: '+8801733000002',
        institutionName: 'Viqarunnisa College',
        classLevel: 'HSC',
        rollNumber: '102',
      },
    },
    {
      email: 'student3@gmail.com',
      name: 'Tanvir Hasan',
      phone: '+8801722000003',
      status: UserStatus.ACTIVE,
      profile: {
        guardianName: 'Mahbub Hasan',
        guardianPhone: '+8801733000003',
        institutionName: 'Ideal School',
        classLevel: 'Class 10',
        rollNumber: '201',
      },
    },
    {
      email: 'student4@gmail.com',
      name: 'Sabbir Ahmed',
      phone: '+8801722000004',
      status: UserStatus.ACTIVE,
      profile: {
        guardianName: 'Jamal Ahmed',
        guardianPhone: '+8801733000004',
        institutionName: 'Dhaka College',
        classLevel: 'HSC',
        rollNumber: '103',
      },
    },
    {
      email: 'student5@gmail.com',
      name: 'Mehedi Hasan',
      phone: '+8801722000005',
      status: UserStatus.ACTIVE,
      profile: {
        guardianName: 'Abdur Rahim',
        guardianPhone: '+8801733000005',
        institutionName: 'City School',
        classLevel: 'Class 9',
        rollNumber: '301',
      },
    },
    {
      email: 'student6@gmail.com',
      name: 'Sadia Afrin',
      phone: '+8801722000006',
      status: UserStatus.PENDING_ACTIVATION,
      profile: {
        guardianName: 'Farid Uddin',
        guardianPhone: '+8801733000006',
        institutionName: 'Holy Cross School',
        classLevel: 'Class 10',
        rollNumber: '202',
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
  logger.info('6. Bootstrapping Enrollments...');
  const enrollmentsData = [
    {
      studentId: seededStudents['student1@gmail.com'].id,
      batchId: batch1Id,
      status: EnrollmentStatus.ENROLLED,
      approvedAt: new Date(),
    },
    {
      studentId: seededStudents['student2@gmail.com'].id,
      batchId: batch1Id,
      status: EnrollmentStatus.ENROLLED,
      approvedAt: new Date(),
    },
    {
      studentId: seededStudents['student3@gmail.com'].id,
      batchId: batch2Id,
      status: EnrollmentStatus.ENROLLED,
      approvedAt: new Date(),
    },
    {
      studentId: seededStudents['student4@gmail.com'].id,
      batchId: batch2Id,
      status: EnrollmentStatus.ENROLLED,
      approvedAt: new Date(),
    },
    {
      studentId: seededStudents['student5@gmail.com'].id,
      batchId: batch3Id,
      status: EnrollmentStatus.ENROLLED,
      approvedAt: new Date(),
    },
    {
      studentId: seededStudents['student6@gmail.com'].id,
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

  // 7. Seed Attendance Records
  logger.info('7. Bootstrapping Attendance Records...');
  const today = startOfDay(new Date());
  const day1 = subDays(today, 2);
  const day2 = subDays(today, 1);
  const day3 = today;

  const attendanceEntries = [
    // Batch 1 (Day 1 & Day 2 & Today)
    {
      batchId: batch1Id,
      studentId: seededStudents['student1@gmail.com'].id,
      markedById: seededTeachers['teacher1@gmail.com'].id,
      date: day1,
      status: AttendanceStatus.PRESENT,
      remarks: 'Attentive',
    },
    {
      batchId: batch1Id,
      studentId: seededStudents['student2@gmail.com'].id,
      markedById: seededTeachers['teacher1@gmail.com'].id,
      date: day1,
      status: AttendanceStatus.PRESENT,
      remarks: 'Present on time',
    },
    {
      batchId: batch1Id,
      studentId: seededStudents['student1@gmail.com'].id,
      markedById: seededTeachers['teacher1@gmail.com'].id,
      date: day2,
      status: AttendanceStatus.PRESENT,
      remarks: null,
    },
    {
      batchId: batch1Id,
      studentId: seededStudents['student2@gmail.com'].id,
      markedById: seededTeachers['teacher1@gmail.com'].id,
      date: day2,
      status: AttendanceStatus.LATE,
      remarks: 'Arrived 10 mins late',
    },
    {
      batchId: batch1Id,
      studentId: seededStudents['student1@gmail.com'].id,
      markedById: seededTeachers['teacher1@gmail.com'].id,
      date: day3,
      status: AttendanceStatus.PRESENT,
      remarks: null,
    },
    {
      batchId: batch1Id,
      studentId: seededStudents['student2@gmail.com'].id,
      markedById: seededTeachers['teacher1@gmail.com'].id,
      date: day3,
      status: AttendanceStatus.PRESENT,
      remarks: null,
    },

    // Batch 2 (Day 1 & Day 2)
    {
      batchId: batch2Id,
      studentId: seededStudents['student3@gmail.com'].id,
      markedById: seededTeachers['teacher2@gmail.com'].id,
      date: day1,
      status: AttendanceStatus.PRESENT,
      remarks: 'Participated actively',
    },
    {
      batchId: batch2Id,
      studentId: seededStudents['student4@gmail.com'].id,
      markedById: seededTeachers['teacher2@gmail.com'].id,
      date: day1,
      status: AttendanceStatus.PRESENT,
      remarks: null,
    },
    {
      batchId: batch2Id,
      studentId: seededStudents['student3@gmail.com'].id,
      markedById: seededTeachers['teacher2@gmail.com'].id,
      date: day2,
      status: AttendanceStatus.PRESENT,
      remarks: null,
    },
    {
      batchId: batch2Id,
      studentId: seededStudents['student4@gmail.com'].id,
      markedById: seededTeachers['teacher2@gmail.com'].id,
      date: day2,
      status: AttendanceStatus.ABSENT,
      remarks: 'Sick leave',
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

  // Teacher Attendance for Today
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
        remarks: 'Present',
      },
    });
  }

  // 8. Seed Exams & Results
  logger.info('8. Bootstrapping Exams & Results...');
  let exam1 = await prisma.exam.findFirst({
    where: { batchId: batch1Id, title: 'Higher Math Mid-Term Test' },
  });

  if (!exam1) {
    exam1 = await prisma.exam.create({
      data: {
        batchId: batch1Id,
        title: 'Higher Math Mid-Term Test',
        description: 'Calculus & Functions',
        totalMarks: 100.0,
        passMarks: 40.0,
        examDate: subDays(today, 5),
        status: ExamStatus.COMPLETED,
        resultStatus: ResultStatus.PUBLISHED,
      },
    });
  }

  const exam1Results = [
    {
      examId: exam1.id,
      studentId: seededStudents['student1@gmail.com'].id,
      marksObtained: 95.0,
      grade: 'A+',
      remarks: 'Outstanding performance',
    },
    {
      examId: exam1.id,
      studentId: seededStudents['student2@gmail.com'].id,
      marksObtained: 88.0,
      grade: 'A+',
      remarks: 'Very good analytical skills',
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

  // Exam 2 (Batch 2 - Upcoming)
  const existingExam2 = await prisma.exam.findFirst({
    where: { batchId: batch2Id, title: 'Science Weekly Quiz' },
  });

  if (!existingExam2) {
    await prisma.exam.create({
      data: {
        batchId: batch2Id,
        title: 'Science Weekly Quiz',
        description: 'Physics & Chemistry Basic Test',
        totalMarks: 50.0,
        passMarks: 20.0,
        examDate: addDays(today, 4),
        status: ExamStatus.UPCOMING,
        resultStatus: ResultStatus.DRAFT,
      },
    });
  }

  // 9. Seed Monthly Fee Bills & Payments
  logger.info('9. Bootstrapping Monthly Bills & Payment Transactions...');
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const student1Id = seededStudents['student1@gmail.com'].id;
  const student2Id = seededStudents['student2@gmail.com'].id;
  const student3Id = seededStudents['student3@gmail.com'].id;

  const enr1Id = seededEnrollments[`${batch1Id}_${student1Id}`]?.id;
  const enr2Id = seededEnrollments[`${batch1Id}_${student2Id}`]?.id;
  const enr3Id = seededEnrollments[`${batch2Id}_${student3Id}`]?.id;

  if (enr1Id) {
    const bill1 = await prisma.monthlyFeeBill.upsert({
      where: {
        enrollmentId_billingYear_billingMonth: {
          enrollmentId: enr1Id,
          billingYear: currentYear,
          billingMonth: currentMonth,
        },
      },
      update: {
        status: PaymentBillStatus.PAID,
        paidAmount: 3000.0,
        dueAmount: 0.0,
      },
      create: {
        studentId: student1Id,
        batchId: batch1Id,
        enrollmentId: enr1Id,
        billingMonth: currentMonth,
        billingYear: currentYear,
        monthlyFee: 3000.0,
        previousDue: 0.0,
        totalPayable: 3000.0,
        paidAmount: 3000.0,
        dueAmount: 0.0,
        status: PaymentBillStatus.PAID,
      },
    });

    await prisma.paymentTransaction.upsert({
      where: { receiptNumber: 'REC-202609-0001' },
      update: {},
      create: {
        studentId: student1Id,
        batchId: batch1Id,
        monthlyFeeBillId: bill1.id,
        amount: 3000.0,
        currency: 'bdt',
        paymentMethod: PaymentMethod.STRIPE,
        status: PaymentStatus.COMPLETED,
        stripeSessionId: 'cs_test_seed_student1_001',
        stripePaymentIntentId: 'pi_test_seed_student1_001',
        receiptNumber: 'REC-202609-0001',
        notes: 'Online Stripe card payment',
        paidAt: subDays(today, 5),
      },
    });
  }

  if (enr2Id) {
    const bill2 = await prisma.monthlyFeeBill.upsert({
      where: {
        enrollmentId_billingYear_billingMonth: {
          enrollmentId: enr2Id,
          billingYear: currentYear,
          billingMonth: currentMonth,
        },
      },
      update: {
        status: PaymentBillStatus.PARTIAL,
        paidAmount: 1500.0,
        dueAmount: 1500.0,
      },
      create: {
        studentId: student2Id,
        batchId: batch1Id,
        enrollmentId: enr2Id,
        billingMonth: currentMonth,
        billingYear: currentYear,
        monthlyFee: 3000.0,
        previousDue: 0.0,
        totalPayable: 3000.0,
        paidAmount: 1500.0,
        dueAmount: 1500.0,
        status: PaymentBillStatus.PARTIAL,
      },
    });

    await prisma.paymentTransaction.upsert({
      where: { receiptNumber: 'REC-202609-0002' },
      update: {},
      create: {
        studentId: student2Id,
        batchId: batch1Id,
        monthlyFeeBillId: bill2.id,
        amount: 1500.0,
        currency: 'bdt',
        paymentMethod: PaymentMethod.BKASH,
        status: PaymentStatus.COMPLETED,
        receiptNumber: 'REC-202609-0002',
        notes: 'bKash Manual Front-Desk Collection',
        collectedById: adminUser.id,
        paidAt: subDays(today, 3),
      },
    });
  }

  if (enr3Id) {
    await prisma.monthlyFeeBill.upsert({
      where: {
        enrollmentId_billingYear_billingMonth: {
          enrollmentId: enr3Id,
          billingYear: currentYear,
          billingMonth: currentMonth,
        },
      },
      update: {},
      create: {
        studentId: student3Id,
        batchId: batch2Id,
        enrollmentId: enr3Id,
        billingMonth: currentMonth,
        billingYear: currentYear,
        monthlyFee: 2500.0,
        previousDue: 500.0,
        totalPayable: 3000.0,
        paidAmount: 0.0,
        dueAmount: 3000.0,
        status: PaymentBillStatus.UNPAID,
      },
    });
  }

  // 10. Seed Initial Audit Logs
  logger.info('10. Bootstrapping Initial Audit Log...');
  const existingAudit = await prisma.auditLog.findFirst({
    where: { action: 'SYSTEM_BOOTSTRAPPED' },
  });

  if (!existingAudit) {
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'SYSTEM_BOOTSTRAPPED',
        entity: 'System',
        entityId: adminUser.id,
        details: JSON.stringify({
          institutionName: config.ADMIN_INSTITUTION_NAME || 'Radiant Coaching Center',
          version: '1.0.0',
          environment: config.NODE_ENV,
        }),
      },
    });
  }

  logger.info('================================================================');
  logger.info('🎉 Database Seeding Complete & Verified Successfully!');
  logger.info('================================================================');
  logger.info('Clean Seeded Credentials Overview:');
  logger.info(`  • Admin   : ${adminEmail} / Admin@123456 (${adminName})`);
  logger.info('  • Teacher : teacher1@gmail.com / Teacher@123456 (Sarah Khan - Math)');
  logger.info('  • Teacher : teacher2@gmail.com / Teacher@123456 (Tanvir Ahmed - Physics)');
  logger.info('  • Teacher : teacher3@gmail.com / Teacher@123456 (Ayesha Rahman - Chemistry)');
  logger.info('  • Teacher : teacher4@gmail.com / Teacher@123456 (Kamal Hossain - English)');
  logger.info('  • Student : student1@gmail.com / Student@123456 (Rahim Ali)');
  logger.info('  • Student : student2@gmail.com / Student@123456 (Nusrat Jahan)');
  logger.info('  • Student : student3@gmail.com / Student@123456 (Tanvir Hasan)');
  logger.info('  • Student : student4@gmail.com / Student@123456 (Sabbir Ahmed)');
  logger.info('  • Student : student5@gmail.com / Student@123456 (Mehedi Hasan)');
  logger.info('  • Student : student6@gmail.com / Student@123456 (Sadia Afrin - Pending)');
  logger.info('================================================================');
}

main()
  .catch((err) => {
    logger.error('Error executing database seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
