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
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MarketingService } from './marketing.service';
import { CreateWhatsappTemplateDto } from './dto/create-whatsapp-template.dto';

@ApiTags('Marketing — WhatsApp Templates')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/marketing/whatsapp/templates')
export class WhatsappTemplatesController {
    constructor(private readonly marketingService: MarketingService) { }

    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Create a WhatsApp template',
        description:
            'Creates a WhatsApp template through Meta Graph API, stores a local copy, and returns the Meta verification status (usually PENDING immediately after creation).',
    })
    @ApiResponse({ status: 201, description: 'Template created.' })
    @ApiResponse({ status: 400, description: 'Invalid template payload or missing WhatsApp settings.' })
    async create(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: CreateWhatsappTemplateDto,
    ) {
        return {
            message: 'WhatsApp template created successfully',
            data: await this.marketingService.createWhatsappTemplate(actor, restaurantId, dto),
        };
    }

    @Get()
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({ name: 'sync', required: false, type: Boolean, description: 'Refresh verification status from Meta before returning' })
    @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Include locally inactive templates' })
    @ApiOperation({
        summary: 'List WhatsApp templates',
        description:
            'Returns the templates saved for this restaurant, including the latest verification status from Meta when sync=true (default).',
    })
    @ApiResponse({ status: 200, description: 'Templates returned.' })
    async findAll(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Query('sync') sync?: string,
        @Query('includeInactive') includeInactive?: string,
    ) {
        return {
            message: 'WhatsApp templates fetched successfully',
            data: await this.marketingService.listWhatsappTemplates(actor, restaurantId, {
                sync: sync !== 'false',
                includeInactive: includeInactive === 'true',
            }),
        };
    }

    @Get(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'id', description: 'Local template UUID' })
    @ApiOperation({
        summary: 'Get a WhatsApp template',
        description:
            'Returns one stored template and the latest Meta verification status when sync=true.',
    })
    @ApiResponse({ status: 200, description: 'Template returned.' })
    @ApiResponse({ status: 404, description: 'Template not found.' })
    async findOne(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Query('sync') sync?: string,
    ) {
        return {
            message: 'WhatsApp template fetched successfully',
            data: await this.marketingService.getWhatsappTemplate(actor, restaurantId, id, {
                sync: sync !== 'false',
            }),
        };
    }

    @Patch(':id/inactivate')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'id', description: 'Local template UUID' })
    @ApiOperation({
        summary: 'Mark a WhatsApp template inactive locally',
        description:
            'Leaves the Meta template in place, but disables it in this application so it will not be used by the UI or sending flows.',
    })
    @ApiResponse({ status: 200, description: 'Template marked inactive.' })
    async deactivate(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return {
            message: 'WhatsApp template marked inactive successfully',
            data: await this.marketingService.deactivateWhatsappTemplate(actor, restaurantId, id),
        };
    }

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'id', description: 'Local template UUID' })
    @ApiOperation({
        summary: 'Delete a WhatsApp template',
        description:
            'Deletes the template from Meta when possible and marks the local record as deleted/inactive.',
    })
    @ApiResponse({ status: 200, description: 'Template deleted.' })
    async remove(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return {
            message: 'WhatsApp template deleted successfully',
            data: await this.marketingService.deleteWhatsappTemplate(actor, restaurantId, id),
        };
    }
}