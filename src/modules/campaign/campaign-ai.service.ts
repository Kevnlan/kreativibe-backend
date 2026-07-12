import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AiCompletionService } from '../../shared/ai-completion.service';
import { AiChatDto, AiBriefDto, RecommendPackagesDto, CreateConversationDto } from './dto/ai.dto';

const CHAT_SYSTEM_PROMPT = `You are Kreativibe's AI campaign assistant. You help brands turn a rough idea into a clear influencer marketing campaign brief through conversation.
Ask clarifying questions about objective, target audience, platforms, content types, budget, and timeline when information is missing.
Always reply with strict JSON only, no markdown, in this exact shape:
{"reply": "<your conversational reply>", "suggestions": ["<short follow-up suggestion>", ...]}
"suggestions" should be 0-4 short strings the brand could tap to continue the conversation. Do not include anything outside the JSON object.`;

const BRIEF_SYSTEM_PROMPT = `You are Kreativibe's AI campaign assistant. Given a conversation between a brand and the assistant about a planned influencer marketing campaign, extract a structured campaign brief.
Reply with strict JSON only, no markdown, in this exact shape:
{
  "title": string,
  "objective": string,
  "targetAudience": { "demographics": string[], "interests": string[], "location": string|null },
  "platforms": string[],
  "contentType": string[],
  "budget": { "min": number, "max": number, "currency": string },
  "timeline": { "startDate": string|null, "endDate": string|null, "milestones": string[] },
  "deliverables": string[]
}
Infer reasonable values for anything not explicitly discussed. Do not include anything outside the JSON object.`;

const PACKAGE_SYSTEM_PROMPT = `You are Kreativibe's AI campaign assistant. Given a structured campaign brief, propose 2-3 campaign package options that fit the brand's budget.
Reply with strict JSON only, no markdown, as an array of objects in this exact shape:
[{
  "id": string,
  "name": string,
  "description": string,
  "price": number,
  "currency": string,
  "features": string[],
  "recommended": boolean,
  "estimatedReach": number,
  "estimatedEngagement": number,
  "suitableFor": string[]
}]
Exactly one package should have "recommended": true. Do not include anything outside the JSON array.`;

@Injectable()
export class CampaignAiService {
  constructor(
    private ai: AiCompletionService,
    private prisma: PrismaService,
  ) {}

  private async brandProfileId(userId: string) {
    const profile = await this.prisma.brandProfile.findUniqueOrThrow({ where: { userId } });
    return profile.id;
  }

  async chat(dto: AiChatDto) {
    const content = await this.ai.complete(CHAT_SYSTEM_PROMPT, dto.messages);
    return this.ai.parseJson<{ reply: string; suggestions?: string[] }>(content);
  }

  async brief(dto: AiBriefDto) {
    const content = await this.ai.complete(BRIEF_SYSTEM_PROMPT, dto.messages);
    return this.ai.parseJson<Record<string, unknown>>(content);
  }

  async recommendPackages(dto: RecommendPackagesDto) {
    const content = await this.ai.complete(PACKAGE_SYSTEM_PROMPT, [
      { role: 'user', content: JSON.stringify(dto.brief) },
    ]);
    return this.ai.parseJson<Record<string, unknown>[]>(content);
  }

  async createConversation(userId: string, dto: CreateConversationDto) {
    const brandProfileId = await this.brandProfileId(userId);
    return this.prisma.aiConversation.create({
      data: { brandProfileId, title: dto.title, messages: dto.messages },
    });
  }

  async listConversations(userId: string) {
    const brandProfileId = await this.brandProfileId(userId);
    return this.prisma.aiConversation.findMany({
      where: { brandProfileId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getConversation(userId: string, id: string) {
    const brandProfileId = await this.brandProfileId(userId);
    const conversation = await this.prisma.aiConversation.findFirst({ where: { id, brandProfileId } });
    if (!conversation) throw new NotFoundException({ message: 'Conversation not found', code: 'CONVERSATION_NOT_FOUND' });
    return conversation;
  }

  async deleteConversation(userId: string, id: string) {
    await this.getConversation(userId, id);
    await this.prisma.aiConversation.delete({ where: { id } });
  }
}
