import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';

import {
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';

import { RestaurantFeaturesService } from './restaurant-features.service';
import { CreateRestaurantFeatureDto } from './dto/create-restaurant-feature.dto';
import { UpdateRestaurantFeatureDto } from './dto/update-restaurant-feature.dto';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Restaurant Features')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/features')
export class RestaurantFeaturesController {
    constructor(private readonly service: RestaurantFeaturesService) { }

    /*
    CREATE FEATURE
    */

    @Post()
    @Roles(UserRole.SUPER_ADMIN)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Enable a SaaS feature for a restaurant',
        description: `
Creates a **feature flag** for a restaurant.

Since this platform is a **multi-tenant SaaS system**, not every restaurant
may use all available services. This endpoint allows enabling a specific
feature for the given restaurant.

Examples of supported features include:

- **POS** – Dine-in restaurant POS system
- **ONLINE_ORDERING** – Restaurant's own online ordering platform
- **COUPONS** – Discount coupon support
- **LOYALTY_POINTS** – Customer loyalty rewards system
- **MARKETING** – Marketing campaigns via Email/SMS/WhatsApp
- **DOORDASH** – DoorDash delivery integration
- **UBER_EATS** – Uber Eats delivery integration
- **PAYROLL** – Staff payroll management
- **EXPENSES** – Expense tracking and financial management

This feature flag determines whether APIs related to that service
are accessible for the restaurant.

**Typical Use Case**

A SaaS admin enables only certain modules depending on the
restaurant's subscription plan.
`,
    })
    @ApiResponse({
        status: 201,
        description: 'Restaurant feature created successfully.',
    })
    @ApiResponse({
        status: 400,
        description: 'Feature already exists for this restaurant.',
    })
    create(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: CreateRestaurantFeatureDto,
    ) {
        return {
            message: 'Feature created successfully',
            data: this.service.create(restaurantId, dto),
        };
    }

    /*
    GET ALL FEATURES
    */

    @Get()
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Get all enabled/disabled SaaS features for a restaurant',
        description: `
Returns the list of **all features configured for the specified restaurant**.

Each record indicates whether the feature is currently **enabled or disabled**.

This endpoint is typically used by:

- **Frontend dashboards**
- **Admin panels**
- **Backend feature validation**

to determine which services should be available.

Example:

A restaurant may have:

- POS enabled
- Online ordering enabled
- Coupons disabled
- DoorDash integration disabled
`,
    })
    @ApiResponse({
        status: 200,
        description: 'Restaurant features fetched successfully.',
    })
    findAll(@Param('restaurantId', ParseUUIDPipe) restaurantId: string) {
        return {
            message: 'Restaurant features fetched successfully',
            data: this.service.findAll(restaurantId),
        };
    }

    /*
    GET FEATURE BY ID
    */

    @Get(':id')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'id', description: 'Restaurant Feature UUID' })
    @ApiOperation({
        summary: 'Get a specific restaurant feature',
        description: `
Returns the details of a **single feature flag** configured for the restaurant.

This endpoint is useful when the system needs to inspect
the configuration of a specific feature.

Example:

Retrieve the configuration of the **COUPONS feature**
to determine whether coupon-related APIs should be accessible.
`,
    })
    @ApiResponse({
        status: 200,
        description: 'Restaurant feature retrieved successfully.',
    })
    @ApiResponse({
        status: 404,
        description: 'Restaurant feature not found.',
    })
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return {
            message: 'Restaurant feature fetched successfully',
            data: this.service.findOne(id),
        };
    }

    /*
    UPDATE FEATURE
    */

    @Patch(':id')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'id', description: 'Restaurant Feature UUID' })
    @ApiOperation({
        summary: 'Update restaurant feature status',
        description: `
Updates the **enabled/disabled state** of a restaurant feature.

This operation allows SaaS administrators to **toggle services**
without deleting the configuration.

Example:

Disable the **COUPONS** feature for a restaurant that
downgrades their subscription plan.

When disabled:

- Coupon APIs should reject requests
- Coupon creation and redemption should not be allowed
`,
    })
    @ApiResponse({
        status: 200,
        description: 'Restaurant feature updated successfully.',
    })
    @ApiResponse({
        status: 404,
        description: 'Restaurant feature not found.',
    })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateRestaurantFeatureDto,
    ) {
        return {
            message: 'Restaurant feature updated successfully',
            data: this.service.update(id, dto),
        };
    }

    /*
    DELETE FEATURE
    */

    @Delete(':id')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'id', description: 'Restaurant Feature UUID' })
    @ApiOperation({
        summary: 'Delete restaurant feature configuration',
        description: `
Removes the **feature flag configuration** from the restaurant.

After deletion:

- The feature will no longer be considered configured
- The restaurant will behave as if the feature is **not enabled**

This operation is typically used when:

- A restaurant removes a service permanently
- An integration such as **DoorDash or Uber Eats** is disconnected
`,
    })
    @ApiResponse({
        status: 200,
        description: 'Restaurant feature deleted successfully.',
    })
    @ApiResponse({
        status: 404,
        description: 'Restaurant feature not found.',
    })
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return {
            message: 'Restaurant feature deleted successfully',
            data: this.service.remove(id),
        };
    }
}