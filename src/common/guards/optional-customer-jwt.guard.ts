// optional-customer-jwt.guard.ts

import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalCustomerJwtAuthGuard extends AuthGuard('customer-jwt') {
    handleRequest(err, user) {
        // If token invalid → ignore and continue as guest
        if (err) {
            return null;
        }

        // If no token → guest
        return user || null;
    }
}