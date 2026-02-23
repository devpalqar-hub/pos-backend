import { Module } from '@nestjs/common';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { TableGroupsController } from './table-groups.controller';

@Module({
    controllers: [TableGroupsController, TablesController],
    providers: [TablesService],
    exports: [TablesService],
})
export class TablesModule { }
