import { Module } from '@nestjs/common';
import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';
import { AiCompletionService } from '../../shared/ai-completion.service';

@Module({
  controllers: [ContractController],
  providers: [ContractService, AiCompletionService],
})
export class ContractModule {}
