import {
    Body,
    Controller,
    Delete,
    Get,
    Headers,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { v4 as uuid } from 'uuid';
import { Request, Response } from 'express';

import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CustomerJwtAuthGuard } from 'src/common/guards/customer-jwt.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { OptionalCustomerJwtAuthGuard } from 'src/common/guards/ optional-jwt-auth.guard';

@ApiTags('Cart')
@Public()
@UseGuards(OptionalCustomerJwtAuthGuard)
@Controller('restaurants/:restaurantId/cart')
export class CartController {
    constructor(private readonly cartService: CartService) { }

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

    private setSessionCookie(res: Response, sessionId: string): void {
        res.cookie('sid', sessionId, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 1000 * 60 * 60 * 24 * 30,
            path: '/',
        });
    }

    /*
    GET CART
    */

    @Get()
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({
        name: 'sessionId',
        required: false,
        type: String,
        description: 'Session identifier for guest users',
    })
    @ApiOperation({
        summary: 'Get active cart',
        description:
            'Returns the active cart for a customer or guest in the specified restaurant. ' +
            'Cart is resolved using either `customerId` (logged-in user) or `sessionId` (guest user).',
    })
    @ApiResponse({ status: 200, description: 'Cart retrieved successfully.' })
    @ApiResponse({ status: 404, description: 'Cart not found.' })
    async getCart(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Req() req: Request,
        @Headers('x-session-id') headerSessionId?: string,
        @Query('sessionId') querySessionId?: string,
        @Query('guestId') legacyGuestId?: string,
        @CurrentUser() user?: any,
    ) {
        const sessionId = this.resolveSessionId(
            req,
            headerSessionId,
            querySessionId,
            legacyGuestId,
        );
        const customerId = user ? user.id : undefined;
        return {
            message: 'Cart fetched successfully',
            data: await this.cartService.getCart(restaurantId, {
                customerId,
                sessionId,
            }),
        };
    }

    /*
    CREATE CART
    */


    @Post()
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Create a new cart',
        description:
            'Creates a new cart for a restaurant. A cart can belong either to a logged-in customer ' +
            '(identified by `customerId`) or a guest user (identified by `sessionId`).',
    })
    @ApiResponse({ status: 201, description: 'Cart created successfully.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    async createCart(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Req() req: Request,
        @Headers('x-session-id') headerSessionId?: string,
        @Query('sessionId') querySessionId?: string,
        @Query('guestId') legacyGuestId?: string,
        @CurrentUser() user?: any,
    ) {
        const sessionId = this.resolveSessionId(
            req,
            headerSessionId,
            querySessionId,
            legacyGuestId,
        );
        return {
            message: 'Cart created successfully',
            data: await this.cartService.createCart(restaurantId, {
                customerId: user?.id,
                sessionId,
            }),
        };
    }

    /*
    ADD ITEM TO CART
    */
    @Public()
    @UseGuards(OptionalCustomerJwtAuthGuard)
    @Post('items')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({
        name: 'sessionId',
        required: false,
        description: 'Session identifier for guest cart',
    })
    @ApiOperation({
        summary: 'Add item to cart',
        description:
            'Adds a menu item to the cart. If the item already exists in the cart, ' +
            'the quantity will be increased instead of creating a duplicate entry.',
    })
    @ApiResponse({ status: 200, description: 'Item added to cart.' })
    @ApiResponse({ status: 404, description: 'Cart not found.' })
    async addItem(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: AddCartItemDto,
        @Req() req: Request,
        @Headers('x-session-id') headerSessionId?: string,
        @Query('sessionId') querySessionId?: string,
        @Query('guestId') legacyGuestId?: string,
        @CurrentUser() user?: any,
    ) {
        const sessionId = this.resolveSessionId(
            req,
            headerSessionId,
            querySessionId,
            legacyGuestId,
        );
        const customerId = user ? user.id : undefined;

        return {
            message: 'Item added to cart',
            data: await this.cartService.addItem(restaurantId, { customerId, sessionId }, dto),
        };
    }

    @Public()
    @Get('session')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Generate guest session ID',
        description:
            'Generates a unique sessionId used for cart operations for unauthenticated users and sets sid cookie.',
    })
    @ApiResponse({
        status: 200,
        description: 'Session ID generated successfully',
    })
    async generateSessionId(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Res({ passthrough: true }) res: Response,
    ) {
        const sessionId = `sid_${uuid()}`;
        this.setSessionCookie(res, sessionId);

        return {
            message: 'Session ID generated successfully',
            sessionId,
        };
    }

    @Public()
    @Get('guest-id')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Generate guest ID (legacy)',
        description:
            'Legacy alias that now returns sessionId and sets sid cookie for guest cart operations.',
    })
    @ApiResponse({
        status: 200,
        description: 'Session ID generated successfully',
    })
    async generateLegacyGuestId(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Res({ passthrough: true }) res: Response,
    ) {
        return this.generateSessionId(restaurantId, res);
    }
    /*
    UPDATE CART ITEM
    */


    @Patch('items/:itemId')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'itemId', description: 'Cart item UUID' })
    @ApiOperation({
        summary: 'Update cart item quantity',
        description:
            'Updates the quantity of a specific cart item. ' +
            'If quantity is set to `0`, the item will be removed from the cart.',
    })
    @ApiResponse({ status: 200, description: 'Cart item updated.' })
    @ApiResponse({ status: 404, description: 'Cart item not found.' })
    async updateItem(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('itemId', ParseUUIDPipe) itemId: string,
        @Body() dto: UpdateCartItemDto,
    ) {
        return {
            message: 'Cart item updated',
            data: await this.cartService.updateItem(itemId, dto),
        };
    }

    /*
    REMOVE ITEM FROM CART
    */


    @Delete('items/:itemId')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'itemId', description: 'Cart item UUID' })
    @ApiOperation({
        summary: 'Remove item from cart',
        description: 'Deletes a specific item from the cart.',
    })
    @ApiResponse({ status: 200, description: 'Item removed from cart.' })
    @ApiResponse({ status: 404, description: 'Cart item not found.' })
    async removeItem(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('itemId', ParseUUIDPipe) itemId: string,
    ) {
        return {
            message: 'Item removed from cart',
            data: await this.cartService.removeItem(itemId),
        };
    }

    /*
    CLEAR CART
    */


    @Delete()
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({
        name: 'sessionId',
        required: false,
        description: 'Session identifier for guest cart',
    })
    @ApiOperation({
        summary: 'Clear cart',
        description:
            'Removes all items from the cart for the specified customer or guest.',
    })
    @ApiResponse({ status: 200, description: 'Cart cleared successfully.' })
    @ApiResponse({ status: 404, description: 'Cart not found.' })
    async clearCart(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Req() req: Request,
        @Headers('x-session-id') headerSessionId?: string,
        @Query('sessionId') querySessionId?: string,
        @Query('guestId') legacyGuestId?: string,
        @CurrentUser() user?: any,
    ) {
        const sessionId = this.resolveSessionId(
            req,
            headerSessionId,
            querySessionId,
            legacyGuestId,
        );
        const customerId = user ? user.id : undefined;
        return {
            message: 'Cart cleared successfully',
            data: await this.cartService.clearCart(restaurantId, {
                customerId,
                sessionId,
            }),
        };
    }

    /*
    MERGE CART
    */


    @Post('merge')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Merge guest cart with customer cart',
        description:
            'Used when a guest user logs in. The guest cart items will be merged into the customer cart.',
    })
    @ApiResponse({ status: 200, description: 'Cart merged successfully.' })
    async mergeCart(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: MergeCartDto,
    ) {
        return {
            message: 'Cart merged successfully',
            data: await this.cartService.mergeCart(restaurantId, dto),
        };
    }

    /*
    VALIDATE CART
    */


    @Post('validate')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({
        name: 'sessionId',
        required: false,
        description: 'Session identifier',
    })
    @ApiOperation({
        summary: 'Validate cart',
        description:
            'Validates cart items before checkout. Checks item availability and ensures cart consistency.',
    })
    @ApiResponse({ status: 200, description: 'Cart validation successful.' })
    async validateCart(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Req() req: Request,
        @Headers('x-session-id') headerSessionId?: string,
        @Query('sessionId') querySessionId?: string,
        @Query('guestId') legacyGuestId?: string,
        @CurrentUser() user?: any,
    ) {
        const sessionId = this.resolveSessionId(
            req,
            headerSessionId,
            querySessionId,
            legacyGuestId,
        );
        const customerId = user ? user.id : undefined;
        return {
            message: 'Cart validated successfully',
            data: await this.cartService.validateCart(restaurantId, {
                customerId,
                sessionId,
            }),
        };
    }

    /*
    RECALCULATE CART
    */


    @Post('recalculate')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({
        name: 'sessionId',
        required: false,
        description: 'Session identifier',
    })
    @ApiOperation({
        summary: 'Recalculate cart totals',
        description:
            'Recalculates cart subtotal, tax, discount and total based on current cart items.',
    })
    @ApiResponse({ status: 200, description: 'Cart recalculated successfully.' })
    async recalculateCart(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Req() req: Request,
        @Headers('x-session-id') headerSessionId?: string,
        @Query('sessionId') querySessionId?: string,
        @Query('guestId') legacyGuestId?: string,
        @CurrentUser() user?: any,
    ) {
        const sessionId = this.resolveSessionId(
            req,
            headerSessionId,
            querySessionId,
            legacyGuestId,
        );
        const customerId = user ? user.id : undefined;
        return {
            message: 'Cart recalculated successfully',
            data: await this.cartService.recalculateCart(restaurantId, {
                customerId,
                sessionId,
            }),
        };
    }

    /*
    CART SUMMARY
    */


    @Get('summary')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({
        name: 'sessionId',
        required: false,
        description: 'Session identifier',
    })
    @ApiOperation({
        summary: 'Get cart summary',
        description:
            'Returns a lightweight cart summary including item count, subtotal, tax, discount and total.',
    })
    @ApiResponse({ status: 200, description: 'Cart summary retrieved.' })
    async getSummary(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Req() req: Request,
        @Headers('x-session-id') headerSessionId?: string,
        @Query('sessionId') querySessionId?: string,
        @Query('guestId') legacyGuestId?: string,
        @CurrentUser() user?: any,
    ) {
        const sessionId = this.resolveSessionId(
            req,
            headerSessionId,
            querySessionId,
            legacyGuestId,
        );
        const customerId = user ? user.id : undefined;
        return {
            message: 'Cart summary fetched successfully',
            data: await this.cartService.getSummary(restaurantId, {
                customerId,
                sessionId,
            }),
        };
    }
}