import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../../generated/prisma';

@ApiTags('Tables')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new table in the restaurant' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiResponse({ status: 201, description: 'Table created' })
  @ApiResponse({ status: 409, description: 'Table name already exists' })
  create(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Body() dto: CreateTableDto,
  ) {
    return this.tablesService.createTable(actor, restaurantId, dto);
  }

  // ─── List ─────────────────────────────────────────────────────────────────

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.RESTAURANT_ADMIN,
    UserRole.WAITER,
    UserRole.CHEF,
    UserRole.BILLER,
  )
  @ApiOperation({
    summary: 'List all tables for a restaurant',
    description:
      'Optionally filter by `groupId`. Pass `groupId=ungrouped` to list tables with no group.',
  })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiQuery({
    name: 'groupId',
    required: false,
    description: 'Filter by table group UUID. Use "ungrouped" for tables without a group.',
  })
  @ApiResponse({ status: 200, description: 'List of tables' })
  findAll(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Query('groupId') groupId?: string,
  ) {
    if (groupId === 'ungrouped') {
      return this.tablesService.findUngroupedTables(actor, restaurantId);
    }
    return this.tablesService.findAllTables(actor, restaurantId, groupId);
  }

  // ─── Get one ──────────────────────────────────────────────────────────────

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.RESTAURANT_ADMIN,
    UserRole.WAITER,
    UserRole.CHEF,
    UserRole.BILLER,
  )
  @ApiOperation({ summary: 'Get a single table by ID' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiResponse({ status: 200, description: 'Table details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tablesService.findOneTable(actor, restaurantId, id);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiOperation({
    summary: 'Update a table',
    description: 'Set `groupId` to `null` to unassign from group.',
  })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiResponse({ status: 200, description: 'Updated table' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTableDto,
  ) {
    return this.tablesService.updateTable(actor, restaurantId, id, dto);
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a table' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tablesService.removeTable(actor, restaurantId, id);
  }

  // ─── Assign / unassign group ──────────────────────────────────────────────

  @Patch(':id/group')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiOperation({
    summary: 'Assign or unassign a table from a group',
    description: 'Send `{ "groupId": "<uuid>" }` to assign or `{ "groupId": null }` to unassign.',
  })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiResponse({ status: 200, description: 'Table group assignment updated' })
  assignGroup(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('groupId') groupId: string | null,
  ) {
    return this.tablesService.assignTableToGroup(
      actor,
      restaurantId,
      id,
      groupId ?? null,
    );
  }
}
