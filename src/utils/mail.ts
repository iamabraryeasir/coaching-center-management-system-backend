import path from 'node:path';
import { getYear } from 'date-fns';
import ejs from 'ejs';
import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from './logger';

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_PORT === 465,
  auth:
    config.SMTP_USER && config.SMTP_PASS
      ? {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        }
      : undefined,
});

export interface IEmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface ISendEmailOptions<T extends Record<string, unknown> = Record<string, unknown>> {
  to: string;
  subject: string;
  templateName: string;
  data: T;
  text?: string;
  attachments?: IEmailAttachment[];
}

export const sendEmail = async <T extends Record<string, unknown> = Record<string, unknown>>(
  options: ISendEmailOptions<T>,
): Promise<void> => {
  const { to, subject, templateName, data, text, attachments } = options;
  const fileName = templateName.endsWith('.ejs') ? templateName : `${templateName}.ejs`;
  const templatePath = path.join(process.cwd(), 'src', 'templates', 'emails', fileName);

  const html = await ejs.renderFile(templatePath, {
    ...data,
    institutionName: config.ADMIN_INSTITUTION_NAME,
    year: data.year || getYear(new Date()),
  });

  if (!config.SMTP_USER || !config.SMTP_PASS) {
    logger.info('================================================================');
    logger.info(`  [EMAIL DISPATCH (DEV FALLBACK)] Template: ${templateName}`);
    logger.info(`  To          : ${to}`);
    logger.info(`  Subject     : ${subject}`);
    if (attachments && attachments.length > 0) {
      logger.info(`  Attachments : ${attachments.map((a) => a.filename).join(', ')}`);
    }
    logger.info('================================================================');
    return;
  }

  try {
    await transporter.sendMail({
      from: config.EMAIL_FROM,
      to,
      subject,
      html,
      text: text || `You have received a new notification regarding: ${subject}`,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType || 'application/pdf',
      })),
    });
    logger.info(`Email successfully dispatched to ${to} [Template: ${templateName}]`);
  } catch (error) {
    logger.error(`Failed to send email to ${to} [Template: ${templateName}]:`, error);
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  resetUrl: string,
): Promise<void> => {
  await sendEmail({
    to: email,
    subject: `Password Reset Request — ${config.ADMIN_INSTITUTION_NAME}`,
    templateName: 'password-reset',
    data: {
      name,
      resetUrl,
      year: getYear(new Date()),
    },
    text: `Hello ${name},\n\nWe received a request to reset your password. Use the link below:\n\n${resetUrl}\n\nValid for 15 minutes.`,
  });
};

export const sendReportCardEmail = async (
  email: string,
  name: string,
  examTitle: string,
  subject: string,
  grade: string,
  gpa: number,
  pdfBuffer: Buffer,
): Promise<void> => {
  await sendEmail({
    to: email,
    subject: `Official Exam Report Card: ${examTitle} — ${config.ADMIN_INSTITUTION_NAME}`,
    templateName: 'student-report-card',
    data: {
      name,
      examTitle,
      subject,
      grade,
      gpa: gpa.toFixed(2),
    },
    text: `Hello ${name},\n\nYour official report card for ${examTitle} (${subject}) has been published. Grade: ${grade} (GPA: ${gpa.toFixed(2)}). Your grade sheet PDF is attached.`,
    attachments: [
      {
        filename: `ReportCard-${examTitle.replace(/\s+/g, '_')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
};
