import { Module } from '@nestjs/common';
import { CreatorController } from './creator.controller';
import { CreatorService } from './creator.service';
import { StorageService } from '../../shared/storage.service';

@Module({
  controllers: [CreatorController],
  providers: [CreatorService, StorageService],
})
export class CreatorModule {}
