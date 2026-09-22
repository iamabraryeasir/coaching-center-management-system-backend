import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import { config } from '../config';
import { formatInBangladeshTime, getBangladeshCurrentYear } from './date';
import { formatInBangladeshTime } from './date';

const PRIMARY_COLOR = '#1e3a8a';
const SECONDARY_COLOR = '#475569';
const ACCENT_COLOR = '#059669';
const BORDER_COLOR = '#cbd5e1';
const BG_LIGHT = '#f8fafc';

const docToBuffer = (doc: InstanceType<typeof PDFDocument>): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err) => reject(err));
    doc.end();
  });
};

export const streamPdf = (
  res: Response,
  buffer: Buffer,
  filename: string,
  isDownload = false,
): void => {
  const disposition = isDownload ? 'attachment' : 'inline';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.end(buffer);
};

export interface IReceiptPdfData {
  receiptNumber: string;
  issuedAt: Date;
  paidAt: Date | null;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  transactionId: string;
  billingMonth?: number;
  billingYear?: number;
  notes?: string | null;
  totalPaidForMonth?: number;
  remainingMonthDue?: number;
  effectiveMonthlyFee?: number;
  student: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  batch: {
    id: string;
    name: string;
    fee: number;
  };
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Generates an official payment receipt PDF buffer
 */
export const generateReceiptPdfBuffer = async (data: IReceiptPdfData): Promise<Buffer> => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const monthName = MONTH_NAMES[(data.billingMonth || 1) - 1] || 'Month';
  const billingPeriod = `${monthName} ${data.billingYear || getBangladeshCurrentYear()}`;

  // Header Banner
  doc.rect(0, 0, 595.28, 90).fill(PRIMARY_COLOR);
  doc
    .fillColor('#ffffff')
    .fontSize(20)
    .font('Helvetica-Bold')
    .text(config.ADMIN_INSTITUTION_NAME, 40, 25);
  doc.fontSize(10).font('Helvetica').text(config.ADMIN_INSTITUTION_ADDRESS, 40, 50);
  doc.text(
    `Phone: ${config.ADMIN_INSTITUTION_PHONE} | Email: ${config.ADMIN_INSTITUTION_EMAIL}`,
    40,
    65,
  );

  doc
    .fillColor(SECONDARY_COLOR)
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('OFFICIAL PAYMENT RECEIPT', 40, 110);
  doc.moveTo(40, 130).lineTo(555, 130).strokeColor(BORDER_COLOR).stroke();

  // Receipt Meta Box
  const metaTop = 145;
  doc.rect(40, metaTop, 515, 75).fill(BG_LIGHT).strokeColor(BORDER_COLOR).stroke();

  doc
    .fillColor(SECONDARY_COLOR)
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('RECEIPT NO:', 55, metaTop + 10);
  doc
    .fillColor('#000000')
    .font('Helvetica')
    .text(data.receiptNumber, 150, metaTop + 10);

  doc
    .fillColor(SECONDARY_COLOR)
    .font('Helvetica-Bold')
    .text('ISSUE DATE:', 55, metaTop + 24);
  doc
    .fillColor('#000000')
    .font('Helvetica')
    .text(formatInBangladeshTime(data.issuedAt, 'dd MMM yyyy, hh:mm a'), 150, metaTop + 24);

  doc
    .fillColor(SECONDARY_COLOR)
    .font('Helvetica-Bold')
    .text('BILLING PERIOD:', 55, metaTop + 38);
  doc
    .fillColor(PRIMARY_COLOR)
    .font('Helvetica-Bold')
    .text(billingPeriod.toUpperCase(), 150, metaTop + 38);

  doc
    .fillColor(SECONDARY_COLOR)
    .font('Helvetica-Bold')
    .text('TRANSACTION ID:', 55, metaTop + 52);
  doc
    .fillColor('#000000')
    .font('Helvetica')
    .text(data.transactionId, 150, metaTop + 52);

