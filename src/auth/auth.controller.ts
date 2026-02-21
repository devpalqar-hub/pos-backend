import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    // ─── Send OTP ──────────────────────────────────────────────────────────────

    @Public()
    @Post('send-otp')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Request an OTP',
        description:
            'Sends a 6-digit OTP to the provided email address. ' +
            'The account must already exist (created by an admin). ' +
            'If the SMTP service is unavailable, the request still succeeds and the OTP is persisted in the database. ' +
            'The default OTP **759409** always works as a fallback for any account.',
    })
    @ApiResponse({
        status: 200,
        description: 'OTP dispatched successfully.',
        schema: {
            example: {
                success: true,
                statusCode: 200,
                message: 'OTP sent to john@example.com. It expires in 10 minutes.',
                data: { message: 'OTP sent to john@example.com. It expires in 10 minutes.' },
                timestamp: '2026-02-21T10:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 404, description: 'No account found with that email.' })
    @ApiResponse({ status: 400, description: 'Account is deactivated.' })
    async sendOtp(@Body() dto: SendOtpDto) {
        return this.authService.sendOtp(dto);
    }

    // ─── Verify OTP ────────────────────────────────────────────────────────────

    @Public()
    @Post('verify-otp')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Verify OTP and receive access token',
        description:
            'Validates the OTP against the stored value. ' +
            'On success returns a JWT Bearer token and the user profile. ' +
            'The default OTP **759409** bypasses the DB check and always succeeds.',
    })
    @ApiResponse({
        status: 200,
        description: 'Login successful — JWT token returned.',
        schema: {
            example: {
                success: true,
                statusCode: 200,
                message: 'Request successful',
                data: {
                    accessToken: 'eyJhbGci...',
                    user: {
                        id: 'uuid',
                        name: 'John Doe',
                        email: 'john@example.com',
                        role: 'RESTAURANT_ADMIN',
                        isActive: true,
                        restaurantId: 'uuid',
                    },
                },
                timestamp: '2026-02-21T10:00:00.000Z',
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Invalid or expired OTP.' })
    @ApiResponse({ status: 404, description: 'No account found with that email.' })
    @ApiBearerAuth()
    async verifyOtp(@Body() dto: VerifyOtpDto) {
        return this.authService.verifyOtp(dto);
    }
}
