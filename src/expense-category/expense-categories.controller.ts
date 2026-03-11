import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
    Delete,
    Query,
    ParseUUIDPipe,
} from '@nestjs/common'

import {
    ApiTags,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiBody,
    ApiResponse,
} from '@nestjs/swagger'

import { ExpenseCategoriesService } from './expense-categories.service'
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto'
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto'

@ApiTags('Expense Categories')
@Controller('expense-categories')
export class ExpenseCategoriesController {
    constructor(private readonly service: ExpenseCategoriesService) { }

    @Post()
    @ApiOperation({
        summary: 'Create a new expense category',
        description:
            'Creates a new expense category for tracking operational expenses such as rent, utilities, salaries, etc.',
    })
    @ApiBody({ type: CreateExpenseCategoryDto })
    @ApiResponse({
        status: 201,
        description: 'Expense category successfully created',
    })
    create(@Body() dto: CreateExpenseCategoryDto) {
        return this.service.create(dto)
    }

    @Get()
    @ApiOperation({
        summary: 'Get all expense categories',
        description:
            'Returns a list of expense categories. Optionally filter by restaurant.',
    })
    @ApiQuery({
        name: 'restaurantId',
        required: false,
        description: 'Restaurant UUID to filter categories',
    })
    @ApiResponse({
        status: 200,
        description: 'List of expense categories',
    })
    findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('fetchAll') fetchAll?: string,
    ) {
        return this.service.findAll(
            Number(page ?? 1),
            Number(limit ?? 10),
            fetchAll === 'true'
        )
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get expense category by ID',
        description: 'Fetch a single expense category using its unique ID.',
    })
    @ApiParam({
        name: 'id',
        description: 'Expense category UUID',
    })
    @ApiResponse({
        status: 200,
        description: 'Expense category details',
    })
    @ApiResponse({
        status: 404,
        description: 'Expense category not found',
    })
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.service.findOne(id)
    }

    @Patch(':id')
    @ApiOperation({
        summary: 'Update an expense category',
        description: 'Updates the name, description, or status of an expense category.',
    })
    @ApiParam({
        name: 'id',
        description: 'Expense category UUID',
    })
    @ApiBody({ type: UpdateExpenseCategoryDto })
    @ApiResponse({
        status: 200,
        description: 'Expense category successfully updated',
    })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateExpenseCategoryDto,
    ) {
        return this.service.update(id, dto)
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete an expense category',
        description:
            'Deletes an expense category permanently from the system.',
    })
    @ApiParam({
        name: 'id',
        description: 'Expense category UUID',
    })
    @ApiResponse({
        status: 200,
        description: 'Expense category successfully deleted',
    })
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.service.remove(id)
    }
}