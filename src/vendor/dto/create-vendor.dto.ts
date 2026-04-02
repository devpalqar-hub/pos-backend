import {
    IsString,
    IsOptional,
    IsArray,
    IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVendorDto {
    @ApiProperty({
        description: 'Vendor display name',
        example: 'Fresh Farm Supplies',
    })
    @IsString()
    name: string;

    @ApiPropertyOptional({
        description: 'Primary contact person name',
        example: 'Arjun Patel',
    })
    @IsOptional()
    @IsString()
    contactPerson?: string;

    @ApiPropertyOptional({
        description: 'Primary contact phone number',
        example: '+91-9876543210',
    })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({
        description: 'Vendor email address',
        example: 'accounts@freshfarm.example',
    })
    @IsOptional()
    @IsString()
    email?: string;

    @ApiPropertyOptional({
        description: 'Vendor billing or office address',
        example: '12 Market Street, Ahmedabad',
    })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({
        description: 'GST registration number',
        example: '24ABCDE1234F1Z5',
    })
    @IsOptional()
    @IsString()
    gstNumber?: string;

    @ApiPropertyOptional({
        description: 'PAN number',
        example: 'ABCDE1234F',
    })
    @IsOptional()
    @IsString()
    panNumber?: string;

    @ApiProperty({
        type: [String],
        description: 'List of vendor category UUIDs to map this vendor to.',
        example: ['7f053d3f-3ad2-441a-8a5f-745d2ad6a4ce'],
    })
    @IsArray()
    @IsUUID('all', { each: true })
    categoryIds: string[];
}