import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DayOfWeek } from '@prisma/client';

export class CreateStaffProfileDto {
    @ApiProperty({
        description: 'Full name of the staff member',
        example: 'John Doe',
        maxLength: 255,
    })
    @IsString()
    @IsNotEmpty({ message: 'Name is required' })
    @MaxLength(255)
    name: string;

    @ApiProperty({
        description: 'Unique email address of the staff member',
        example: 'john@restaurant.com',
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @ApiPropertyOptional({
        description: 'Phone number of the staff member',
        example: '+91 9876543210',
        maxLength: 30,
    })
    @IsOptional()
    @IsString()
    @MaxLength(30)
    phone?: string;

    @ApiPropertyOptional({
        description: 'Job role / designation of the staff member (stored in lowercase)',
        example: 'chef',
        maxLength: 255,
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    @Transform(({ value }) => typeof value === 'string' ? value.toLowerCase().trim() : value)
    jobRole?: string;

    @ApiProperty({
        description: 'Fixed monthly salary amount',
        example: 25000.0,
    })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Type(() => Number)
    monthlySalary: number;

    @ApiProperty({
        description: 'Number of allowed paid leave days per month',
        example: 4,
    })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    paidLeaveDays: number;

    @ApiProperty({
        description: 'Expected daily working hours',
        example: 8.0,
    })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Type(() => Number)
    dailyWorkHours: number;

    @ApiProperty({
        description: 'Working days of the week',
        enum: DayOfWeek,
        isArray: true,
        example: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
    })
    @IsArray()
    @IsEnum(DayOfWeek, { each: true, message: 'Each working day must be a valid day of the week' })
    workingDays: DayOfWeek[];
}
