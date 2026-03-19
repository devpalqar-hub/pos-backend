import { PartialType } from '@nestjs/swagger';
import { CreateLoyalityPointsConverterDto } from './loyality-point-converter.dto';

export class UpdateLoyalityPointsConverterDto extends PartialType(
    CreateLoyalityPointsConverterDto,
) { }