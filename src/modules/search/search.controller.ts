import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  searchContentSchema, SearchContentDto,
  searchCreatorsSchema, SearchCreatorsDto,
  searchCampaignsSchema, SearchCampaignsDto,
  recommendationsSchema, RecommendationsDto,
} from './dto/search.dto';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private search: SearchService) {}

  @Post('content')
  searchContent(@Body(new ZodValidationPipe(searchContentSchema)) dto: SearchContentDto) {
    return this.search.searchContent(dto);
  }

  @Post('creators')
  searchCreators(@Body(new ZodValidationPipe(searchCreatorsSchema)) dto: SearchCreatorsDto) {
    return this.search.searchCreators(dto);
  }

  @Post('campaigns')
  searchCampaigns(@Body(new ZodValidationPipe(searchCampaignsSchema)) dto: SearchCampaignsDto) {
    return this.search.searchCampaigns(dto);
  }

  @Post('recommendations')
  recommendations(@CurrentUser() user: any, @Body(new ZodValidationPipe(recommendationsSchema)) dto: RecommendationsDto) {
    return this.search.recommendations(user.id, dto);
  }
}
