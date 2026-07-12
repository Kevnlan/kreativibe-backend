import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from './auth.service';
import { DisableTwoFactorDto, LoginTwoFactorDto } from './dto/two-factor.dto';

const BACKUP_CODE_COUNT = 5;

@Injectable()
export class TwoFactorService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private auth: AuthService,
  ) {}

  private generateBackupCodes() {
    return Array.from({ length: BACKUP_CODE_COUNT }, () => Math.floor(10000000 + Math.random() * 90000000).toString());
  }

  async setup(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, 'Kreativibe', secret);
    const qrCodeUrl = await qrcode.toDataURL(otpauthUrl);

    const backupCodes = this.generateBackupCodes();
    const hashedCodes = await Promise.all(backupCodes.map((code) => bcrypt.hash(code, 10)));

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret, backupCodes: hashedCodes },
    });

    return {
      setup: { secret, qrCodeUrl, backupCodes },
      message: 'Scan the QR code with your authenticator app',
    };
  }

  async verify(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.twoFactorSecret || !authenticator.check(code, user.twoFactorSecret)) {
      throw new BadRequestException({ message: 'Invalid verification code', code: 'INVALID_2FA_CODE' });
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true, twoFactorEnabledAt: new Date() },
    });
    return { verified: true, message: 'Two-factor authentication enabled successfully' };
  }

  async status(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      enabled: user.twoFactorEnabled,
      enabledAt: user.twoFactorEnabledAt,
      backupCodesRemaining: user.backupCodes.length,
    };
  }

  private async consumeBackupCode(userId: string, backupCodes: string[], code: string) {
    for (let i = 0; i < backupCodes.length; i++) {
      if (await bcrypt.compare(code, backupCodes[i])) {
        const remaining = [...backupCodes.slice(0, i), ...backupCodes.slice(i + 1)];
        await this.prisma.user.update({ where: { id: userId }, data: { backupCodes: remaining } });
        return true;
      }
    }
    return false;
  }

  private async verifyCodeOrBackup(userId: string, secret: string, backupCodes: string[], code: string) {
    if (authenticator.check(code, secret)) return true;
    return this.consumeBackupCode(userId, backupCodes, code);
  }

  async disable(userId: string, dto: DisableTwoFactorDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new BadRequestException({ message: 'Invalid password', code: 'INVALID_PASSWORD' });

    if (!user.twoFactorSecret || !(await this.verifyCodeOrBackup(userId, user.twoFactorSecret, user.backupCodes, dto.code))) {
      throw new BadRequestException({ message: 'Invalid verification code', code: 'INVALID_2FA_CODE' });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorEnabledAt: null, backupCodes: [] },
    });
    return { message: 'Two-factor authentication disabled successfully' };
  }

  async regenerateBackupCodes(userId: string) {
    const backupCodes = this.generateBackupCodes();
    const hashedCodes = await Promise.all(backupCodes.map((code) => bcrypt.hash(code, 10)));
    await this.prisma.user.update({ where: { id: userId }, data: { backupCodes: hashedCodes } });
    return { backupCodes, message: 'Backup codes regenerated successfully. Previous codes are now invalid.' };
  }

  async loginWithTwoFactor(dto: LoginTwoFactorDto) {
    let payload: { sub: string; type: string };
    try {
      payload = this.jwt.verify(dto.sessionToken, { secret: this.config.get('JWT_ACCESS_SECRET') });
    } catch {
      throw new UnauthorizedException({ message: 'Invalid or expired session token', code: 'INVALID_SESSION_TOKEN' });
    }
    if (payload.type !== '2fa-pending') {
      throw new UnauthorizedException({ message: 'Invalid or expired session token', code: 'INVALID_SESSION_TOKEN' });
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
    if (!user.twoFactorSecret || !(await this.verifyCodeOrBackup(user.id, user.twoFactorSecret, user.backupCodes, dto.code))) {
      throw new BadRequestException({ message: 'Invalid verification code', code: 'INVALID_2FA_CODE' });
    }

    const { accessToken, refreshToken } = await this.auth.generateTokens(user.id, user.email, user.role);
    const profile = await this.auth.getProfile(user.id, user.role as string);
    return { user: this.auth.sanitizeUser(user), accessToken, refreshToken, ...profile };
  }
}
