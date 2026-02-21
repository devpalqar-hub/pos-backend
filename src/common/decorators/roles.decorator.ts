import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../../generated/prisma';

export const ROLES_KEY = 'roles';

/**
 * Decorator to assign required roles to a route handler.
 * @example @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
