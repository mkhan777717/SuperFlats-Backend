// utils/emailService.js
const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter;

/**
 * Builds the mail transporter from environment variables.
 * - EMAIL_USER / EMAIL_PASS: account credentials (for Gmail use an App Password).
 * - EMAIL_SERVICE_PROVIDER: a nodemailer well-known service name, e.g. "gmail", "outlook365".
 * - Or SMTP_HOST / SMTP_PORT / SMTP_SECURE for any other SMTP server (SendGrid, Mailgun, SES...).
 * - EMAIL_FROM (optional): sender shown to users, defaults to "Superflats <EMAIL_USER>".
 */
const getTransporter = () => {
    if (transporter) return transporter;

    const { EMAIL_SERVICE_PROVIDER, EMAIL_USER, EMAIL_PASS, SMTP_HOST, SMTP_PORT, SMTP_SECURE } = process.env;
    if (!EMAIL_USER || !EMAIL_PASS) {
        throw new Error('Email is not configured: EMAIL_USER and EMAIL_PASS are required.');
    }

    const auth = { user: EMAIL_USER, pass: EMAIL_PASS };
    transporter = SMTP_HOST
        ? nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT || 587), secure: SMTP_SECURE === 'true', auth })
        : nodemailer.createTransport({ service: EMAIL_SERVICE_PROVIDER || 'gmail', auth });
    return transporter;
};

const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Sends the "reset your password" email with a one-time link.
 */
exports.sendPasswordResetEmail = async ({ to, name, resetUrl, expiresInMinutes }) => {
    const from = process.env.EMAIL_FROM || `Superflats <${process.env.EMAIL_USER}>`;
    const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi,';

    const text = [
        name ? `Hi ${name},` : 'Hi,',
        '',
        'We received a request to reset the password for your Superflats account.',
        `Open this link to choose a new password (it expires in ${expiresInMinutes} minutes):`,
        resetUrl,
        '',
        "If you didn't ask for this, you can ignore this email. Your password won't change.",
        '',
        '— Superflats',
    ].join('\n');

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1f2a3c">
        <h2 style="color:#12305a;margin:0 0 16px">Reset your password</h2>
        <p>${greeting}</p>
        <p>We received a request to reset the password for your Superflats account.</p>
        <p style="margin:28px 0">
          <a href="${escapeHtml(resetUrl)}" style="background:#12305a;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:bold">Choose a new password</a>
        </p>
        <p style="font-size:14px;color:#5b6475">This link expires in ${expiresInMinutes} minutes and can be used once.</p>
        <p style="font-size:14px;color:#5b6475">If you didn't ask for this, you can ignore this email. Your password won't change.</p>
      </div>`;

    const info = await getTransporter().sendMail({ from, to, subject: 'Reset your Superflats password', text, html });
    logger.info(`Password reset email sent to ${to} (message ${info.messageId})`);
};
