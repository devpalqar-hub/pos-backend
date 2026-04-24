import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
    constructor(private readonly prisma: PrismaService) { }

    async create(customerId: string, restaurantId: string, dto: CreateAddressDto) {
        if (dto.isDefault) {
            await this.prisma.address.updateMany({
                where: { customerId, restaurantId },
                data: { isDefault: false },
            });
        }

        return this.prisma.address.create({
            data: {
                customerId,
                restaurantId,
                label: dto.label ?? null,
                line1: dto.line1,
                line2: dto.line2 ?? null,
                city: dto.city,
                state: dto.state ?? null,
                postalCode: dto.postalCode ?? null,
                country: dto.country ?? null,
                latitude: dto.latitude ?? null,
                longitude: dto.longitude ?? null,
                instructions: dto.instructions ?? null,
                isDefault: dto.isDefault ?? false,
            },
        });
    }

    async findAll(customerId: string, restaurantId: string) {
        return this.prisma.address.findMany({
            where: { customerId, restaurantId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        });
    }

    async findOne(customerId: string, restaurantId: string, id: string) {
        const address = await this.prisma.address.findFirst({
            where: { id, customerId, restaurantId },
        });

        if (!address) {
            throw new NotFoundException('Address not found');
        }

        return address;
    }

    async update(customerId: string, restaurantId: string, id: string, dto: UpdateAddressDto) {
        await this.findOne(customerId, restaurantId, id);

        if (dto.isDefault) {
            await this.prisma.address.updateMany({
                where: { customerId, restaurantId },
                data: { isDefault: false },
            });
        }

        return this.prisma.address.update({
            where: { id },
            data: {
                ...dto,
                latitude: dto.latitude,
                longitude: dto.longitude,
            },
        });
    }

    async remove(customerId: string, restaurantId: string, id: string) {
        await this.findOne(customerId, restaurantId, id);

        return this.prisma.address.delete({
            where: { id },
        });
    }
}
