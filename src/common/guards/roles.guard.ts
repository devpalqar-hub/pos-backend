// src/common/guards/roles.guard.ts
import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();

    this.logger.debug(
      `User role: "${user?.role}" | Required: ${JSON.stringify(requiredRoles)} | Match: ${requiredRoles.includes(user?.role)}`,
    );

    return requiredRoles.includes(user?.role);
  }
}
