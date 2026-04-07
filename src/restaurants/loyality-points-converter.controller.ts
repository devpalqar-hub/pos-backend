import {
    Body,
    Controller,
    Post,
    Param,
    Patch,
    Get,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';
import { CreateLoyalityPointsConverterDto } from './dto/loyality-point-converter.dto';
import { LoyalityPointsConverterService } from './loyality-points-converter.service';
import { UpdateLoyalityPointsConverterDto } from './dto/loyality-point-converter-update.dto';

@ApiTags('Loyalty Points Converter')
@Controller("restaurants/:restaurantId/loyality-points-converter")
export class LoyalityPointsConverterController {
    constructor(
        private readonly converterService: LoyalityPointsConverterService,
    ) { }

    @Get()
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.OWNER,
        UserRole.RESTAURANT_ADMIN,
    )
    @ApiOperation({
        summary: 'Get all loyalty points converters for a restaurant',
        description: `
Returns all loyalty points converter records configured for the given restaurant.

This endpoint is useful for:
- Showing converter history
- Finding the currently active converter
- Auditing previous conversion rules

Each converter defines the conversion ratio:
- \`points\`: number of loyalty points
- \`value\`: monetary value for those points
- \`currency\`: currency code (for example \`USD\`, \`INR\`)
- \`isActive\`: whether this converter is the currently active one

**Allowed roles**: SUPER_ADMIN, OWNER, RESTAURANT_ADMIN
        `,
    })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiResponse({ status: 200, description: 'Loyalty converters fetched successfully.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    async getAllConverters(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    ) {
        const data = await this.converterService.getAllConverters(actor, restaurantId);

        return {
            success: true,
            statusCode: 200,
            message: 'Loyalty converters fetched successfully',
            data,
            timestamp: new Date().toISOString(),
        };
    }

    @Get(':converterId')
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.OWNER,
        UserRole.RESTAURANT_ADMIN,
    )
    @ApiOperation({
        summary: 'Get loyalty points converter by ID',
        description: `
Returns one loyalty points converter record by converter ID under the given restaurant.

Use this endpoint when you need full details of a specific converter before update,
review, or debugging conversion behavior.

**Allowed roles**: SUPER_ADMIN, OWNER, RESTAURANT_ADMIN
        `,
    })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'converterId', description: 'Loyalty points converter UUID' })
    @ApiResponse({ status: 200, description: 'Loyalty converter fetched successfully.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
    @ApiResponse({ status: 404, description: 'Converter not found.' })
    async getConverterById(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('converterId', ParseUUIDPipe) converterId: string,
    ) {
        const data = await this.converterService.getConverterById(
            actor,
            restaurantId,
            converterId,
        );

        return {
            success: true,
            statusCode: 200,
            message: 'Loyalty converter fetched successfully',
            data,
            timestamp: new Date().toISOString(),
        };
    }

    @Post()
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.OWNER,
        UserRole.RESTAURANT_ADMIN,
    )
    @ApiOperation({ summary: 'Create loyalty points converter' })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    async createConverter(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: CreateLoyalityPointsConverterDto,
    ) {
        const data = await this.converterService.createConverter(
            actor,
            restaurantId,
            dto,
        );

        return {
            success: true,
            statusCode: 201,
            message: 'Loyalty converter created successfully',
            data,
            timestamp: new Date().toISOString(),
        };
    }

    @Patch(':converterId')
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.OWNER,
        UserRole.RESTAURANT_ADMIN,
    )
    @ApiOperation({ summary: 'Update loyalty points converter' })
    @ApiParam({ name: 'restaurantId' })
    @ApiParam({ name: 'converterId' })
    async updateConverter(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('converterId', ParseUUIDPipe) converterId: string,
        @Body() dto: UpdateLoyalityPointsConverterDto,
    ) {
        const data = await this.converterService.updateConverter(
            actor,
            restaurantId,
            converterId,
            dto,
        );

        return {
            success: true,
            statusCode: 200,
            message: 'Loyalty converter updated successfully',
            data,
            timestamp: new Date().toISOString(),
        };
    }
}