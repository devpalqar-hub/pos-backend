import { PrismaService } from '../prisma/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { AssignStaffDto, RemoveStaffDto } from './dto/assign-staff.dto';
import { User } from '@prisma/client';
export declare class RestaurantsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(actor: User, dto: CreateRestaurantDto): Promise<object>;
    findAll(actor: User, page?: number, limit?: number): Promise<object>;
    findOne(actor: User, id: string): Promise<object>;
    update(actor: User, id: string, dto: UpdateRestaurantDto): Promise<object>;
    remove(actor: User, id: string): Promise<{
        message: string;
    }>;
    assignStaff(actor: User, restaurantId: string, dto: AssignStaffDto): Promise<object>;
    removeStaff(actor: User, restaurantId: string, dto: RemoveStaffDto): Promise<object>;
    private readonly VALID_ROLES;
    getStaff(actor: User, restaurantId: string, filters?: {
        name?: string;
        roles?: string[];
        isActive?: boolean;
    }, page?: number, limit?: number): Promise<object>;
    getWorkingHours(actor: User, restaurantId: string): Promise<object[]>;
    private assertCanViewRestaurant;
    private assertCanEditRestaurant;
    private assertCanManageStaff;
    private buildSlug;
    private assertSlugAvailable;
    private upsertWorkingHours;
    private filterResponse;
}
