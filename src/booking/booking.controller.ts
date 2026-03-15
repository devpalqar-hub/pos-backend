import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';

import {
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';

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

    @Post()
    @HttpCode(HttpStatus.CREATED)

    @ApiParam({
        name: 'restaurantId',
        description: 'Restaurant UUID for which the booking is being created',
    })

    @ApiQuery({
        name: 'guestId',
        required: false,
        type: String,
        description:
            'Unique guest identifier used for cart operations when the user is not authenticated.',
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
   - The system verifies the provided \`cartId\`.
   - Ensures the cart belongs to the specified restaurant.

2. **Guest Validation**
   - If the request is made without authentication and only \`guestId\` is provided,
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

4. **Create Order Session**
   - A new **OrderSession** is created with:
     - channel: \`ONLINE_OWN\`
     - customer details
     - delivery information
     - calculated totals (subtotal, discount, total)

5. **Create Order Batch**
   - A single **OrderBatch** is created for the session.

6. **Convert Cart Items**
   - Cart items are converted into **OrderItems**
   - Price snapshots are stored at the time of booking.

7. **Emit WebSocket Events**
   - The system notifies internal services:
     - **Kitchen dashboard**
     - **Billing system**

8. **Cart Cleanup**
   - The cart is cleared after a successful booking.

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
- Uses \`guestId\`
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
            'Booking created successfully. Order session and batch created and sent to kitchen and billing services.',
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
        @Query('guestId') guestId?: string,
    ) {
        return {
            message: 'Booking created successfully',
            data: await this.bookingService.createBooking(
                actor,
                restaurantId,
                guestId,
                dto,
            ),
        };
    }
}