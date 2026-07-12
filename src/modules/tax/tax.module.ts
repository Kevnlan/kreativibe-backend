import { Module } from '@nestjs/common';
import { TaxController } from './tax.controller';
import { TaxService } from './tax.service';
import { StorageService } from '../../shared/storage.service';

@Module({
  controllers: [TaxController],
  providers: [TaxService, StorageService],
})
export class TaxModule {}
