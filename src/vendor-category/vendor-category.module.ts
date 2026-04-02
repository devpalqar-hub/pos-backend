import { Module } from '@nestjs/common';
import { VendorCategoryService } from './vendor-category.service';
import { VendorCategoryController } from './vendor-category.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
    controllers: [VendorCategoryController],
    providers: [VendorCategoryService, PrismaService],
})
export class VendorCategoryModule { }