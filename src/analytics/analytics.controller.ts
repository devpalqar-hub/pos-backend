import {
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Analytics')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    // ─── Profit & Loss ───────────────────────────────────────────────────────

    @Get('profit-and-loss')
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.OWNER,
        UserRole.RESTAURANT_ADMIN,
    )
    @ApiOperation({
        summary: 'Get Profit & Loss report',
        description: `
Returns a detailed P&L analytics summary including:
- **Total Revenue** (sum of paid bills)
- **Total Expenses** (expenses + payroll)
- **Gross Profit** (revenue − expenses excl. payroll)
- **Net Profit** (revenue − all expenses incl. payroll)
- **% change** vs previous period for each metric
- **Monthly chart data** (revenue vs expenses per month)

**Filters:**
- \`period\`: last30 | quarterly | yearly (default: last30)
- \`restaurantId\`: specific restaurant UUID (omit for all locations)

**Allowed roles**: SUPER_ADMIN, OWNER, RESTAURANT_ADMIN
        `,
    })
    @ApiQuery({
        name: 'period',
        required: false,
        enum: ['last30', 'quarterly', 'yearly'],
        description: 'Time period filter (default: last30)',
    })
    @ApiQuery({
        name: 'restaurantId',
        required: false,
        type: String,
        description: 'Restaurant UUID. Omit for all locations.',
    })
    @ApiResponse({ status: 200, description: 'P&L report fetched successfully.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
    async getProfitAndLoss(
        @CurrentUser() actor: User,
        @Query('period') period?: string,
        @Query('restaurantId') restaurantId?: string,
    ) {
        const validPeriods = ['last30', 'quarterly', 'yearly'] as const;
        const safePeriod = validPeriods.includes(period as any)
            ? (period as 'last30' | 'quarterly' | 'yearly')
            : 'last30';

        return {
            message: 'Profit & Loss report fetched successfully',
            data: await this.analyticsService.getProfitAndLoss(
                actor,
                restaurantId || null,
                safePeriod,
            ),
        };
    }

    // ─── Loyalty Programs Analytics ───────────────────────────────────────────

    @Get('loyalty-programs/:restaurantId')
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.OWNER,
        UserRole.RESTAURANT_ADMIN,
    )
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Get loyalty programs analytics',
        description:
            'Returns summary analytics: total active programs, redemption rate, and total members.',
    })
    @ApiResponse({ status: 200, description: 'Analytics fetched successfully.' })
    @ApiResponse({ status: 403, description: 'Not assigned to this restaurant.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    async getLoyaltyProgramsAnalytics(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    ) {
        return {
            message: 'Loyalty programs analytics fetched successfully',
            data: await this.analyticsService.getLoyaltyProgramsAnalytics(
                actor,
                restaurantId,
            ),
        };
    }

    // ─── Employee Directory Analytics ─────────────────────────────────────────

    @Get('employees/:restaurantId')
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.OWNER,
        UserRole.RESTAURANT_ADMIN,
    )
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Get employee directory analytics',
        description:
            'Returns summary analytics: total employees, active today (on shift), and monthly payroll estimate.',
    })
    @ApiResponse({ status: 200, description: 'Employee analytics fetched successfully.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    async getEmployeeAnalytics(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    ) {
        return {
            message: 'Employee directory analytics fetched successfully',
            data: await this.analyticsService.getEmployeeAnalytics(
                actor,
                restaurantId,
            ),
        };
    }

    @Get('analytics/:restaurantId')
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.OWNER,
        UserRole.RESTAURANT_ADMIN,
        UserRole.WAITER,
        UserRole.CHEF,
        UserRole.BILLER,)
    @ApiOperation({ summary: 'Expense analytics dashboard' })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({
        name: 'month',
        required: false,
        description: 'Month number (1-12). Default: current month',
    })
    @ApiQuery({
        name: 'months',
        required: false,
        description: 'Number of previous months for trend. Default: 6',
    })
    getExpenseAnalytics(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Query('month') month?: string,
        @Query('months') months?: string,
    ) {
        return this.analyticsService.getExpenseAnalytics(
            actor,
            restaurantId,
            month ? parseInt(month) : undefined,
            months ? parseInt(months) : undefined,
        )
    }

    @Get('coupons/analytics')
    @ApiOperation({ summary: 'Coupon performance' })
    performance(
        @Param('restaurantId') restaurantId: string
    ) {
        return this.analyticsService.performance(restaurantId)
    }

    @Get('coupons/analytics/trend')
    @ApiOperation({ summary: 'Coupon usage trend' })
    trend(
        @Param('restaurantId') restaurantId: string
    ) {
        return this.analyticsService.usageTrend(restaurantId)
    }



    //--------------------------------- MENU & SALES ANALYTICS-----------------------------------------------------------------
    @Get('menu-performance/:restaurantId')
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.OWNER,
        UserRole.RESTAURANT_ADMIN,
    )
    @ApiOperation({
        summary: 'Get Menu Performance Analytics',
        description: `
Returns a **menu performance dashboard** including:

### Summary Stats
- **Most selling item** (units sold + % growth)
- **Peak hours** (time range + avg orders/hour)
- **Total revenue** (current vs previous period + growth)

### Popular Item Combinations
- Frequently ordered menu item pairs

### Menu Performance Breakdown
Table containing:
- item_name
- category
- units_sold
- total_revenue
- growth_percentage

### Filters
Supports range filtering:

- \`7d\` → Last 7 days
- \`30d\` → Last 30 days
- \`90d\` → Last 90 days

### Allowed Roles
SUPER_ADMIN, OWNER, RESTAURANT_ADMIN
    `,
    })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({
        name: 'range',
        required: false,
        enum: ['7d', '30d', '90d'],
        description: 'Analytics time range (default: 7d)',
    })
    @ApiResponse({
        status: 200,
        description: 'Menu analytics fetched successfully',
    })
    @ApiResponse({
        status: 403,
        description: 'Insufficient permissions',
    })
    async getMenuPerformance(
        @CurrentUser() actor: User,
        @Param('restaurantId') restaurantId: string,
        @Query('range') range?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const validRanges = ['7d', '30d', '90d'] as const;

        const safeRange = validRanges.includes(range as any)
            ? (range as '7d' | '30d' | '90d')
            : '7d';

        return {
            message: 'Menu analytics fetched successfully',
            data: await this.analyticsService.getMenuPerformance(
                actor,
                restaurantId,
                safeRange,
                startDate,
                endDate,
            ),
        };
    }


    @Get('sales-trend/:restaurantId')
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.OWNER,
        UserRole.RESTAURANT_ADMIN,
    )
    @ApiOperation({
        summary: 'Get Daily Sales Trend Analytics',
        description: `
Returns **day-wise sales trend data** including:

### Daily Revenue
Total sales amount per day.

### Top 3 Selling Items Per Day
For each day the API returns:

- item_id
- name
- revenue

### Example Response
\`\`\`json
{
 "period": "last_7_days",
 "trend_data": [
  {
    "date": "2026-03-04",
    "day": "MON",
    "daily_total": 1250.00,
    "items": [
      { "item_id": 101, "name": "Wagyu Burger", "revenue": 600.00 },
      { "item_id": 102, "name": "Truffle Pasta", "revenue": 400.00 },
      { "item_id": 105, "name": "Calamari Fritti", "revenue": 250.00 }
    ]
  }
 ]
}
\`\`\`

### Filters

- \`7d\` → Last 7 days
- \`30d\` → Last 30 days
- \`custom\` → Custom date range

### Allowed Roles
SUPER_ADMIN, OWNER, RESTAURANT_ADMIN
    `,
    })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({
        name: 'range',
        required: false,
        enum: ['7d', '30d'],
        description: 'Time range filter (default: 7d)',
    })
    @ApiQuery({
        name: 'startDate',
        required: false,
        type: String,
    })
    @ApiQuery({
        name: 'endDate',
        required: false,
        type: String,
    })
    @ApiResponse({
        status: 200,
        description: 'Sales trend analytics fetched successfully',
    })
    @ApiResponse({
        status: 403,
        description: 'Insufficient permissions',
    })
    async getSalesTrend(
        @CurrentUser() actor: User,
        @Param('restaurantId') restaurantId: string,
        @Query('range') range?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {

        const validRanges = ['7d', '30d'] as const;

        const safeRange = validRanges.includes(range as any)
            ? (range as '7d' | '30d')
            : '7d';

        return {
            message: 'Sales trend analytics fetched successfully',
            data: await this.analyticsService.getSalesTrend(
                actor,
                restaurantId,
                safeRange,
                startDate,
                endDate,
            ),
        };
    }
}
