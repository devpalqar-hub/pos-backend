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
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { S3Module } from './s3/s3.module';

@Module({
  imports: [
    // Load .env globally
    ConfigModule.forRoot({ isGlobal: true }),

    // Core infrastructure
    PrismaModule,

    // Global common (S3 service, etc.)
    CommonModule,

    // Feature modules
    AuthModule,
    UsersModule,
    RestaurantsModule,
    S3Module,
    CategoriesModule,
    MenuModule,
    PriceRulesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // Apply JWT guard globally (public routes are marked with @Public())
    { provide: APP_GUARD, useClass: JwtAuthGuard },

    // Apply role guard globally
    { provide: APP_GUARD, useClass: RolesGuard },

    // Global exception filter
    { provide: APP_FILTER, useClass: HttpExceptionFilter },

    // Global response transform interceptor
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule { }
