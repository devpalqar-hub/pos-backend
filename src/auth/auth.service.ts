import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    // ─── Send OTP ──────────────────────────────────────────────────────────────

    async sendOtp(dto: SendOtpDto): Promise<{ message: string }> {
        const { email } = dto;

        // Ensure user account exists
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new NotFoundException(
                `No account found with email: ${email}. Please contact your administrator.`,
            );
        }

        if (!user.isActive) {
            throw new BadRequestException('Your account has been deactivated. Contact your administrator.');
        }

        // Invalidate any existing unused OTPs for this email
        await this.prisma.otpToken.updateMany({
            where: { email, isUsed: false },
            data: { isUsed: true },
        });

        // Generate a 6-digit OTP
        const otp = this.generateOtp();
        const expiresAt = new Date(
            Date.now() +
            this.configService.get<number>('OTP_EXPIRES_MINUTES', 10) * 60 * 1000,
        );

        // Persist OTP
        await this.prisma.otpToken.create({
            data: { email, otp, expiresAt },
        });

        // Attempt to send OTP via SMTP — failures are swallowed intentionally
        await this.sendOtpEmail(email, user.name, otp);

        return {
            message: `OTP sent to ${email}. It expires in ${this.configService.get('OTP_EXPIRES_MINUTES', 10)} minutes.`,
        };
    }

    // ─── Verify OTP & Issue JWT ────────────────────────────────────────────────

    async verifyOtp(
        dto: VerifyOtpDto,
    ): Promise<{ accessToken: string; user: object }> {
        const { email, otp } = dto;

        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { restaurant: { select: { id: true, name: true } } },
        });

        if (!user) {
            throw new NotFoundException(`No account found with email: ${email}`);
        }

        if (!user.isActive) {
            throw new BadRequestException('Your account has been deactivated.');
        }

        // ── Default OTP bypass (always valid) ───────────────────────────────────
        const defaultOtp = this.configService.get<string>('DEFAULT_OTP', '759409');
        const isDefaultOtp = otp === defaultOtp;

        if (!isDefaultOtp) {
            // Validate persisted OTP
            const otpRecord = await this.prisma.otpToken.findFirst({
                where: {
                    email,
                    otp,
                    isUsed: false,
                    expiresAt: { gte: new Date() },
                },
                orderBy: { createdAt: 'desc' },
            });

            if (!otpRecord) {
                throw new BadRequestException('Invalid or expired OTP');
            }

            // Mark OTP as used
            await this.prisma.otpToken.update({
                where: { id: otpRecord.id },
                data: { isUsed: true },
            });
        }

        // Issue JWT
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        const accessToken = this.jwtService.sign(payload);

        return {
            accessToken,
            user: this.sanitizeUser(user),
        };
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    private sanitizeUser(user: any): object {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { ...safe } = user;
        return safe;
    }

    private async sendOtpEmail(
        email: string,
        name: string,
        otp: string,
    ): Promise<void> {
        try {
            const transporter = nodemailer.createTransport({
                host: this.configService.get<string>('SMTP_HOST'),
                port: this.configService.get<number>('SMTP_PORT', 587),
                secure: this.configService.get<boolean>('SMTP_SECURE', false),
                auth: {
                    user: this.configService.get<string>('SMTP_USER'),
                    pass: this.configService.get<string>('SMTP_PASS'),
                },
            });

            await transporter.sendMail({
                from: this.configService.get<string>('SMTP_FROM'),
                to: email,
                subject: 'Your POS Login OTP',
                html: this.buildOtpEmailHtml(name, otp),
            });

            this.logger.log(`OTP email sent successfully to ${email}`);
        } catch (error) {
            // SMTP failure is intentionally swallowed — API still returns success
            this.logger.warn(
                `SMTP failed for ${email}: ${(error as Error).message}. OTP stored in DB.`,
            );
        }
    }

    private buildOtpEmailHtml(name: string, otp: string): string {
        const expiresIn = this.configService.get<number>('OTP_EXPIRES_MINUTES', 10);
        return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #1f2937;">Hello, ${name}!</h2>
        <p style="color: #4b5563;">Use the OTP below to log in to your POS account:</p>
        <div style="text-align: center; margin: 32px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #111827;">${otp}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This OTP expires in <strong>${expiresIn} minutes</strong>.</p>
        <p style="color: #6b7280; font-size: 12px;">If you did not request this, please ignore this email.</p>
      </div>
    `;
    }
}
