import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';
import { ToastService } from './toast.service';
import { UpsertToastSettingsDto } from './dto/upsert-toast-settings.dto';

@ApiTags('Toast Integration')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/toast')
export class ToastSettingsController {
  constructor(private readonly toastService: ToastService) {}

  @Get('settings')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiOperation({ summary: 'Get Toast integration settings' })
  @ApiResponse({ status: 200, description: 'Settings returned.' })
  async getSettings(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
  ) {
    return {
      message: 'Toast settings fetched successfully',
      data: await this.toastService.getSettings(actor, restaurantId),
    };
  }

  @Put('settings')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiOperation({
    summary: 'Save / update Toast integration settings',
    description:
      'Stores Toast credentials and restaurant external ID used to pull menus and orders into this POS.',
  })
  async upsertSettings(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Body() dto: UpsertToastSettingsDto,
  ) {
    return {
      message: 'Toast settings saved successfully',
      data: await this.toastService.upsertSettings(actor, restaurantId, dto),
    };
  }

  @Delete('settings')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiOperation({ summary: 'Remove Toast integration' })
  async deleteSettings(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
  ) {
    return this.toastService.deleteSettings(actor, restaurantId);
  }
}
