import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateProfileDto } from './dto/update-user.dto';
import { User } from '../../generated/prisma';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(actor: User, dto: CreateUserDto): Promise<{
        message: string;
        data: object;
    }>;
    findAll(actor: User): Promise<{
        message: string;
        data: object[];
    }>;
    getProfile(actor: User): Promise<{
        message: string;
        data: object;
    }>;
    updateProfile(actor: User, dto: UpdateProfileDto): Promise<{
        message: string;
        data: object;
    }>;
    findOne(actor: User, id: string): Promise<{
        message: string;
        data: object;
    }>;
    update(actor: User, id: string, dto: UpdateUserDto): Promise<{
        message: string;
        data: object;
    }>;
    remove(actor: User, id: string): Promise<{
        message: string;
    }>;
}
