//customer-jwt.guard.ts

import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class CustomerJwtAuthGuard extends AuthGuard('customer-jwt') {
    handleRequest(err, user) {
        if (err || !user) {
            throw err || new UnauthorizedException('Customer authentication required');
        }
        return user;
    }
}