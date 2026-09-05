import path from 'node:path';
import { getYear } from 'date-fns';
import ejs from 'ejs';
import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from './logger';

/**
 * Creates the Nodemailer SMTP transport using environment configuration
 */
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

/**
 * Universal email payload options
 */
export interface ISendEmailOptions<T extends Record<string, unknown> = Record<string, unknown>> {
  to: string;
  subject: string;
  templateName: string; // e.g. 'password-reset' or 'teacher-welcome'
  data: T;
  text?: string;
}

/**
 * Generic, reusable utility to render any EJS email template and dispatch an email via Nodemailer.
 * All email templates reside in: src/templates/emails/<templateName>.ejs
 */
export const sendEmail = async <T extends Record<string, unknown> = Record<string, unknown>>(
  options: ISendEmailOptions<T>,
): Promise<void> => {
  const { to, subject, templateName, data, text } = options;
  const fileName = templateName.endsWith('.ejs') ? templateName : `${templateName}.ejs`;
  const templatePath = path.join(process.cwd(), 'src', 'templates', 'emails', fileName);

  // Render the EJS template into styled HTML
  const html = await ejs.renderFile(templatePath, {
    ...data,
    year: data.year || getYear(new Date()),
  });

  // Development Fallback: If SMTP credentials are not configured, print to terminal
  if (!config.SMTP_USER || !config.SMTP_PASS) {
    logger.info('================================================================');
    logger.info(`  [EMAIL DISPATCH (DEV FALLBACK)] Template: ${templateName}`);
    logger.info(`  To          : ${to}`);
    logger.info(`  Subject     : ${subject}`);
    if (data.resetUrl) {
      logger.info(`  Action URL  : ${data.resetUrl}`);
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
    });
    logger.info(`Email successfully dispatched to ${to} [Template: ${templateName}]`);
  } catch (error) {
    logger.error(`Failed to send email to ${to} [Template: ${templateName}]:`, error);
  }
};

/**
 * Pre-configured wrapper for Password Reset notification
 */
export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  resetUrl: string,
): Promise<void> => {
  await sendEmail({
    to: email,
    subject: 'Password Reset Request — Coaching Center Management System',
    templateName: 'password-reset',
    data: {
      name,
      resetUrl,
      year: getYear(new Date()),
    },
    text: `Hello ${name},\n\nWe received a request to reset your password. Use the link below to choose a new password:\n\n${resetUrl}\n\nThis link is valid for 15 minutes.\n\nIf you did not make this request, please ignore this email.`,
  });
};
