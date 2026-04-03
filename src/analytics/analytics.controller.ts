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
import { User, UserRole, ExpenseType } from '@prisma/client';

@ApiTags('Analytics')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    // ─── Profit & Loss ───────────────────────────────────────────────────────

    @Get('profit-and-loss/:restaurantId')
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
        enum: ['last7', 'last30', 'quarterly', 'yearly'],
        description: 'Time period filter (default: last30)',
    })
    @ApiParam({
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
        @Param('restaurantId') restaurantId?: string,
    ) {
        const validPeriods = ['last7', 'last30', 'quarterly', 'yearly'] as const;

        const safePeriod = validPeriods.includes(period as any)
            ? (period as 'last7' | 'last30' | 'quarterly' | 'yearly')
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
        @Param('restaurantId') restaurantId: string,
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

    @Get('expenses-overtime/:restaurantId')
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.OWNER,
        UserRole.RESTAURANT_ADMIN,
        UserRole.WAITER,
        UserRole.CHEF,
        UserRole.BILLER,
    )
    @ApiOperation({
        summary: 'Get expenses over time with filters',
        description:
            'Returns day-wise expense trend between startDate and endDate. startDate is required. If endDate is omitted, analytics is calculated for that single day.',
    })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({
        name: 'startDate',
        required: true,
        type: String,
        description: 'Start date in YYYY-MM-DD format',
    })
    @ApiQuery({
        name: 'endDate',
        required: false,
        type: String,
        description: 'Optional end date in YYYY-MM-DD format. Defaults to startDate when omitted.',
    })
    @ApiQuery({
        name: 'expenseType',
        required: false,
        enum: ExpenseType,
        description: 'Optional expense type filter',
    })
    @ApiQuery({
        name: 'expenseCategoryId',
        required: false,
        type: String,
        description: 'Optional expense category UUID filter',
    })
    @ApiResponse({ status: 200, description: 'Expenses over time analytics fetched successfully.' })
    @ApiResponse({ status: 400, description: 'Invalid query params. startDate is required.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
    getExpensesOverTime(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate?: string,
        @Query('expenseType') expenseType?: ExpenseType,
        @Query('expenseCategoryId') expenseCategoryId?: string,
    ) {
        return this.analyticsService.getExpensesOverTime(
            actor,
            restaurantId,
            startDate,
            endDate,
            expenseType,
            expenseCategoryId,
        );
    }

    @Get('coupons/analytics/:restaurantId')
    @ApiQuery({ name: 'startYear', required: false, type: Number })
    @ApiQuery({ name: 'endYear', required: false, type: Number })
    performance(
        @CurrentUser() actor: User,
        @Param('restaurantId') restaurantId: string,
        @Query('startYear') startYear?: string,
        @Query('endYear') endYear?: string
    ) {
        return this.analyticsService.performance(
            actor,
            restaurantId,
            startYear ? parseInt(startYear) : undefined,
            endYear ? parseInt(endYear) : undefined
        );
    }

    @Get('coupons/analytics/trend/:restaurantId')
    @ApiQuery({ name: 'startYear', required: false, type: Number })
    @ApiQuery({ name: 'endYear', required: false, type: Number })
    trend(
        @CurrentUser() actor: User,
        @Param('restaurantId') restaurantId: string,
        @Query('startYear') startYear?: string,
        @Query('endYear') endYear?: string
    ) {
        return this.analyticsService.usageTrend(
            actor,
            restaurantId,
            startYear ? parseInt(startYear) : undefined,
            endYear ? parseInt(endYear) : undefined
        );
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
-startDate + endDate → Custom date range

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
    @ApiQuery({
        name: 'startDate',
        required: false,
        type: String,
        description: 'Custom range start date (YYYY-MM-DD)',
    })
    @ApiQuery({
        name: 'endDate',
        required: false,
        type: String,
        description: 'Custom range end date (YYYY-MM-DD)',
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
--startDate + endDate → Custom date range

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

    // ─── Waiter Analytics ───────────────────────────────────────────

    @Get('waiter-performance/:restaurantId')
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.OWNER,
        UserRole.RESTAURANT_ADMIN,
    )
    @ApiOperation({
        summary: 'Get Waiter Performance Analytics',
        description: `
Returns waiter-wise performance:

### Metrics:
- totalSessions
- totalBills
- totalRevenue
- avgOrderValue

### Filters:
- date1 (required)
- date2 (optional)
- waiterId (optional)
- waiterName (optional)

### Behavior:
- If only date1 → single day analytics
- If date1 + date2 → date range analytics
    `,
    })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({ name: 'date1', required: true, type: String })
    @ApiQuery({ name: 'date2', required: false, type: String })
    @ApiQuery({ name: 'waiterId', required: false, type: String })
    @ApiQuery({ name: 'waiterName', required: false, type: String })
    async getWaiterAnalytics(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Query('date1') date1: string,
        @Query('date2') date2?: string,
        @Query('waiterId') waiterId?: string,
        @Query('waiterName') waiterName?: string,
    ) {
        if (!date1) {
            throw new Error('date1 query param is required');
        }

        return {
            message: 'Waiter analytics fetched successfully',
            data: await this.analyticsService.getWaiterAnalytics(
                actor,
                restaurantId,
                date1,
                date2,
                waiterId,
                waiterName,
            ),
        };
    }


    @Get('customer-retention/:restaurantId')
    @ApiOperation({
        summary: 'Get customer retention analytics',
        description:
            'Returns customer retention metrics for a restaurant, including retained vs returning customer behavior for recent periods.',
    })
    @ApiParam({
        name: 'restaurantId',
        type: String,
        description: 'Restaurant UUID',
    })
    @ApiResponse({ status: 200, description: 'Customer retention analytics fetched successfully.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions for this restaurant.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    getCustomerRetention(
        @CurrentUser() actor: User,
        @Param('restaurantId') restaurantId: string,
    ) {
        return this.analyticsService.getCustomerRetention(actor, restaurantId);
    }

    @Get('aov/:restaurantId')
    @ApiOperation({
        summary: 'Get average order value (AOV) analytics',
        description:
            'Returns average order value analytics for paid orders in the restaurant.',
    })
    @ApiParam({
        name: 'restaurantId',
        type: String,
        description: 'Restaurant UUID',
    })
    @ApiResponse({ status: 200, description: 'AOV analytics fetched successfully.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions for this restaurant.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    getAOV(
        @CurrentUser() actor: User,
        @Param('restaurantId') restaurantId: string,
    ) {
        return this.analyticsService.getAOV(actor, restaurantId);
    }

    @Get('revenue-by-channel/:restaurantId')
    @ApiOperation({
        summary: 'Get revenue by channel analytics',
        description:
            'Returns revenue split across sales channels such as dine-in, takeaway, and delivery integrations when available.',
    })
    @ApiParam({
        name: 'restaurantId',
        type: String,
        description: 'Restaurant UUID',
    })
    @ApiResponse({ status: 200, description: 'Revenue-by-channel analytics fetched successfully.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions for this restaurant.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    getRevenueByChannel(
        @CurrentUser() actor: User,
        @Param('restaurantId') restaurantId: string,
    ) {
        return this.analyticsService.getRevenueByChannel(actor, restaurantId);
    }

    @Get('top-customers/:restaurantId')
    @ApiOperation({
        summary: 'Get top customers analytics',
        description:
            'Returns top-performing customers for a restaurant based on spend and/or order frequency metrics.',
    })
    @ApiParam({
        name: 'restaurantId',
        type: String,
        description: 'Restaurant UUID',
    })
    @ApiResponse({ status: 200, description: 'Top customers analytics fetched successfully.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions for this restaurant.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    getTopCustomers(
        @CurrentUser() actor: User,
        @Param('restaurantId') restaurantId: string,
    ) {
        return this.analyticsService.getTopCustomers(actor, restaurantId);
    }

    @Get('order-time-distribution/:restaurantId')
    @ApiOperation({
        summary: 'Get order time distribution analytics',
        description:
            'Returns order distribution by time windows (for example hourly/daypart) to identify demand peaks.',
    })
    @ApiParam({
        name: 'restaurantId',
        type: String,
        description: 'Restaurant UUID',
    })
    @ApiResponse({ status: 200, description: 'Order time distribution analytics fetched successfully.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions for this restaurant.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    getOrderTimeDistribution(
        @CurrentUser() actor: User,
        @Param('restaurantId') restaurantId: string,
    ) {
        return this.analyticsService.getOrderTimeDistribution(actor, restaurantId);
    }


    @Get('prep-time/:restaurantId')
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.OWNER,
        UserRole.RESTAURANT_ADMIN,
    )
    @ApiOperation({
        summary: 'Get average preparation time per menu item',
        description: `
Analyzes kitchen efficiency by calculating **average preparation time per item**.

### What it shows:
- Average time taken to prepare each menu item
- Helps identify slow/complex dishes

### How it's calculated:
\`preparedAt - createdAt\` (in minutes)

### Use cases:
- Optimize kitchen workflow
- Adjust menu pricing for slow items
- Identify training needs for chefs
`,
    })
    @ApiParam({
        name: 'restaurantId',
        description: 'Restaurant UUID',
    })
    @ApiResponse({
        status: 200,
        description: 'Preparation time analytics fetched successfully',
        schema: {
            example: {
                message: 'Preparation time analytics fetched successfully',
                data: [
                    { itemName: 'Chicken Biryani', avgPrepTimeMins: 18.5 },
                    { itemName: 'Veg Fried Rice', avgPrepTimeMins: 12.2 },
                    { itemName: 'Paneer Butter Masala', avgPrepTimeMins: 15.7 }
                ],
            },
        },
    })
    async getPrepTime(
        @CurrentUser() actor: User,
        @Param('restaurantId') restaurantId: string,
    ) {
        return {
            message: 'Preparation time analytics fetched successfully',
            data: await this.analyticsService.getPreparationTimeAnalytics(
                actor,
                restaurantId,
            ),
        };
    }

    @Get('kitchen-bottlenecks/:restaurantId')
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.OWNER,
        UserRole.RESTAURANT_ADMIN,
    )
    @ApiOperation({
        summary: 'Detect kitchen bottlenecks and peak load hours',
        description: `
Provides **deep kitchen insights** to identify operational issues.

### Includes:

#### 1. Slowest Items
- Items taking longest average preparation time
- Indicates bottlenecks in kitchen workflow

#### 2. Peak Kitchen Hours
- Hours with highest order load
- Helps in staff planning & load balancing

### Use cases:
- Identify problematic dishes
- Optimize staffing during peak hours
- Improve kitchen throughput
`,
    })
    @ApiParam({
        name: 'restaurantId',
        description: 'Restaurant UUID',
    })
    @ApiResponse({
        status: 200,
        description: 'Kitchen bottleneck analytics fetched successfully',
        schema: {
            example: {
                message: 'Kitchen bottleneck analytics fetched successfully',
                data: {
                    slowest_items: [
                        { itemName: 'Grilled Fish', avgPrepTime: 25.4 },
                        { itemName: 'Mutton Curry', avgPrepTime: 22.1 }
                    ],
                    peak_kitchen_hours: [
                        { hour: '13:00', orders: 45 },
                        { hour: '20:00', orders: 60 }
                    ]
                }
            },
        },
    })
    async getKitchenBottlenecks(
        @CurrentUser() actor: User,
        @Param('restaurantId') restaurantId: string,
    ) {
        return {
            message: 'Kitchen bottleneck analytics fetched successfully',
            data: await this.analyticsService.getKitchenBottlenecks(
                actor,
                restaurantId,
            ),
        };
    }


    @Get('order-fulfillment/:restaurantId')
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.OWNER,
        UserRole.RESTAURANT_ADMIN,
    )
    @ApiOperation({
        summary: 'Get average order fulfillment time',
        description: `
Measures **end-to-end order completion time**.

### What it shows:
- Average time from order creation → served to customer
- Total number of fulfilled orders

### How it's calculated:
\`servedAt - createdAt\`

### Why it matters:
- Measures service efficiency
- Impacts customer satisfaction
- Helps define SLA targets
`,
    })
    @ApiParam({
        name: 'restaurantId',
        description: 'Restaurant UUID',
    })
    @ApiResponse({
        status: 200,
        description: 'Order fulfillment analytics fetched successfully',
        schema: {
            example: {
                message: 'Order fulfillment analytics fetched successfully',
                data: {
                    avgFulfillmentTimeMins: 28.6,
                    totalOrders: 320
                }
            },
        },
    })
    async getFulfillmentTime(
        @CurrentUser() actor: User,
        @Param('restaurantId') restaurantId: string,
    ) {
        return {
            message: 'Order fulfillment analytics fetched successfully',
            data: await this.analyticsService.getOrderFulfillmentTime(
                actor,
                restaurantId,
            ),
        };
    }
}