  // Paid Stamp Badge
  doc.rect(430, metaTop + 12, 110, 48).fill(ACCENT_COLOR);
  doc
    .fillColor('#ffffff')
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('PAID', 430, metaTop + 20, { width: 110, align: 'center' });
  doc
    .fontSize(8)
    .font('Helvetica')
    .text(data.paymentMethod.toUpperCase(), 430, metaTop + 40, { width: 110, align: 'center' });

  // Student Profile Box
  const studentTop = 235;
  doc
    .fillColor(PRIMARY_COLOR)
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('BILLED TO (STUDENT):', 40, studentTop);

  doc
    .rect(40, studentTop + 15, 515, 50)
    .strokeColor(BORDER_COLOR)
    .stroke();

  doc
    .fillColor('#000000')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text(data.student.name, 55, studentTop + 25);
  doc
    .fillColor(SECONDARY_COLOR)
    .font('Helvetica')
    .fontSize(9)
    .text(
      `Email: ${data.student.email} | Phone: ${data.student.phone || 'N/A'}`,
      55,
      studentTop + 40,
    );
  doc.text(`Student ID: ${data.student.id}`, 55, studentTop + 52);

  // Itemized Table
  const tableTop = 315;
  doc.rect(40, tableTop, 515, 25).fill(PRIMARY_COLOR);
  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
  doc.text('SL', 50, tableTop + 8);
  doc.text('DESCRIPTION / BATCH', 80, tableTop + 8);
  doc.text('FEE PERIOD', 310, tableTop + 8);
  doc.text('METHOD', 400, tableTop + 8);
  doc.text('AMOUNT', 480, tableTop + 8, { width: 65, align: 'right' });

  // Row
  doc
    .rect(40, tableTop + 25, 515, 32)
    .strokeColor(BORDER_COLOR)
    .stroke();
  doc.fillColor('#000000').fontSize(9).font('Helvetica');
  doc.text('1', 50, tableTop + 36);
  doc.text(`${data.batch.name} - Monthly Tuition`, 80, tableTop + 36, { width: 220 });
  doc.text(billingPeriod, 310, tableTop + 36);
  doc.text(data.paymentMethod, 400, tableTop + 36);
  doc
    .font('Helvetica-Bold')
    .text(`${data.currency.toUpperCase()} ${data.amount.toFixed(2)}`, 480, tableTop + 36, {
      width: 65,
      align: 'right',
    });

  // Total Summary
  const isPartialInfo =
    data.totalPaidForMonth !== undefined && data.remainingMonthDue !== undefined;
  const boxHeight = isPartialInfo ? 60 : 30;
  const totalTop = tableTop + 68;
  doc.rect(340, totalTop, 215, 30).fill(BG_LIGHT).strokeColor(BORDER_COLOR).stroke();
  doc
    .fillColor(PRIMARY_COLOR)
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('TOTAL PAID:', 350, totalTop + 10);
  doc
    .fillColor(ACCENT_COLOR)
    .text(`${data.currency.toUpperCase()} ${data.amount.toFixed(2)}`, 460, totalTop + 10, {
      width: 85,
      align: 'right',
    });
  doc.rect(320, totalTop, 235, boxHeight).fill(BG_LIGHT).strokeColor(BORDER_COLOR).stroke();

