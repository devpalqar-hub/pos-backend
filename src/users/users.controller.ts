import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateProfileDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    // ─── Create User ──────────────────────────────────────────────────────────

    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Create a new user',
        description: `
**Role-based creation rules:**
- **SUPER_ADMIN**: Can create any role (SUPER_ADMIN, OWNER, RESTAURANT_ADMIN, WAITER, CHEF)
- **OWNER**: Can create RESTAURANT_ADMIN, WAITER, CHEF under their own restaurants
- **RESTAURANT_ADMIN**: Can create WAITER, CHEF in their assigned restaurant
- **WAITER / CHEF**: Cannot create users
    `,
    })
    @ApiResponse({ status: 201, description: 'User created successfully.' })
    @ApiResponse({ status: 400, description: 'Validation error or missing restaurantId.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
    @ApiResponse({ status: 409, description: 'Email already in use.' })
    async create(@CurrentUser() actor: User, @Body() dto: CreateUserDto) {
        return {
            message: 'User created successfully',
            data: await this.usersService.create(actor, dto),
        };
    }

    // ─── List Users ───────────────────────────────────────────────────────────

    @Get()
    @ApiOperation({
        summary: 'List users',
        description: `
Returns users visible to the authenticated user:
- **SUPER_ADMIN**: All users in the system (full details)
- **OWNER**: All staff in their restaurants (with creation context)
- **RESTAURANT_ADMIN**: Staff in their assigned restaurant
- **WAITER / CHEF**: Only their own profile
    `,
    })
    @ApiResponse({ status: 200, description: 'User list returned.' })
    async findAll(@CurrentUser() actor: User) {
        return {
            message: 'Users fetched successfully',
            data: await this.usersService.findAll(actor),
        };
    }

    // ─── Get Own Profile ──────────────────────────────────────────────────────

    @Get('profile')
    @ApiOperation({ summary: 'Get own profile' })
    @ApiResponse({ status: 200, description: 'Profile returned.' })
    async getProfile(@CurrentUser() actor: User) {
        return {
            message: 'Profile fetched successfully',
            data: await this.usersService.getProfile(actor),
        };
    }

    // ─── Update Own Profile ───────────────────────────────────────────────────

    @Patch('profile')
    @ApiOperation({
        summary: 'Update own profile',
        description: 'All roles can update their own name.',
    })
    @ApiResponse({ status: 200, description: 'Profile updated.' })
    async updateProfile(
        @CurrentUser() actor: User,
        @Body() dto: UpdateProfileDto,
    ) {
        return {
            message: 'Profile updated successfully',
            data: await this.usersService.updateProfile(actor, dto),
        };
    }

    // ─── Get Single User ──────────────────────────────────────────────────────

    @Get(':id')
    @ApiOperation({
        summary: 'Get a user by ID',
        description:
            'Response fields are filtered based on your role. ' +
            'WAITER/CHEF can only fetch their own profile.',
    })
    @ApiParam({ name: 'id', description: 'User UUID', type: 'string' })
    @ApiResponse({ status: 200, description: 'User found.' })
    @ApiResponse({ status: 403, description: 'Access denied.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    async findOne(
        @CurrentUser() actor: User,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return {
            message: 'User fetched successfully',
            data: await this.usersService.findOne(actor, id),
        };
    }

    // ─── Update User ──────────────────────────────────────────────────────────

    @Patch(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiOperation({
        summary: 'Update a user',
        description: `
**Role-based update rules:**
- **SUPER_ADMIN**: Can update any field on any user (including role, isActive)
- **OWNER**: Can update staff in their restaurants (name, email, restaurantId, isActive)
- **RESTAURANT_ADMIN**: Can update WAITER/CHEF in their assigned restaurant (name, email)
- **WAITER / CHEF**: Use \`PATCH /users/profile\` to update their own name
    `,
    })
    @ApiParam({ name: 'id', description: 'User UUID', type: 'string' })
    @ApiResponse({ status: 200, description: 'User updated.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    async update(
        @CurrentUser() actor: User,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUserDto,
    ) {
        return {
            message: 'User updated successfully',
            data: await this.usersService.update(actor, id, dto),
        };
    }

    // ─── Delete User ──────────────────────────────────────────────────────────

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Delete a user',
        description:
            '**SUPER_ADMIN**: Can delete any user. ' +
            '**OWNER**: Can delete staff in their restaurants. ' +
            'You cannot delete your own account.',
    })
    @ApiParam({ name: 'id', description: 'User UUID', type: 'string' })
    @ApiResponse({ status: 200, description: 'User deleted.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions or self-deletion.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    async remove(
        @CurrentUser() actor: User,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.usersService.remove(actor, id);
    }
}
