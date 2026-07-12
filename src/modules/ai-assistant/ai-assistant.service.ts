import { Injectable, NotFoundException } from '@nestjs/common';
import { AiAssistantType, AiChatRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AiCompletionService } from '../../shared/ai-completion.service';

import {
  CreateSessionDto,
  ChatDto,
  ListSessionsDto,
  ContentSuggestionsDto,
  PricingAdviceDto,
  CreatorMatchDto,
} from './dto/ai-assistant.dto';

const SYSTEM_PROMPTS: Record<string, string> = {
  CAMPAIGN_BUILDER: `You are Kreativibe's AI campaign assistant. You help brands turn a rough idea into a clear influencer marketing campaign brief through conversation. Ask clarifying questions about objective, target audience, platforms, content types, budget, and timeline when information is missing. Reply with strict JSON only: {"reply": "<your conversational reply>", "suggestions": ["<short follow-up>", ...]}`,
  CONTENT_SUGGESTIONS: `You are Kreativibe's AI content strategist. You help creators and brands come up with engaging content ideas. Reply with strict JSON only: {"ideas": [{"title": string, "description": string, "format": string, "estimatedReach": string, "tips": string[]}], "suggestions": ["<short follow-up>", ...]}`,
  PRICING_ADVISOR: `You are Kreativibe's AI pricing advisor for content creators in East Africa. You help creators price their content based on platform, content type, follower count, engagement rate, and niche. Reply with strict JSON only: {"recommendedPrice": number, "priceRange": {"min": number, "max": number}, "currency": "KES", "reasoning": string, "factors": string[], "suggestions": ["<short follow-up>", ...]}`,
  CREATOR_MATCH: `You are Kreativibe's AI creator matching assistant. You help brands find the best creators for their campaigns. Reply with strict JSON only: {"matches": [{"creatorName": string, "matchScore": number, "reasons": string[], "estimatedCost": number}], "suggestions": ["<short follow-up>", ...]}`,
  GENERAL: `You are Kreativibe's AI assistant for the creator economy in East Africa. You help with questions about content creation, brand collaborations, campaigns, pricing, and platform best practices. Reply with strict JSON only: {"reply": "<your reply>", "suggestions": ["<short follow-up>", ...]}`,
};

@Injectable()
export class AiAssistantService {
  constructor(
    private prisma: PrismaService,
    private ai: AiCompletionService,
  ) {}

  async createSession(userId: string, dto: CreateSessionDto) {
    return this.prisma.aiChatSession.create({
      data: {
        userId,
        type: dto.type as AiAssistantType,
        title: dto.title,
        context: dto.context,
      },
    });
  }

  async listSessions(userId: string, dto: ListSessionsDto) {
    const where: Prisma.AiChatSessionWhereInput = {
      userId,
      ...(dto.type ? { type: dto.type as AiAssistantType } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.aiChatSession.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
        select: {
          id: true, type: true, title: true, createdAt: true, updatedAt: true,
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.aiChatSession.count({ where }),
    ]);

    return { items, total, page: dto.page, limit: dto.limit };
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.aiChatSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) throw new NotFoundException({ message: 'Session not found', code: 'SESSION_NOT_FOUND' });
    return session;
  }

  async deleteSession(userId: string, sessionId: string) {
    await this.getSession(userId, sessionId);
    await this.prisma.aiChatSession.delete({ where: { id: sessionId } });
    return { success: true };
  }