  if (isPartialInfo) {
    doc
      .fillColor(SECONDARY_COLOR)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('THIS PAYMENT:', 330, totalTop + 8);
    doc
      .fillColor(PRIMARY_COLOR)
      .text(`${data.currency.toUpperCase()} ${data.amount.toFixed(2)}`, 450, totalTop + 8, {
        width: 95,
        align: 'right',
      });

    doc
      .fillColor(SECONDARY_COLOR)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('TOTAL PAID (MONTH):', 330, totalTop + 24);
    doc
      .fillColor(ACCENT_COLOR)
      .text(
        `${data.currency.toUpperCase()} ${(data.totalPaidForMonth || 0).toFixed(2)}`,
        450,
        totalTop + 24,
        {
          width: 95,
          align: 'right',
        },
      );

    doc
      .fillColor(SECONDARY_COLOR)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('REMAINING DUE:', 330, totalTop + 40);
    doc
      .fillColor(data.remainingMonthDue && data.remainingMonthDue > 0 ? '#dc2626' : ACCENT_COLOR)
      .text(
        `${data.currency.toUpperCase()} ${(data.remainingMonthDue || 0).toFixed(2)}`,
        450,
        totalTop + 40,
        {
          width: 95,
          align: 'right',
        },
      );
  } else {
    doc
      .fillColor(PRIMARY_COLOR)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('TOTAL PAID:', 330, totalTop + 10);
    doc
      .fillColor(ACCENT_COLOR)
      .text(`${data.currency.toUpperCase()} ${data.amount.toFixed(2)}`, 450, totalTop + 10, {
        width: 95,
        align: 'right',
      });
  }

  if (data.notes) {
    doc
      .fillColor(SECONDARY_COLOR)
      .fontSize(9)
      .font('Helvetica-Oblique')
      .text(`Notes: ${data.notes}`, 40, totalTop + boxHeight + 15);
  }

  // Signatures and Footer
  const footerTop = 460;
  doc.moveTo(400, footerTop).lineTo(540, footerTop).strokeColor(SECONDARY_COLOR).stroke();
  doc
    .fillColor(SECONDARY_COLOR)
    .fontSize(9)
    .font('Helvetica')
    .text('Authorized Seal / Signature', 400, footerTop + 5, { width: 140, align: 'center' });

  doc.rect(40, 750, 515, 1).strokeColor(BORDER_COLOR).stroke();
  doc
    .fillColor(SECONDARY_COLOR)
    .fontSize(8)
    .font('Helvetica')
    .text(
      `This is a computer-generated receipt issued by ${config.ADMIN_INSTITUTION_NAME}. Valid without manual signature.`,
      40,
      760,
      { width: 515, align: 'center' },
    );

  return await docToBuffer(doc);
};

export interface IRoutinePdfData {
  batch: {
    id: string;
    name: string;
    fee: number;
  };
  schedules: Array<{
    id: string;
    dayOfWeek: string;
    subject: string;
    startTime: string;
    endTime: string;
    roomNumber: string;
    teacher: {
      name: string;
      email: string;
    };
  }>;
}

/**
 * Generates an official weekly batch routine schedule PDF
 */
export const generateRoutinePdfBuffer = async (data: IRoutinePdfData): Promise<Buffer> => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  // Header Banner
  doc.rect(0, 0, 595.28, 85).fill(PRIMARY_COLOR);
  doc
    .fillColor('#ffffff')
    .fontSize(18)
    .font('Helvetica-Bold')
    .text(config.ADMIN_INSTITUTION_NAME, 40, 20);
  doc.fontSize(10).font('Helvetica').text(`Weekly Class Timetable — ${data.batch.name}`, 40, 45);
  doc
    .fontSize(9)
    .text(`Generated on: ${formatInBangladeshTime(new Date(), 'dd MMM yyyy, hh:mm a')}`, 40, 62);

  let currentY = 105;

  if (data.schedules.length === 0) {
    doc
      .fillColor(SECONDARY_COLOR)
      .fontSize(12)
      .font('Helvetica-Oblique')
      .text('No class routines scheduled for this batch yet.', 40, currentY);
    return await docToBuffer(doc);
  }

  // Group schedules by Day of Week
  const days = ['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

  for (const day of days) {
    const daySchedules = data.schedules.filter((s) => s.dayOfWeek.toUpperCase() === day);
    if (daySchedules.length === 0) {
      continue;
    }

    // Day Header
    doc.rect(40, currentY, 515, 20).fill(PRIMARY_COLOR);
    doc
      .fillColor('#ffffff')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(day, 50, currentY + 5);
    currentY += 20;

    // Table Columns Header
    doc.rect(40, currentY, 515, 18).fill(BG_LIGHT).strokeColor(BORDER_COLOR).stroke();
    doc.fillColor(SECONDARY_COLOR).fontSize(8).font('Helvetica-Bold');
    doc.text('TIME SLOT', 50, currentY + 5);
    doc.text('SUBJECT', 170, currentY + 5);
    doc.text('ROOM', 330, currentY + 5);
    doc.text('INSTRUCTOR / TEACHER', 420, currentY + 5);
    currentY += 18;

    for (const schedule of daySchedules) {
      doc.rect(40, currentY, 515, 22).strokeColor(BORDER_COLOR).stroke();
      doc.fillColor('#000000').fontSize(9).font('Helvetica');
      doc.text(`${schedule.startTime} - ${schedule.endTime}`, 50, currentY + 6);
      doc.font('Helvetica-Bold').text(schedule.subject, 170, currentY + 6);
      doc.font('Helvetica').text(schedule.roomNumber, 330, currentY + 6);
      doc.text(schedule.teacher.name, 420, currentY + 6);
      currentY += 22;
    }

    currentY += 12;
  }

  // Footer
  doc.rect(40, 760, 515, 1).strokeColor(BORDER_COLOR).stroke();
  doc
    .fillColor(SECONDARY_COLOR)
    .fontSize(8)
    .font('Helvetica')
    .text(
      `${config.ADMIN_INSTITUTION_NAME} — Routine schedules are subject to administrative modifications.`,
      40,
      770,
      { width: 515, align: 'center' },
    );

  return await docToBuffer(doc);
};

