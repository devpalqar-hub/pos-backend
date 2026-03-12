import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';

import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';

@ApiTags('Cart')
@Controller('restaurants/:restaurantId/cart')
export class CartController {
    constructor(private readonly cartService: CartService) { }

    /*
    GET CART
    */

    @Get()
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({
        name: 'guestId',
        required: false,
        type: String,
        description: 'Guest identifier (for guest users)',
    })
    @ApiOperation({
        summary: 'Get active cart',
        description:
            'Returns the active cart for a customer or guest in the specified restaurant. ' +
            'Cart is resolved using either `customerId` (logged-in user) or `guestId` (guest user).',
    })
    @ApiResponse({ status: 200, description: 'Cart retrieved successfully.' })
    @ApiResponse({ status: 404, description: 'Cart not found.' })
    async getCart(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Query('guestId') guestId?: string,
        @CurrentUser() user?: any,
    ) {
        const customerId = user ? user.id : undefined;
        return {
            message: 'Cart fetched successfully',
            data: await this.cartService.getCart(restaurantId, {
                customerId,
                guestId,
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
            '(identified by `customerId`) or a guest user (identified by `guestId`).',
    })
    @ApiResponse({ status: 201, description: 'Cart created successfully.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    async createCart(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: CreateCartDto,
    ) {
        return {
            message: 'Cart created successfully',
            data: await this.cartService.createCart(restaurantId, dto),
        };
    }

    /*
    ADD ITEM TO CART
    */

    @Post('items')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({
        name: 'guestId',
        required: false,
        description: 'Guest identifier for guest cart',
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
        @Query('guestId') guestId?: string,
        @CurrentUser() user?: any,
    ) {
        const customerId = user ? user.id : undefined;
        return {
            message: 'Item added to cart',
            data: await this.cartService.addItem(restaurantId, { customerId, guestId }, dto),
        };
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
        name: 'guestId',
        required: false,
        description: 'Guest identifier for guest cart',
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
        @Query('guestId') guestId?: string,
        @CurrentUser() user?: any,
    ) {
        const customerId = user ? user.id : undefined;
        return {
            message: 'Cart cleared successfully',
            data: await this.cartService.clearCart(restaurantId, {
                customerId,
                guestId,
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
        name: 'guestId',
        required: false,
        description: 'Guest identifier',
    })
    @ApiOperation({
        summary: 'Validate cart',
        description:
            'Validates cart items before checkout. Checks item availability and ensures cart consistency.',
    })
    @ApiResponse({ status: 200, description: 'Cart validation successful.' })
    async validateCart(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Query('guestId') guestId?: string,
        @CurrentUser() user?: any,
    ) {
        const customerId = user ? user.id : undefined;
        return {
            message: 'Cart validated successfully',
            data: await this.cartService.validateCart(restaurantId, {
                customerId,
                guestId,
            }),
        };
    }

    /*
    RECALCULATE CART
    */

    @Post('recalculate')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({
        name: 'guestId',
        required: false,
        description: 'Guest identifier',
    })
    @ApiOperation({
        summary: 'Recalculate cart totals',
        description:
            'Recalculates cart subtotal, tax, discount and total based on current cart items.',
    })
    @ApiResponse({ status: 200, description: 'Cart recalculated successfully.' })
    async recalculateCart(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Query('guestId') guestId?: string,
        @CurrentUser() user?: any,
    ) {
        const customerId = user ? user.id : undefined;
        return {
            message: 'Cart recalculated successfully',
            data: await this.cartService.recalculateCart(restaurantId, {
                customerId,
                guestId,
            }),
        };
    }

    /*
    CART SUMMARY
    */

    @Get('summary')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({
        name: 'guestId',
        required: false,
        description: 'Guest identifier',
    })
    @ApiOperation({
        summary: 'Get cart summary',
        description:
            'Returns a lightweight cart summary including item count, subtotal, tax, discount and total.',
    })
    @ApiResponse({ status: 200, description: 'Cart summary retrieved.' })
    async getSummary(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Query('guestId') guestId?: string,
        @CurrentUser() user?: any,
    ) {
        const customerId = user ? user.id : undefined;
        return {
            message: 'Cart summary fetched successfully',
            data: await this.cartService.getSummary(restaurantId, {
                customerId,
                guestId,
            }),
        };
    }
}