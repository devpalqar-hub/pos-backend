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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TablesService } from './tables.service';
import { CreateTableGroupDto } from './dto/create-table-group.dto';
import { UpdateTableGroupDto } from './dto/update-table-group.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../../generated/prisma';

@ApiTags('Table Groups')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/table-groups')
export class TableGroupsController {
  constructor(private readonly tablesService: TablesService) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a table group (floor / section)' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiResponse({ status: 201, description: 'Table group created' })
  @ApiResponse({ status: 409, description: 'Name already exists in this restaurant' })
  create(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Body() dto: CreateTableGroupDto,
  ) {
    return this.tablesService.createGroup(actor, restaurantId, dto);
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
    summary: 'List all table groups for a restaurant (includes tables)',
  })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiResponse({ status: 200, description: 'List of table groups' })
  findAll(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
  ) {
    return this.tablesService.findAllGroups(actor, restaurantId);
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
  @ApiOperation({ summary: 'Get a single table group with its tables' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'id', description: 'Table group UUID' })
  @ApiResponse({ status: 200, description: 'Table group details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tablesService.findOneGroup(actor, restaurantId, id);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiOperation({ summary: 'Update a table group' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'id', description: 'Table group UUID' })
  @ApiResponse({ status: 200, description: 'Updated table group' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTableGroupDto,
  ) {
    return this.tablesService.updateGroup(actor, restaurantId, id, dto);
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a table group',
    description: 'Group must have no tables assigned to it before deletion.',
  })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'id', description: 'Table group UUID' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({ status: 409, description: 'Group still has tables' })
  remove(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tablesService.removeGroup(actor, restaurantId, id);
  }
}
