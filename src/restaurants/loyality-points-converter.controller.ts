import {
    Body,
    Controller,
    Post,
    Param,
    Patch,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
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
        @Param('restaurantId') restaurantId: string,
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
        @Param('restaurantId') restaurantId: string,
        @Param('converterId') converterId: string,
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