import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AssignStaffDto {
    @ApiProperty({
        description: 'UUID of the user to assign to this restaurant',
        example: 'user-uuid',
    })
    @IsUUID('4', { message: 'userId must be a valid UUID' })
    @IsNotEmpty({ message: 'userId is required' })
    userId: string;
}

export class RemoveStaffDto {
    @ApiProperty({
        description: 'UUID of the user to remove from this restaurant',
        example: 'user-uuid',
    })
    @IsUUID('4', { message: 'userId must be a valid UUID' })
    @IsNotEmpty({ message: 'userId is required' })
    userId: string;
}
