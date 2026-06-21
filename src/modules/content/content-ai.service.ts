import { Injectable } from '@nestjs/common';
import { AiCompletionService } from '../../shared/ai-completion.service';
import { AdviseContentDto } from './dto/advise.dto';

const ADVISOR_SYSTEM_PROMPT = `You are Kreativibe's AI content strategy advisor. Given a creator's content type, niche, platforms, audience size, and style, give pricing and growth advice.
Reply with strict JSON only, no markdown, in this exact shape:
{
  "suggestedPricePerPost": number,
  "packageDealPrice": number,
  "potentialMonthlyEarnings": number,
  "growthTips": string[],
  "contentStrategy": { "postFrequency": string, "bestPostingTimes": string[], "recommendedHashtags": string[] },
  "brandAttractionTactics": string[]
}
All currency amounts are in KES. Do not include anything outside the JSON object.`;

@Injectable()
export class ContentAiService {
  constructor(private ai: AiCompletionService) {}

  async advise(dto: AdviseContentDto) {
    const content = await this.ai.complete(ADVISOR_SYSTEM_PROMPT, [{ role: 'user', content: JSON.stringify(dto) }]);
    return this.ai.parseJson<Record<string, unknown>>(content);
  }
}
