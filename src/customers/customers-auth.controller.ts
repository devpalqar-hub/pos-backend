import {
    Body,
    Controller,
    Get,
    Headers,
    HttpCode,
    HttpStatus,
    Logger,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
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
import { CustomerJwtAuthGuard } from 'src/common/guards/customer-jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UpdateCustomerProfileDto } from 'src/customers/dto/update-customer-profile.dto';

@ApiTags('Customer Authentication')
@Controller('customers')
export class CustomersAuthController {
    private readonly logger = new Logger(CustomersAuthController.name);
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
        @Headers() headers: Record<string, string>,
        @Body() dto: SendOtpDto,
    ) {
        this.logger.log(
            `sendOtp request received: ownerId=${ownerId}, email=${dto.email}, origin=${headers?.origin ?? 'n/a'}`,
        );

        try {
            const data = await this.authService.sendOtp(ownerId, dto);
            this.logger.log(`sendOtp success: ownerId=${ownerId}, email=${dto.email}`);

            return {
                message: 'OTP sent successfully',
                data,
            };
        } catch (error: any) {
            this.logger.error(
                `sendOtp failed: ownerId=${ownerId}, email=${dto.email}, message=${error?.message}`,
                error?.stack,
            );
            throw error;
        }
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
        @Headers() headers: Record<string, string>,
        @Body() dto: VerifyOtpDto,
    ) {
        this.logger.log(
            `verifyOtp request received: ownerId=${ownerId}, email=${dto.email}, origin=${headers?.origin ?? 'n/a'}`,
        );

        try {
            const data = await this.authService.verifyOtp(ownerId, dto);
            this.logger.log(
                `verifyOtp success: ownerId=${ownerId}, email=${dto.email}, isNew=${data?.isNew}`,
            );

            return {
                message: 'OTP verified successfully',
                data,
            };
        } catch (error: any) {
            this.logger.error(
                `verifyOtp failed: ownerId=${ownerId}, email=${dto.email}, message=${error?.message}`,
                error?.stack,
            );
            throw error;
        }
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
        @Headers() headers: Record<string, string>,
        @Body() dto: RegisterCustomerDto,
    ) {
        this.logger.log(
            `completeProfile request received: ownerId=${ownerId}, email=${dto.email}, phone=${dto.phone}, origin=${headers?.origin ?? 'n/a'}`,
        );

        try {
            const data = await this.authService.completeProfile(ownerId, dto);
            this.logger.log(
                `completeProfile success: ownerId=${ownerId}, email=${dto.email}, customerId=${data?.customer?.id}`,
            );

            return {
                message: 'Customer profile completed successfully',
                data,
            };
        } catch (error: any) {
            this.logger.error(
                `completeProfile failed: ownerId=${ownerId}, email=${dto.email}, phone=${dto.phone}, message=${error?.message}`,
                error?.stack,
            );
            throw error;
        }
    }

    /*
    GET CUSTOMER PROFILE
    */
    @Public()
    @Get('profile')
    @UseGuards(CustomerJwtAuthGuard)
    @ApiBearerAuth('Bearer')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get logged-in customer profile',
        description: 'Returns profile details for the authenticated customer token.',
    })
    @ApiResponse({ status: 200, description: 'Customer profile fetched successfully.' })
    @ApiResponse({ status: 401, description: 'Customer authentication required.' })
    async getProfile(@CurrentUser() customer: any) {
        const data = await this.authService.getProfile(customer.id);

        return {
            message: 'Customer profile fetched successfully',
            data,
        };
    }

    /*
    UPDATE CUSTOMER PROFILE
    */
    @Public()
    @Patch('profile')
    @UseGuards(CustomerJwtAuthGuard)
    @ApiBearerAuth('Bearer')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Update logged-in customer profile',
        description:
            'Updates profile details for the authenticated customer. Phone and email remain unique per restaurant.',
    })
    @ApiResponse({ status: 200, description: 'Customer profile updated successfully.' })
    @ApiResponse({ status: 401, description: 'Customer authentication required.' })
    @ApiResponse({ status: 404, description: 'Customer not found.' })
    @ApiResponse({ status: 409, description: 'Phone or email already exists in this restaurant.' })
    async updateProfile(
        @CurrentUser() customer: any,
        @Body() dto: UpdateCustomerProfileDto,
    ) {
        const data = await this.authService.updateProfile(customer.id, dto);

        return {
            message: 'Customer profile updated successfully',
            data,
        };
    }
}