import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalCustomerJwtAuthGuard extends AuthGuard('customer-jwt') {

    canActivate(context) {
        const req = context.switchToHttp().getRequest();

        const hasToken = req.headers.authorization?.startsWith('Bearer ');

        if (!hasToken) {
            return true; // allow guest
        }

        return super.canActivate(context);
    }

    handleRequest(err, user) {
        if (err) {
            return null;
        }

        return user || null;
    }
}