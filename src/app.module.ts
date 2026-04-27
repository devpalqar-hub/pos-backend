import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { CommonModule } from './common/common.module';
import { CategoriesModule } from './categories/categories.module';
import { MenuModule } from './menu/menu.module';
import { PriceRulesModule } from './price-rules/price-rules.module';
import { TablesModule } from './tables/tables.module';
import { OrdersModule } from './orders/orders.module';
import { CustomersModule } from './customers/customers.module';
import { LoyalityPointsModule } from './loyality-points/loyality-points.module';
import { ExpensesModule } from './expenses/expenses.module';
import { PayrollModule } from './payroll/payroll.module';
import { MarketingModule } from './marketing/marketing.module';
import { DoorDashModule } from './doordash/doordash.module';
import { UberEatsModule } from './uber-eats/uber-eats.module';
import { ToastModule } from './toast/toast.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { TriggerCampaignsModule } from './trigger-campaigns/trigger-campaigns.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { S3Module } from './s3/s3.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ExpenseCategoriesModule } from './expense-category/expense-categories.module';
import { CouponsModule } from './coupoun/coupons.module';
import { CartModule } from './cart/cart.module';
import { RestaurantFeaturesModule } from './restaurant-features/restaurant-features.module';
import { BookingModule } from './booking/booking.module';
import { RestaurantFeatureGuard } from './common/guards/feature.guard';
import { BillModule } from './bill/bill.module';
import { VendorModule } from './vendor/vendor.module';
import { VendorCategoryModule } from './vendor-category/vendor-category.module';
import { VendorPaymentModule } from './vendor-payment/vendor-payment.module';
import { AddressModule } from './address/address.module';
import { DeliveryChargeModule } from './delivery-charge/delivery-charge.module';
import { StripeModule } from './stripe/stripe.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 100,
      },
    ]),
    // Load .env globally
    ConfigModule.forRoot({ isGlobal: true }),

    // Core infrastructure
    PrismaModule,

    // Global common (S3 service, etc.)
    CommonModule,
    CouponsModule,

    // Feature modules
    ExpenseCategoriesModule,
    AuthModule,
    UsersModule,
    RestaurantsModule,
    S3Module,
    CategoriesModule,
    MenuModule,
    PriceRulesModule,
    TablesModule,
    OrdersModule,
    CustomersModule,
    LoyalityPointsModule,
    ExpensesModule,
    PayrollModule,
    MarketingModule,
    DoorDashModule,
    UberEatsModule,
    ToastModule,
    AnalyticsModule,
    TriggerCampaignsModule,
    CartModule,
    RestaurantFeaturesModule,
    BookingModule,
    BillModule,
    VendorModule,
    VendorCategoryModule,
    VendorPaymentModule,
    AddressModule,
    DeliveryChargeModule,
    StripeModule.forRootAsync()
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    AppService,

    // Apply JWT guard globally (public routes are marked with @Public())
    { provide: APP_GUARD, useClass: JwtAuthGuard },

    // Apply role guard globally
    { provide: APP_GUARD, useClass: RolesGuard },

    // Global exception filter
    { provide: APP_FILTER, useClass: HttpExceptionFilter },

    // Global response transform interceptor
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_GUARD, useClass: RestaurantFeatureGuard }
  ],
})
export class AppModule { }
