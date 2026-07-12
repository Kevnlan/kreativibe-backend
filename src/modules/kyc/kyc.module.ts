import { Module } from '@nestjs/common';
import { KycController, UploadController } from './kyc.controller';
import { KycService } from './kyc.service';
import { StorageService } from '../../shared/storage.service';

@Module({
  controllers: [KycController, UploadController],
  providers: [KycService, StorageService],
})
export class KycModule {}
