import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST'),
      port: Number(config.get('SMTP_PORT')),
      auth: { user: config.get('SMTP_USER'), pass: config.get('SMTP_PASS') },
    });
  }

  async sendVerificationEmail(to: string, token: string) {
    const url = `${this.config.get('FRONTEND_URL')}/auth/verify-email?token=${token}`;
    await this.transporter.sendMail({
      from: this.config.get('EMAIL_FROM'),
      to,
      subject: 'Verify your Kreativibe email',
      html: `<p>Click <a href="${url}">here</a> to verify your email. Link expires in 24 hours.</p>`,
    });
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const url = `${this.config.get('FRONTEND_URL')}/auth/reset-password?token=${token}`;
    await this.transporter.sendMail({
      from: this.config.get('EMAIL_FROM'),
      to,
      subject: 'Reset your Kreativibe password',
      html: `<p>Click <a href="${url}">here</a> to reset your password. Link expires in 1 hour.</p>`,
    });
  }
}
