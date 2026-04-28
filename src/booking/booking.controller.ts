import {
    Body,
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';

import {
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';

import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

import { Public } from '../common/decorators/public.decorator';
import { OptionalCustomerJwtAuthGuard } from '../common/guards/ optional-jwt-auth.guard';

@ApiTags('Booking')
@Public()
@UseGuards(OptionalCustomerJwtAuthGuard)
@Controller('restaurants/:restaurantId/bookings')
export class BookingController {
    constructor(private readonly bookingService: BookingService) { }

    private resolveSessionId(
        req: Request,
        headersSessionId?: string,
        querySessionId?: string,
        legacyGuestId?: string,
    ): string | undefined {
        const cookieHeader = req.headers.cookie;
        const sidFromCookie = cookieHeader
            ?.split(';')
            .map((c) => c.trim())
            .find((c) => c.startsWith('sid='))
            ?.split('=')[1];

        return sidFromCookie || headersSessionId || querySessionId || legacyGuestId;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiParam({
        name: 'restaurantId',
        description: 'Restaurant UUID for which the booking is being created',
    })
    @ApiQuery({
        name: 'sessionId',
        required: false,
        type: String,
        description:
            'Unique session identifier used for cart operations when the user is not authenticated.',
    })

    @ApiOperation({
        summary: 'Create a new booking from cart',
        description: `
Creates a **restaurant order booking** from an existing cart.

This API is used by the restaurant’s **online ordering platform** where
customers place orders through the restaurant website or mobile application.

The booking creation process performs the following internal workflow:

### Booking Flow

1. **Validate Cart**
    - If JWT token is present, cart is resolved by authenticated customer.
    - If token is absent, cart is resolved by \`sessionId\`.
    - Ensures the cart belongs to the specified restaurant.

2. **Guest Validation**
    - If the request is made without authentication and only \`sessionId\` is provided,
     the system requires customer details such as:
     - customerName
     - customerPhone
     - customerEmail
     - deliveryAddress

3. **Apply Discounts**
   - If a **coupon** is provided, the system validates:
     - coupon validity
     - usage limits
     - restaurant ownership
   - If **loyalty points** are claimed, the system verifies available points.

4. **Create Stripe Checkout Session**
    - The order is not created yet.
    - A Stripe checkout link is generated using the cart total.

5. **Payment Webhook Handles Order Creation**
    - After Stripe confirms payment, the webhook creates:
      - **OrderSession**
      - **OrderBatch**
      - **OrderItems**
      - **Bill**
      - **Payment**
    - WebSocket events are emitted only after successful payment.

---

### Order Data Structure

\`\`\`
OrderSession
   └── OrderBatch
          └── OrderItems[]
\`\`\`

---

### Supported User Types

This endpoint supports:

**1. Authenticated Customers**
- Uses JWT token
- Customer data retrieved automatically

**2. Guest Users**
- Uses \`sessionId\`
- Must provide customer details in the request body

---

### Future Extensions

The following features will be integrated in future versions:

- Online payment gateway integration (Stripe / Razorpay)
- Delivery partner integrations
- Real-time delivery tracking
- Order status notifications
`,
    })

    @ApiResponse({
        status: 201,
        description:
            'Booking created successfully. Stripe checkout link returned; order is created after payment success.',
    })

    @ApiResponse({
        status: 400,
        description:
            'Invalid request. Possible causes include empty cart, invalid coupon, or missing guest details.',
    })

    @ApiResponse({
        status: 404,
        description: 'Cart not found for the specified restaurant.',
    })
    async createBooking(
        @CurrentUser() actor: any,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: CreateBookingDto,
        @Req() req: Request,
        @Headers('x-session-id') headerSessionId?: string,
        @Query('sessionId') querySessionId?: string,
        @Query('guestId') legacyGuestId?: string,

    ) {
        const sessionId = this.resolveSessionId(
            req,
            headerSessionId,
            querySessionId,
            legacyGuestId,
        );
        return {
            message: 'Booking created successfully',
            data: await this.bookingService.createBooking(
                actor,
                restaurantId,
                sessionId,
                dto,
            ),
        };
    }
}