import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { AssignStaffDto, RemoveStaffDto } from './dto/assign-staff.dto';
import { User } from '@prisma/client';
export declare class RestaurantsController {
    private readonly restaurantsService;
    constructor(restaurantsService: RestaurantsService);
    kitchen: any;
    create(actor: User, dto: CreateRestaurantDto): Promise<{
        message: string;
        data: object;
    }>;
    findAll(actor: User, page?: string, limit?: string): Promise<{
        message: string;
        data: object;
    }>;
    findOne(actor: User, id: string): Promise<{
        message: string;
        data: object;
    }>;
    update(actor: User, id: string, dto: UpdateRestaurantDto): Promise<{
        message: string;
        data: object;
    }>;
    remove(actor: User, id: string): Promise<{
        message: string;
    }>;
    getStaff(actor: User, id: string, name?: string, roles?: string, isActive?: string): Promise<{
        message: string;
        data: object[];
    }>;
    assignStaff(actor: User, id: string, dto: AssignStaffDto): Promise<object>;
    removeStaff(actor: User, id: string, dto: RemoveStaffDto): Promise<object>;
    getWorkingHours(actor: User, id: string): Promise<{
        message: string;
        data: object[];
    }>;
}
