import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../../shared/email.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private email: EmailService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException({ message: 'Email already registered', code: 'EMAIL_EXISTS' });

    if (dto.countryId) {
      const country = await this.prisma.country.findUnique({ where: { id: dto.countryId } });
      if (!country) throw new NotFoundException({ message: 'Country not found', code: 'COUNTRY_NOT_FOUND' });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email: dto.email, passwordHash, name: dto.name, role: dto.role as any, countryId: dto.countryId },
      });
      if (dto.role === 'CREATOR') {
        await tx.creatorProfile.create({ data: { userId: created.id } });
      } else {
        await tx.brandProfile.create({ data: { userId: created.id, companyName: dto.name } });
      }
      return created;
    });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    await this.prisma.passwordReset.create({
      data: { token: verifyToken, userId: user.id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });
    await this.email.sendVerificationEmail(user.email, verifyToken);

    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.email, user.role);
    const profile = await this.getProfile(user.id, user.role as string);

    return { user: this.sanitizeUser(user), accessToken, refreshToken, ...profile };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const valid = user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!valid) throw new UnauthorizedException({ message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    if (!user.isEmailVerified) throw new ForbiddenException({ message: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' });

    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.email, user.role);
    const profile = await this.getProfile(user.id, user.role as string);

    return { user: this.sanitizeUser(user), accessToken, refreshToken, ...profile };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  async refresh(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException({ message: 'Invalid or expired token', code: 'INVALID_TOKEN' });
    }
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: stored.userId } });
    return this.generateTokens(user.id, user.email, user.role);
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;
    await this.prisma.passwordReset.updateMany({ where: { userId: user.id, used: false }, data: { used: true } });
    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.passwordReset.create({
      data: { token, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    await this.email.sendPasswordResetEmail(user.email, token);
  }

  async resetPassword(token: string, password: string) {
    const record = await this.prisma.passwordReset.findUnique({ where: { token } });
    if (!record || record.used || record.expiresAt < new Date()) {
      throw new BadRequestException({ message: 'Invalid or expired token', code: 'INVALID_TOKEN' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.$transaction([
      this.prisma.passwordReset.update({ where: { id: record.id }, data: { used: true } }),
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
    ]);
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.passwordReset.findUnique({ where: { token } });
    if (!record || record.used || record.expiresAt < new Date()) {
      throw new BadRequestException({ message: 'Invalid or expired token', code: 'INVALID_TOKEN' });
    }
    await this.prisma.$transaction([
      this.prisma.passwordReset.update({ where: { id: record.id }, data: { used: true } }),
      this.prisma.user.update({ where: { id: record.userId }, data: { isEmailVerified: true } }),
    ]);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const profile = await this.getProfile(userId, user.role as string);
    return { user: this.sanitizeUser(user), ...profile };
  }

  private async generateTokens(userId: string, email: string, role: any) {
    const accessToken = this.jwt.sign(
      { sub: userId, email, role },
      { secret: this.config.get('JWT_ACCESS_SECRET'), expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN') },
    );
    const rawRefresh = crypto.randomBytes(40).toString('hex');
    await this.prisma.refreshToken.create({
      data: { token: rawRefresh, userId, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });
    return { accessToken, refreshToken: rawRefresh };
  }

  private async getProfile(userId: string, role: string) {
    if (role === 'CREATOR') {
      return { creatorProfile: await this.prisma.creatorProfile.findUnique({ where: { userId } }), brandProfile: null };
    }
    return { creatorProfile: null, brandProfile: await this.prisma.brandProfile.findUnique({ where: { userId } }) };
  }

  private sanitizeUser(user: any) {
    const { passwordHash: _, ...safe } = user;
    return safe;
  }
}