export interface IReportCardPdfData {
  student: {
    id: string;
    name: string;
    email: string;
  };
  exam: {
    id: string;
    title: string;
    subject: string;
    examDate: Date;
    totalMarks: number;
    batchName: string;
  };
  result: {
    marksObtained: number;
    highestMarksInBatch?: number;
    percentage: number;
    grade: string;
    gpa: number;
    isPassed: boolean;
    remarks?: string | null;
  };
}

/**
 * Generates an official student exam report card PDF buffer
 */
export const generateReportCardPdfBuffer = async (data: IReportCardPdfData): Promise<Buffer> => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  // Header Banner
  doc.rect(0, 0, 595.28, 90).fill(PRIMARY_COLOR);
  doc
    .fillColor('#ffffff')
    .fontSize(20)
    .font('Helvetica-Bold')
    .text(config.ADMIN_INSTITUTION_NAME, 40, 22);
  doc.fontSize(10).font('Helvetica').text(config.ADMIN_INSTITUTION_ADDRESS, 40, 48);
  doc.fontSize(9).text('ACADEMIC PROGRESS REPORT & GRADE SHEET', 40, 64);

  // Student & Exam Meta Info Box
  const metaTop = 110;
  doc.rect(40, metaTop, 515, 75).fill(BG_LIGHT).strokeColor(BORDER_COLOR).stroke();

  doc
    .fillColor(SECONDARY_COLOR)
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('STUDENT NAME:', 55, metaTop + 12);
  doc
    .fillColor('#000000')
    .font('Helvetica-Bold')
    .text(data.student.name, 150, metaTop + 12);

  doc
    .fillColor(SECONDARY_COLOR)
    .font('Helvetica-Bold')
    .text('STUDENT EMAIL:', 55, metaTop + 28);
  doc
    .fillColor('#000000')
    .font('Helvetica')
    .text(data.student.email, 150, metaTop + 28);

  doc
    .fillColor(SECONDARY_COLOR)
    .font('Helvetica-Bold')
    .text('BATCH / CLASS:', 55, metaTop + 44);
  doc
    .fillColor('#000000')
    .font('Helvetica')
    .text(data.exam.batchName, 150, metaTop + 44);

  doc
    .fillColor(SECONDARY_COLOR)
    .font('Helvetica-Bold')
    .text('EXAM ASSESSMENT:', 55, metaTop + 60);
  doc
    .fillColor('#000000')
    .font('Helvetica')
    .text(data.exam.title, 150, metaTop + 60);

  // Grade Card Big Badge
  const badgeTop = 205;
  const badgeColor = data.result.isPassed ? ACCENT_COLOR : '#dc2626';
  doc.rect(40, badgeTop, 515, 70).fill(BG_LIGHT).strokeColor(BORDER_COLOR).stroke();

  doc.rect(55, badgeTop + 10, 100, 50).fill(badgeColor);
  doc
    .fillColor('#ffffff')
    .fontSize(22)
    .font('Helvetica-Bold')
    .text(data.result.grade, 55, badgeTop + 18, { width: 100, align: 'center' });
  doc
    .fontSize(9)
    .font('Helvetica')
    .text(data.result.isPassed ? 'PASSED' : 'FAILED', 55, badgeTop + 44, {
      width: 100,
      align: 'center',
    });

  doc
    .fillColor(PRIMARY_COLOR)
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('SCORE & GPA SUMMARY', 180, badgeTop + 15);
  doc.fillColor(SECONDARY_COLOR).fontSize(10).font('Helvetica');
  doc.text(
    `Marks Obtained: ${data.result.marksObtained} / ${data.exam.totalMarks} (${data.result.percentage}%)`,
    180,
    badgeTop + 32,
  );
  doc.text(`Grade Point (GPA): ${data.result.gpa.toFixed(2)} / 5.00`, 180, badgeTop + 47);

  // Detailed Marks Table
  const tableTop = 295;
  doc.rect(40, tableTop, 515, 25).fill(PRIMARY_COLOR);
  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
  doc.text('SUBJECT', 55, tableTop + 8);
  doc.text('TOTAL MARKS', 200, tableTop + 8);
  doc.text('OBTAINED', 300, tableTop + 8);
  doc.text('GRADE', 400, tableTop + 8);
  doc.text('GPA', 480, tableTop + 8, { width: 65, align: 'right' });

  doc
    .rect(40, tableTop + 25, 515, 30)
    .strokeColor(BORDER_COLOR)
    .stroke();
  doc.fillColor('#000000').fontSize(9).font('Helvetica');
  doc.text(data.exam.subject, 55, tableTop + 35);
  doc.text(data.exam.totalMarks.toString(), 200, tableTop + 35);
  doc.font('Helvetica-Bold').text(data.result.marksObtained.toString(), 300, tableTop + 35);
  doc.text(data.result.grade, 400, tableTop + 35);
  doc.text(data.result.gpa.toFixed(2), 480, tableTop + 35, { width: 65, align: 'right' });

  // Remarks
  if (data.result.remarks) {
    doc
      .fillColor(SECONDARY_COLOR)
      .fontSize(9)
      .font('Helvetica-Oblique')
      .text(`Remarks: ${data.result.remarks}`, 40, tableTop + 70);
  }

  // Signatures
  const footerTop = 440;
  doc.moveTo(70, footerTop).lineTo(210, footerTop).strokeColor(SECONDARY_COLOR).stroke();
  doc
    .fillColor(SECONDARY_COLOR)
    .fontSize(9)
    .font('Helvetica')
    .text('Course Instructor', 70, footerTop + 5, { width: 140, align: 'center' });

  doc.moveTo(380, footerTop).lineTo(520, footerTop).strokeColor(SECONDARY_COLOR).stroke();
  doc.text('Principal / Academic Head', 380, footerTop + 5, { width: 140, align: 'center' });

  doc.rect(40, 750, 515, 1).strokeColor(BORDER_COLOR).stroke();
  doc
    .fillColor(SECONDARY_COLOR)
    .fontSize(8)
    .font('Helvetica')
    .text(
      `Official Grade Sheet generated by ${config.ADMIN_INSTITUTION_NAME} on ${formatInBangladeshTime(new Date(), 'dd MMMM yyyy')}.`,
      40,
      760,
      { width: 515, align: 'center' },
    );

  return await docToBuffer(doc);
};
