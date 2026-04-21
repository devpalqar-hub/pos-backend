import {
    Body,
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Post,
} from '@nestjs/common';
import {
    ApiHeader,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';

import { CustomersAuthService } from './customers-auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Customer Authentication')
@Controller('customers')
export class CustomersAuthController {
    constructor(private readonly authService: CustomersAuthService) { }

    /*
    SEND OTP
    */
    @Public()
    @Post('auth/send-otp')
    @HttpCode(HttpStatus.OK)
    @ApiHeader({ name: 'ownerId', required: true, description: 'Owner UUID' })
    @ApiOperation({
        summary: 'Send OTP to customer email',
        description: `
Sends a **One Time Password (OTP)** to the customer's email.

Used for **login or registration verification**.

OTP expires in **10 minutes**.
`,
    })
    @ApiResponse({ status: 200, description: 'OTP sent successfully.' })
    async sendOtp(
        @Headers('ownerid') ownerId: string,
        @Body() dto: SendOtpDto,
    ) {
        return {
            message: 'OTP sent successfully',
            data: await this.authService.sendOtp(ownerId, dto),
        };
    }

    /*
    VERIFY OTP
    */
    @Public()
    @Post('auth/verify-otp')
    @HttpCode(HttpStatus.OK)
    @ApiHeader({ name: 'ownerId', required: true, description: 'Owner UUID' })
    @ApiOperation({
        summary: 'Verify customer OTP',
        description: `
Verifies the **OTP sent to the customer's email**.

If valid, OTP is cleared from the database.

Returns **isNew=true** when customer profile does not exist yet.
`,
    })
    @ApiResponse({ status: 200, description: 'OTP verified.' })
    @ApiResponse({ status: 400, description: 'Invalid OTP.' })
    @ApiResponse({ status: 410, description: 'OTP expired.' })
    async verifyOtp(
        @Headers('ownerid') ownerId: string,
        @Body() dto: VerifyOtpDto,
    ) {
        return {
            message: 'OTP verified successfully',
            data: await this.authService.verifyOtp(ownerId, dto),
        };
    }

    /*
    COMPLETE PROFILE
    */
    @Public()
    @Post('complete-profile')
    @HttpCode(HttpStatus.CREATED)
    @ApiHeader({ name: 'ownerId', required: true, description: 'Owner UUID' })
    @ApiOperation({
        summary: 'Complete customer profile after OTP verification',
        description: `
Creates or updates a **customer profile** for the owner's restaurant.

Rules:

• Same email can exist for **multiple restaurants**  
• Phone must be **unique per restaurant**  
• OTP verification must be completed before profile completion
`,
    })
    @ApiResponse({ status: 201, description: 'Customer profile completed.' })
    @ApiResponse({
        status: 409,
        description: 'Customer already exists in this restaurant.',
    })
    async completeProfile(
        @Headers('ownerid') ownerId: string,
        @Body() dto: RegisterCustomerDto,
    ) {
        return {
            message: 'Customer profile completed successfully',
            data: await this.authService.completeProfile(ownerId, dto),
        };
    }
}