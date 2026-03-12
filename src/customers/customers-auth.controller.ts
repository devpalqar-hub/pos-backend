import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CustomersAuthService } from './customers-auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Customer Authentication')
@Controller('restaurants/:restaurantId/customers')
export class CustomersAuthController {
    constructor(private readonly authService: CustomersAuthService) { }

    /*
    SEND OTP
    */
    @Public()
    @Post('auth/send-otp/')
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Send OTP to customer email',
        description: `
Sends a **One Time Password (OTP)** to the customer's email.

Used for **login or registration verification**.

OTP expires in **10 minutes**.
`,
    })
    @ApiResponse({ status: 200, description: 'OTP sent successfully.' })
    @ApiResponse({ status: 404, description: 'Customer not found.' })
    async sendOtp(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: SendOtpDto,
    ) {
        return {
            message: 'OTP sent successfully',
            data: await this.authService.sendOtp(restaurantId, dto),
        };
    }

    /*
    VERIFY OTP
    */
    @Public()
    @Post('auth/verify-otp/')
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Verify customer OTP',
        description: `
Verifies the **OTP sent to the customer's email**.

If valid, OTP is cleared from the database.
`,
    })
    @ApiResponse({ status: 200, description: 'OTP verified.' })
    @ApiResponse({ status: 400, description: 'Invalid OTP.' })
    @ApiResponse({ status: 410, description: 'OTP expired.' })
    async verifyOtp(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: VerifyOtpDto,
    ) {
        return {
            message: 'OTP verified successfully',
            data: await this.authService.verifyOtp(restaurantId, dto),
        };
    }

    /*
    REGISTER CUSTOMER
    */
    @Public()
    @Post('register/')
    @HttpCode(HttpStatus.CREATED)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Register customer for a restaurant',
        description: `
Registers a **customer account for the specified restaurant**.

Rules:

• Same email can register for **multiple restaurants**  
• Phone must be **unique per restaurant**  
• OTP verification must be completed before registration
`,
    })
    @ApiResponse({ status: 201, description: 'Customer registered.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    @ApiResponse({
        status: 409,
        description: 'Customer already exists in this restaurant.',
    })
    async register(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: RegisterCustomerDto,
    ) {
        return {
            message: 'Customer registered successfully',
            data: await this.authService.registerCustomer(restaurantId, dto),
        };
    }
}