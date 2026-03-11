import { Module } from '@nestjs/common'
import { ExpenseCategoriesService } from './expense-categories.service'
import { ExpenseCategoriesController } from './expense-categories.controller'
import { PrismaService } from '../prisma/prisma.service'

@Module({
    controllers: [ExpenseCategoriesController],
    providers: [ExpenseCategoriesService, PrismaService],
    exports: [ExpenseCategoriesService]
})
export class ExpenseCategoriesModule { }