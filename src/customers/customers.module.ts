import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomersAuthService } from './customers-auth.service';
import { CustomersAuthController } from './customers-auth.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

@Module({
    controllers: [CustomersController, CustomersAuthController],
    providers: [CustomersService, CustomersAuthService],
    exports: [CustomersService],
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET', 'fallback-secret'),
                signOptions: {
                    expiresIn: configService.get('JWT_EXPIRES_IN', '7d') as any,
                },
            }),
            inject: [ConfigService],
        }),
    ]
})
export class CustomersModule { }
