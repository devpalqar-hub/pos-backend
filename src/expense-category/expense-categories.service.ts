import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto'
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto'
import { paginate } from 'src/common/utlility/pagination.util'

@Injectable()
export class ExpenseCategoriesService {

    constructor(private prisma: PrismaService) { }

    async create(dto: CreateExpenseCategoryDto) {
        return this.prisma.expenseCategory.create({
            data: dto
        })
    }

    async findAll(
        page = 1,
        limit = 10,
        fetchAll = false,
    ) {
        return paginate({
            prismaModel: this.prisma.expenseCategory,
            page,
            limit,
            fetchAll,
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async findOne(id: string) {

        const category = await this.prisma.expenseCategory.findUnique({
            where: { id }
        })

        if (!category) {
            throw new NotFoundException('Expense category not found')
        }

        return category
    }

    async update(id: string, dto: UpdateExpenseCategoryDto) {

        await this.findOne(id)

        return this.prisma.expenseCategory.update({
            where: { id },
            data: dto
        })
    }

    async remove(id: string) {

        await this.findOne(id)

        return this.prisma.expenseCategory.delete({
            where: { id }
        })
    }
}