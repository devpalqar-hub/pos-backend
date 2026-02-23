import { PartialType } from '@nestjs/swagger';
import { CreateTableGroupDto } from './create-table-group.dto';

export class UpdateTableGroupDto extends PartialType(CreateTableGroupDto) { }
