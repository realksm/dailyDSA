// Outgoing email. Production sends over SMTP (any provider: Brevo, Zoho, SES, ...);
// development prints mails to the console so reset links can be clicked locally.
import nodemailer from "nodemailer";
import type { Config } from "./config.js";

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

export function createMailer(config: Config): Mailer {
  if (!config.smtpUrl) return consoleMailer();
  const transport = nodemailer.createTransport(config.smtpUrl);
  return {
    async send(mail) {
      await transport.sendMail({ from: config.mailFrom, ...mail });
    },
  };
}

export function consoleMailer(log: (s: string) => void = console.log): Mailer {
  return {
    async send(mail) {
      log(`\n──── mail to ${mail.to} ────\nSubject: ${mail.subject}\n\n${mail.text}\n────────────────────────────`);
    },
  };
}

/** Collects mails in memory (tests). */
export function memoryMailer(): Mailer & { sent: Mail[] } {
  const sent: Mail[] = [];
  return {
    sent,
    async send(mail) {
      sent.push(mail);
    },
  };
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function passwordResetMail(to: string, name: string, link: string, minutes: number): Mail {
  return {
    to,
    subject: "Reset your dailyDSA password",
    text:
      `Hi ${name},\n\nSomeone (hopefully you) asked to reset your dailyDSA password.\n` +
      `Open this link within ${minutes} minutes to choose a new one:\n\n${link}\n\n` +
      `If you didn't ask for this, ignore this email — your password stays the same.\n`,
    html:
      `<p>Hi ${escapeHtml(name)},</p><p>Someone (hopefully you) asked to reset your dailyDSA password.</p>` +
      `<p><a href="${escapeHtml(link)}">Choose a new password</a> (valid for ${minutes} minutes)</p>` +
      `<p>If you didn't ask for this, ignore this email — your password stays the same.</p>`,
  };
}
