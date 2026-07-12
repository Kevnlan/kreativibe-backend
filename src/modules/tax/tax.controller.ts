import {
  Controller, Post, Body, UseGuards, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { TaxService } from './tax.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  saveTaxInfoSchema, SaveTaxInfoDto,
  generateReportSchema, GenerateReportDto,
  uploadTaxDocSchema,
} from './dto/tax.dto';
import { idSchema, IdDto } from '../../common/dto/id.dto';

@Controller('tax')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CREATOR)
export class TaxController {
  constructor(private tax: TaxService) {}

  @Post('compliance/get')
  compliance(@CurrentUser() user: any) {
    return this.tax.compliance(user.id);
  }

  @Post('info/save')
  saveInfo(@CurrentUser() user: any, @Body(new ZodValidationPipe(saveTaxInfoSchema)) dto: SaveTaxInfoDto) {
    return this.tax.saveInfo(user.id, dto);
  }

  @Post('report/generate')
  generateReport(
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(generateReportSchema)) dto: GenerateReportDto,
  ) {
    return this.tax.generateReport(user.id, dto);
  }

  @Post('documents/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(uploadTaxDocSchema)) body: { type: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.tax.uploadDocument(user.id, body.type, file);
  }

  @Post('documents/list')
  listDocuments(@CurrentUser() user: any) {
    return this.tax.listDocuments(user.id);
  }

  @Post('documents/delete')
  deleteDocument(@CurrentUser() user: any, @Body(new ZodValidationPipe(idSchema)) dto: IdDto) {
    return this.tax.deleteDocument(user.id, dto.id);
  }
}
