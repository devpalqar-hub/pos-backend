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
var PriceRulesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceRulesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pagination_util_1 = require("../common/utlility/pagination.util");
const create_price_rule_dto_1 = require("./dto/create-price-rule.dto");
const client_1 = require("@prisma/client");
const RULE_INCLUDE = {
    days: { select: { id: true, day: true } },
    menuItem: { select: { id: true, name: true, price: true } },
    restaurant: { select: { id: true, name: true } },
};
let PriceRulesService = PriceRulesService_1 = class PriceRulesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PriceRulesService_1.name);
    }
    async getManageableRestaurantIds(actor) {
        if (actor.role === client_1.UserRole.SUPER_ADMIN)
            return [];
        if (actor.role === client_1.UserRole.OWNER) {
            const restaurants = await this.prisma.restaurant.findMany({
                where: { ownerId: actor.id },
                select: { id: true },
            });
            return restaurants.map((r) => r.id);
        }
        if (actor.role === client_1.UserRole.RESTAURANT_ADMIN) {
            if (actor.restaurantId)
                return [actor.restaurantId];
            return [];
        }
        return null;
    }
    async assertAccess(actor, restaurantId) {
        if (actor.role === client_1.UserRole.SUPER_ADMIN)
            return;
        if (actor.role !== client_1.UserRole.OWNER &&
            actor.role !== client_1.UserRole.RESTAURANT_ADMIN) {
            throw new common_1.ForbiddenException('Insufficient permissions for price rules');
        }
        const ids = await this.getManageableRestaurantIds(actor);
        if (!ids.includes(restaurantId)) {
            throw new common_1.ForbiddenException(`You do not have access to restaurant ${restaurantId}`);
        }
    }
    async assertRestaurantExists(restaurantId) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });
        if (!restaurant) {
            throw new common_1.NotFoundException(`Restaurant ${restaurantId} not found`);
        }
    }
    async assertMenuItemExists(restaurantId, menuItemId) {
        const item = await this.prisma.menuItem.findFirst({
            where: { id: menuItemId, restaurantId },
        });
        if (!item) {
            throw new common_1.NotFoundException(`Menu item ${menuItemId} not found in restaurant ${restaurantId}`);
        }
    }
    validateDto(dto) {
        if (dto.ruleType === create_price_rule_dto_1.PriceRuleType.RECURRING_WEEKLY) {
            if (!dto.days || dto.days.length === 0) {
                throw new common_1.BadRequestException('days is required for RECURRING_WEEKLY price rules');
            }
        }
        if (dto.ruleType === create_price_rule_dto_1.PriceRuleType.LIMITED_TIME) {
            if (!dto.startDate || !dto.endDate) {
                throw new common_1.BadRequestException('startDate and endDate are required for LIMITED_TIME price rules');
            }
            if (new Date(dto.startDate) >= new Date(dto.endDate)) {
                throw new common_1.BadRequestException('startDate must be before endDate');
            }
        }
        if (dto.startTime && dto.endTime) {
            if (dto.startTime >= dto.endTime) {
                throw new common_1.BadRequestException('startTime must be before endTime');
            }
        }
    }
    async create(actor, restaurantId, menuItemId, dto) {
        await this.assertAccess(actor, restaurantId);
        await this.assertRestaurantExists(restaurantId);
        await this.assertMenuItemExists(restaurantId, menuItemId);
        this.validateDto(dto);
        const rule = await this.prisma.priceRule.create({
            data: {
                name: dto.name,
                ruleType: dto.ruleType,
                specialPrice: dto.specialPrice,
                startTime: dto.startTime ?? null,
                endTime: dto.endTime ?? null,
                startDate: dto.startDate ? new Date(dto.startDate) : null,
                endDate: dto.endDate ? new Date(dto.endDate) : null,
                priority: dto.priority ?? 0,
                isActive: dto.isActive ?? true,
                restaurantId,
                menuItemId,
                createdById: actor.id,
                days: dto.ruleType === create_price_rule_dto_1.PriceRuleType.RECURRING_WEEKLY && dto.days?.length
                    ? {
                        create: dto.days.map((day) => ({ day: day })),
                    }
                    : undefined,
            },
            include: RULE_INCLUDE,
        });
        return rule;
    }
    async findAllByMenuItem(actor, restaurantId, menuItemId, page = 1, limit = 10, ruleType, isActive) {
        await this.assertAccess(actor, restaurantId);
        await this.assertRestaurantExists(restaurantId);
        await this.assertMenuItemExists(restaurantId, menuItemId);
        const where = {
            restaurantId,
            menuItemId,
            ...(ruleType !== undefined && { ruleType }),
            ...(isActive !== undefined && { isActive }),
        };
        return (0, pagination_util_1.paginate)({
            prismaModel: this.prisma.priceRule,
            page,
            limit,
            where,
            orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
            include: RULE_INCLUDE,
        });
    }
    async findAllByRestaurant(actor, restaurantId) {
        await this.assertAccess(actor, restaurantId);
        await this.assertRestaurantExists(restaurantId);
        return this.prisma.priceRule.findMany({
            where: { restaurantId },
            orderBy: [{ menuItemId: 'asc' }, { priority: 'desc' }],
            include: RULE_INCLUDE,
        });
    }
    async findOne(actor, restaurantId, menuItemId, id) {
        await this.assertAccess(actor, restaurantId);
        const rule = await this.prisma.priceRule.findFirst({
            where: { id, restaurantId, menuItemId },
            include: RULE_INCLUDE,
        });
        if (!rule) {
            throw new common_1.NotFoundException(`Price rule ${id} not found`);
        }
        return rule;
    }
    async update(actor, restaurantId, menuItemId, id, dto) {
        await this.assertAccess(actor, restaurantId);
        const existing = await this.prisma.priceRule.findFirst({
            where: { id, restaurantId, menuItemId },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Price rule ${id} not found`);
        }
        const merged = {
            name: dto.name ?? existing.name,
            ruleType: (dto.ruleType ?? existing.ruleType),
            specialPrice: dto.specialPrice ?? existing.specialPrice?.toString(),
            startTime: dto.startTime ?? existing.startTime ?? undefined,
            endTime: dto.endTime ?? existing.endTime ?? undefined,
            startDate: dto.startDate ?? existing.startDate?.toISOString(),
            endDate: dto.endDate ?? existing.endDate?.toISOString(),
            priority: dto.priority ?? existing.priority,
            isActive: dto.isActive ?? existing.isActive,
            days: dto.days,
        };
        this.validateDto(merged);
        const daysUpdate = dto.days !== undefined
            ? {
                days: {
                    deleteMany: {},
                    create: (dto.ruleType ?? existing.ruleType) === create_price_rule_dto_1.PriceRuleType.RECURRING_WEEKLY
                        ? dto.days.map((day) => ({ day: day }))
                        : [],
                },
            }
            : {};
        const updated = await this.prisma.priceRule.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.ruleType !== undefined && { ruleType: dto.ruleType }),
                ...(dto.specialPrice !== undefined && { specialPrice: dto.specialPrice }),
                ...(dto.startTime !== undefined && { startTime: dto.startTime }),
                ...(dto.endTime !== undefined && { endTime: dto.endTime }),
                ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
                ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
                ...(dto.priority !== undefined && { priority: dto.priority }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
                ...daysUpdate,
            },
            include: RULE_INCLUDE,
        });
        return updated;
    }
    async remove(actor, restaurantId, menuItemId, id) {
        await this.assertAccess(actor, restaurantId);
        const rule = await this.prisma.priceRule.findFirst({
            where: { id, restaurantId, menuItemId },
        });
        if (!rule) {
            throw new common_1.NotFoundException(`Price rule ${id} not found`);
        }
        await this.prisma.priceRule.delete({ where: { id } });
        return { id };
    }
    async getEffectivePrice(actor, restaurantId, menuItemId, atTime) {
        await this.assertAccess(actor, restaurantId);
        await this.assertRestaurantExists(restaurantId);
        await this.assertMenuItemExists(restaurantId, menuItemId);
        const now = atTime ?? new Date();
        const item = await this.prisma.menuItem.findUnique({
            where: { id: menuItemId },
            select: { price: true },
        });
        if (!item)
            throw new common_1.NotFoundException(`Menu item ${menuItemId} not found`);
        const rules = await this.prisma.priceRule.findMany({
            where: { restaurantId, menuItemId, isActive: true },
            include: { days: true },
            orderBy: [{ priority: 'desc' }],
        });
        const jsDay = now.getDay();
        const dayMap = {
            0: 'SUNDAY',
            1: 'MONDAY',
            2: 'TUESDAY',
            3: 'WEDNESDAY',
            4: 'THURSDAY',
            5: 'FRIDAY',
            6: 'SATURDAY',
        };
        const currentDayName = dayMap[jsDay];
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const matchingRules = rules.filter((rule) => {
            if (rule.ruleType === 'LIMITED_TIME') {
                if (!rule.startDate || !rule.endDate)
                    return false;
                if (now < rule.startDate || now > rule.endDate)
                    return false;
            }
            if (rule.ruleType === 'RECURRING_WEEKLY') {
                const dayMatch = rule.days.some((d) => d.day === currentDayName);
                if (!dayMatch)
                    return false;
            }
            if (rule.startTime && rule.endTime) {
                if (currentTime < rule.startTime || currentTime > rule.endTime) {
                    return false;
                }
            }
            return true;
        });
        if (matchingRules.length === 0) {
            return {
                menuItemId,
                basePrice: item.price,
                effectivePrice: item.price,
                appliedRule: null,
            };
        }
        matchingRules.sort((a, b) => {
            if (b.priority !== a.priority)
                return b.priority - a.priority;
            if (a.ruleType === 'LIMITED_TIME' && b.ruleType !== 'LIMITED_TIME')
                return -1;
            if (b.ruleType === 'LIMITED_TIME' && a.ruleType !== 'LIMITED_TIME')
                return 1;
            return 0;
        });
        const winningRule = matchingRules[0];
        return {
            menuItemId,
            basePrice: item.price,
            effectivePrice: winningRule.specialPrice,
            appliedRule: {
                id: winningRule.id,
                name: winningRule.name,
                ruleType: winningRule.ruleType,
                priority: winningRule.priority,
            },
        };
    }
};
exports.PriceRulesService = PriceRulesService;
exports.PriceRulesService = PriceRulesService = PriceRulesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PriceRulesService);
//# sourceMappingURL=price-rules.service.js.map