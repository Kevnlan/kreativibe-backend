import { Module } from '@nestjs/common';
import { CountryController, AdminCountryController } from './country.controller';
import { CountryService } from './country.service';

@Module({
  controllers: [CountryController, AdminCountryController],
  providers: [CountryService],
})
export class CountryModule {}