  async chat(userId: string, dto: ChatDto) {
    const session = await this.getSession(userId, dto.sessionId);

    // Save user message
    await this.prisma.aiChatMessage.create({
      data: {
        sessionId: dto.sessionId,
        role: 'USER' as AiChatRole,
        content: dto.message,
      },
    });

    // Build conversation history for AI
    const messages = session.messages.map((m) => ({
      role: m.role === 'USER' ? 'user' : 'assistant',
      content: m.content,
    }));
    messages.push({ role: 'user', content: dto.message });

    const systemPrompt = SYSTEM_PROMPTS[session.type] ?? SYSTEM_PROMPTS.GENERAL;
    const content = await this.ai.complete(systemPrompt, messages);
    const parsed = this.ai.parseJson<{ reply?: string; suggestions?: string[] }>(content);

    const replyText = parsed.reply ?? JSON.stringify(parsed);

    // Save assistant message
    const assistantMessage = await this.prisma.aiChatMessage.create({
      data: {
        sessionId: dto.sessionId,
        role: 'ASSISTANT' as AiChatRole,
        content: replyText,
        metadata: parsed,
      },
    });

    // Update session title if not set
    if (!session.title) {
      await this.prisma.aiChatSession.update({
        where: { id: dto.sessionId },
        data: { title: dto.message.slice(0, 100) },
      });
    }

    return {
      reply: replyText,
      suggestions: parsed.suggestions ?? [],
      messageId: assistantMessage.id,
    };
  }

  // ── Quick AI endpoints (no session needed) ───────────────────────────────────

  async contentSuggestions(dto: ContentSuggestionsDto) {
    const prompt = `Generate 5 content ideas${dto.platform ? ` for ${dto.platform}` : ''}${dto.niche ? ` in the ${dto.niche} niche` : ''}${dto.audience ? ` targeting ${dto.audience}` : ''}${dto.campaignObjective ? ` for a campaign about ${dto.campaignObjective}` : ''}.`;

    const content = await this.ai.complete(SYSTEM_PROMPTS.CONTENT_SUGGESTIONS, [
      { role: 'user', content: prompt },
    ]);
    return this.ai.parseJson(content);
  }

  async pricingAdvice(dto: PricingAdviceDto) {
    const prompt = `I'm a content creator on ${dto.platform} creating ${dto.contentType} content. I have ${dto.followers} followers${dto.averageEngagement ? ` with ${dto.averageEngagement}% average engagement` : ''}${dto.niche ? ` in the ${dto.niche} niche` : ''}. How should I price my content?`;

    const content = await this.ai.complete(SYSTEM_PROMPTS.PRICING_ADVISOR, [
      { role: 'user', content: prompt },
    ]);
    return this.ai.parseJson(content);
  }

  async creatorMatch(userId: string, dto: CreatorMatchDto) {
    // First, get actual creators from the database matching criteria
    const where: Prisma.CreatorProfileWhereInput = {
      isVerified: true,
      ...(dto.platforms.length > 0 ? { categories: { hasSome: dto.platforms } } : {}),
    };

    const creators = await this.prisma.creatorProfile.findMany({
      where,
      take: dto.limit * 2,
      orderBy: { averageRating: 'desc' },
      select: {
        id: true, bio: true, categories: true, averageRating: true,
        totalReviews: true, totalEarnings: true,
        user: { select: { id: true, name: true } },
      },
    });

    // Use AI to rank and explain matches
    const prompt = `I'm a brand looking for creators for a campaign.
Objective: ${dto.campaignObjective}
Target audience: ${dto.targetAudience ?? 'General'}
Platforms: ${dto.platforms.join(', ') || 'Any'}
Content types: ${dto.contentType.join(', ') || 'Any'}
Budget: ${dto.budgetMin ?? 0} - ${dto.budgetMax ?? 'No limit'} KES

Here are ${creators.length} creators from our platform:
${JSON.stringify(creators.slice(0, dto.limit * 2).map((c) => ({ name: c.user.name, categories: c.categories, rating: c.averageRating, reviews: c.totalReviews })))}

Rank the top ${dto.limit} creators that best match this campaign and explain why.`;

    const content = await this.ai.complete(SYSTEM_PROMPTS.CREATOR_MATCH, [
      { role: 'user', content: prompt },
    ]);
    return this.ai.parseJson(content);
  }
}
