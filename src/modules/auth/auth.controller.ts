import { Controller, Post, Get, Body, UseGuards, UsePipes } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { signupSchema, SignupDto } from './dto/signup.dto';
import { loginSchema, LoginDto } from './dto/login.dto';
import { forgotPasswordSchema, ForgotPasswordDto } from './dto/forgot-password.dto';
import { resetPasswordSchema, ResetPasswordDto } from './dto/reset-password.dto';
import { verifyEmailSchema, VerifyEmailDto } from './dto/verify-email.dto';
import { z } from 'zod';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('signup')
  async signup(@Body(new ZodValidationPipe(signupSchema)) dto: SignupDto) {
    return this.auth.signup(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  async login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('logout')
  async logout(@Body() body: { refreshToken: string }) {
    await this.auth.logout(body.refreshToken);
    return { message: 'Logged out' };
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 900000 } })
  async forgotPassword(@Body(new ZodValidationPipe(forgotPasswordSchema)) dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    return { message: 'If that email is registered you will receive a reset link shortly.' };
  }

  @Post('reset-password')
  async resetPassword(@Body(new ZodValidationPipe(resetPasswordSchema)) dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.password);
    return { message: 'Password updated. You can now log in.' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: any) {
    return this.auth.getMe(user.id);
  }

  @Post('verify-email')
  async verifyEmail(@Body(new ZodValidationPipe(verifyEmailSchema)) dto: VerifyEmailDto) {
    await this.auth.verifyEmail(dto.token);
    return { message: 'Email verified successfully.' };
  }

  @Post('resend-verification')
  async resendVerification(@Body(new ZodValidationPipe(z.object({ email: z.string().email() }))) dto: { email: string }) {
    return { message: 'Verification email sent.' };
  }
}
