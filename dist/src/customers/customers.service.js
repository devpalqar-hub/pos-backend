"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pagination_util_1 = require("../common/utlility/pagination.util");
const client_1 = require("@prisma/client");
let CustomersService = class CustomersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(actor, restaurantId, dto) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        const existing = await this.prisma.customer.findUnique({
            where: { restaurantId_phone: { restaurantId, phone: dto.phone } },
        });
        if (existing) {
            throw new common_1.ConflictException(`Customer with phone "${dto.phone}" already exists in this restaurant`);
        }
        return this.prisma.customer.create({
            data: {
                restaurantId,
                phone: dto.phone,
                name: dto.name ?? null,
            },
        });
    }
    async findAll(actor, restaurantId, page = 1, limit = 10, search) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');
        const where = { restaurantId };
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { phone: { contains: search } },
            ];
        }
        return (0, pagination_util_1.paginate)({
            prismaModel: this.prisma.customer,
            page,
            limit,
            where,
            orderBy: [{ createdAt: 'desc' }],
        });
    }
    async findOne(actor, restaurantId, id) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');
        const customer = await this.prisma.customer.findFirst({
            where: { id, restaurantId },
            include: {
                loyalityPointRedemptions: {
                    orderBy: { redeemedAt: 'desc' },
                    take: 20,
                    include: { loyalityPoint: { select: { id: true, name: true } } },
                },
            },
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer ${id} not found in restaurant ${restaurantId}`);
        }
        return customer;
    }
    async findByPhone(actor, restaurantId, phone) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');
        const customer = await this.prisma.customer.findUnique({
            where: { restaurantId_phone: { restaurantId, phone } },
            include: {
                loyalityPointRedemptions: {
                    orderBy: { redeemedAt: 'desc' },
                    take: 20,
                    include: { loyalityPoint: { select: { id: true, name: true } } },
                },
            },
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer with phone "${phone}" not found in restaurant ${restaurantId}`);
        }
        return customer;
    }
    async update(actor, restaurantId, id, dto) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        const customer = await this.prisma.customer.findFirst({
            where: { id, restaurantId },
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer ${id} not found in restaurant ${restaurantId}`);
        }
        if (dto.phone && dto.phone !== customer.phone) {
            const conflict = await this.prisma.customer.findUnique({
                where: { restaurantId_phone: { restaurantId, phone: dto.phone } },
            });
            if (conflict) {
                throw new common_1.ConflictException(`Customer with phone "${dto.phone}" already exists in this restaurant`);
            }
        }
        return this.prisma.customer.update({
            where: { id },
            data: {
                ...(dto.phone !== undefined && { phone: dto.phone }),
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
        });
    }
    async remove(actor, restaurantId, id) {
        this.assertAdminOrAbove(actor);
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        const customer = await this.prisma.customer.findFirst({
            where: { id, restaurantId },
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer ${id} not found in restaurant ${restaurantId}`);
        }
        await this.prisma.customer.delete({ where: { id } });
        return { message: `Customer "${customer.name ?? customer.phone}" deleted successfully` };
    }
    async assertRestaurantAccess(actor, restaurantId, mode) {
        if (actor.role === client_1.UserRole.SUPER_ADMIN)
            return;
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });
        if (!restaurant)
            throw new common_1.NotFoundException(`Restaurant ${restaurantId} not found`);
        if (actor.role === client_1.UserRole.OWNER) {
            if (restaurant.ownerId !== actor.id) {
                throw new common_1.ForbiddenException('You do not own this restaurant');
            }
            return;
        }
        if (actor.restaurantId !== restaurantId) {
            throw new common_1.ForbiddenException('You are not assigned to this restaurant');
        }
        if (mode === 'manage' &&
            (actor.role === client_1.UserRole.WAITER ||
                actor.role === client_1.UserRole.CHEF ||
                actor.role === client_1.UserRole.BILLER)) {
            throw new common_1.ForbiddenException('WAITER, CHEF and BILLER can only view customers, not manage them');
        }
    }
    assertAdminOrAbove(actor) {
        const allowed = [
            client_1.UserRole.SUPER_ADMIN,
            client_1.UserRole.OWNER,
            client_1.UserRole.RESTAURANT_ADMIN,
        ];
        if (!allowed.includes(actor.role)) {
            throw new common_1.ForbiddenException('Insufficient permissions to delete customers');
        }
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map