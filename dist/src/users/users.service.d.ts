import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateProfileDto } from './dto/update-user.dto';
import { User } from '@prisma/client';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(actor: User, dto: CreateUserDto): Promise<object>;
    findAll(actor: User, page?: number, limit?: number): Promise<object>;
    findOne(actor: User, targetId: string): Promise<object>;
    update(actor: User, targetId: string, dto: UpdateUserDto): Promise<object>;
    getProfile(actor: User): Promise<object>;
    updateProfile(actor: User, dto: UpdateProfileDto): Promise<object>;
    remove(actor: User, targetId: string): Promise<{
        message: string;
    }>;
    private assertCanCreate;
    private assertCanViewUser;
    private assertCanEditUser;
    private assertOwnsRestaurant;
    private assertOwnerCanManage;
    private filterResponse;
}
