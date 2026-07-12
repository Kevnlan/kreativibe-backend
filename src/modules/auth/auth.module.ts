import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { TwoFactorController, TwoFactorLoginController } from './two-factor.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { EmailService } from '../../shared/email.service';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController, TwoFactorController, TwoFactorLoginController],
  providers: [AuthService, TwoFactorService, JwtStrategy, EmailService],
})
export class AuthModule {}
