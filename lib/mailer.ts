// lib/mailer.ts (서버 전용)
import 'server-only';
import nodemailer from 'nodemailer';

const PORT = Number(process.env.SMTP_PORT ?? 465);
const SECURE = PORT === 465; // 465면 implicit TLS(true), 587이면 false

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port: PORT,
  secure: SECURE,
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
  requireTLS: !SECURE, // 587일 때 STARTTLS 강제
  tls: { minVersion: 'TLSv1.2', servername: 'smtp.gmail.com' },
  logger: true,
  debug: true,
});

export async function sendMail(opts: { to: string; subject: string; text?: string; html?: string }) {
  await transporter.sendMail({
    from: `"Bet Friend" <${process.env.SMTP_USER}>`,
    ...opts,
  });
}
