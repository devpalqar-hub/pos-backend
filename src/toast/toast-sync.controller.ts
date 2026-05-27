import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';
import { ToastService } from './toast.service';
import { SyncToastMenuDto } from './dto/sync-toast-menu.dto';
import { SyncToastOrdersDto } from './dto/sync-toast-orders.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';
import { ToastService } from './toast.service';
import { SyncToastMenuDto } from './dto/sync-toast-menu.dto';
import { SyncToastOrdersDto } from './dto/sync-toast-orders.dto';

@ApiTags('Toast Integration Sync')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/toast')
export class ToastSyncController {
  constructor(private readonly toastService: ToastService) {}

  @Post('sync/menu')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiOperation({
    summary: 'Sync menu from Toast into local menu/category tables',
  })
  async syncMenu(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Body() dto: SyncToastMenuDto,
  ) {
    return {
      message: 'Toast menu sync completed',
      data: await this.toastService.syncMenu(actor, restaurantId, dto),
    };
  }

  @Post('sync/orders')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiOperation({
    summary: 'Sync orders from Toast into local order sessions',
  })
  async syncOrders(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Body() dto: SyncToastOrdersDto,
  ) {
    return {
      message: 'Toast orders sync completed',
      data: await this.toastService.syncOrders(actor, restaurantId, dto),
    };
  }

  @Post('sync/full')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiOperation({
    summary: 'Run menu sync followed by order sync',
  })
  async syncFull(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Body() ordersDto: SyncToastOrdersDto,
  ) {
    return {
      message: 'Toast full sync completed',
      data: await this.toastService.syncFull(actor, restaurantId, ordersDto),
    };
  }

  @Get('sync/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiOperation({ summary: 'Get current Toast sync state for the restaurant' })
  async getStatus(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
  ) {
    return {
      message: 'Toast sync status fetched successfully',
      data: await this.toastService.getSyncStatus(actor, restaurantId),
    };
  }

  @Get('sync/logs')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOperation({ summary: 'List Toast sync logs for debugging and audit' })
  @ApiResponse({ status: 200, description: 'Logs returned.' })
  async getLogs(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return {
      message: 'Toast sync logs fetched successfully',
      ...(await this.toastService.getSyncLogs(
        actor,
        restaurantId,
        parseInt(page ?? '1', 10),
        parseInt(limit ?? '20', 10),
      )),
    };
  }

  // ── Webhook logs (authenticated, for admin audit) ──────────────────────────

  @Get('webhook/logs')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOperation({ summary: 'List incoming Toast webhook events for debugging and audit' })
  @ApiResponse({ status: 200, description: 'Webhook logs returned.' })
  async getWebhookLogs(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return {
      message: 'Toast webhook logs fetched successfully',
      ...(await this.toastService.getWebhookLogs(
        actor,
        restaurantId,
        parseInt(page ?? '1', 10),
        parseInt(limit ?? '20', 10),
      )),
    };
  }

  @Get('webhook/logs/:logId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'logId', description: 'Webhook log UUID' })
  @ApiOperation({ summary: 'Get a single Toast webhook log entry with full raw payload' })
  @ApiResponse({ status: 200, description: 'Webhook log returned.' })
  async getWebhookLog(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('logId', ParseUUIDPipe) logId: string,
  ) {
    return {
      message: 'Toast webhook log fetched successfully',
      data: await this.toastService.getWebhookLog(actor, restaurantId, logId),
    };
  }
}
