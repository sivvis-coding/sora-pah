import { Module } from '@nestjs/common';
import { GraphController } from './graph.controller';
import { MsGraphModule } from '../../integrations/msgraph.module';

@Module({
  imports: [MsGraphModule],
  controllers: [GraphController],
})
export class GraphModule {}
