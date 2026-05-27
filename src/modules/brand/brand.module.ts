import { Module } from '@nestjs/common';
import { BrandController } from './brand.controller';
import { BrandService } from './brand.service';
import { StorageService } from '../../shared/storage.service';

@Module({
  controllers: [BrandController],
  providers: [BrandService, StorageService],
})
export class BrandModule {}
