import { Injectable, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiCompletionService {
  constructor(private config: ConfigService) {}

  async complete(systemPrompt: string, messages: { role: string; content: string }[]): Promise<string> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.get('OPENROUTER_API_KEY')}`,
        'HTTP-Referer': this.config.get('FRONTEND_URL') as string,
        'X-Title': 'Kreativibe',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.get('OPENROUTER_MODEL'),
        max_tokens: 1500,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
    });

    if (!response.ok) {
      throw new BadGatewayException({ message: 'AI provider request failed', code: 'AI_PROVIDER_ERROR' });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new BadGatewayException({ message: 'AI provider returned no content', code: 'AI_PROVIDER_ERROR' });
    }
    return content;
  }

  parseJson<T>(content: string): T {
    const cleaned = content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '');
    const match = cleaned.match(/[{[][\s\S]*[}\]]/);
    try {
      return JSON.parse(match ? match[0] : cleaned) as T;
    } catch {
      throw new BadGatewayException({ message: 'AI provider returned invalid JSON', code: 'AI_PARSE_ERROR' });
    }
  }
}
