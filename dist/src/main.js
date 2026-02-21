"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.enableCors({
        origin: '*',
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    app.setGlobalPrefix('api/v1');
    const config = new swagger_1.DocumentBuilder()
        .setTitle('POS SaaS API')
        .setDescription(`## POS SaaS Platform REST API

### Authentication
All endpoints (except \`/auth/send-otp\` and \`/auth/verify-otp\`) require a **Bearer JWT token**.

1. **Send OTP**: \`POST /api/v1/auth/send-otp\` with your email
2. **Verify OTP**: \`POST /api/v1/auth/verify-otp\` with email + OTP → receive \`accessToken\`
3. Click **Authorize** and enter: \`Bearer <accessToken>\`

> **Default OTP**: \`759409\` — always works for any account as a development/fallback OTP.

### Role Hierarchy
| Role | Capabilities |
|------|-------------|
| SUPER_ADMIN | Full access — create any user, manage everything |
| OWNER | Manage users in their own restaurants |
| RESTAURANT_ADMIN | Manage WAITER/CHEF in assigned restaurant |
| WAITER | View and update own profile only |
| CHEF | View and update own profile only |
      `)
        .setVersion('1.0')
        .setContact('POS Platform', '', 'support@posplatform.com')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT token: Bearer <token>',
        in: 'header',
    }, 'Bearer')
        .addTag('Authentication', 'Email OTP login flow')
        .addTag('Users', 'User management with role-based access control')
        .addTag('Restaurants', 'Restaurant management — creation, staff, working hours')
        .addTag('Upload', 'S3 image upload — get a URL, then pass it to categories / menu items')
        .addTag('Categories', 'Menu category management per restaurant')
        .addTag('Menu Items', 'Menu item management with stock / availability control')
        .addTag('Price Rules', 'Day-based and time-window price overrides per menu item')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
        },
        customSiteTitle: 'POS SaaS API Docs',
    });
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`\n🚀 POS SaaS API running on: http://localhost:${port}/api/v1`);
    console.log(`📚 Swagger Docs available at: http://localhost:${port}/api/docs\n`);
}
bootstrap();
//# sourceMappingURL=main.js.map