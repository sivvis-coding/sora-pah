import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../database/app-config.service';

/**
 * Lightweight service that uses OpenAI to suggest tags for an idea.
 * Kept separate from AIService to avoid circular dependency:
 *   TagsModule → AIModule → IdeasModule → TagsModule
 *
 * Only depends on AppConfigService (global), so no circular imports.
 */
@Injectable()
export class TagSuggestionService {
  private readonly fastModel = 'gpt-4o';

  constructor(private readonly appConfig: AppConfigService) {}

  private async getApiKey(): Promise<string> {
    return (await this.appConfig.get('openai', 'apiKey')) ?? '';
  }

  async suggestTags(
    title: string,
    description: string,
    existingTagNames: string[],
  ): Promise<string[]> {
    const apiKey = await this.getApiKey();
    if (!apiKey) return [];

    const existingList = existingTagNames.length > 0
      ? `Tags existentes (reutiliza si aplica): ${existingTagNames.join(', ')}`
      : 'No hay tags existentes aún — crea los que sean más descriptivos.';

    const prompt = `
Analiza la siguiente idea y sugiere entre 3 y 5 tags descriptivos en español.
${existingList}

Idea:
Título: ${title}
Descripción: ${description}

Reglas:
- Reutiliza tags existentes cuando encajen exactamente.
- Crea tags nuevos solo si ninguno existente describe bien el concepto.
- Tags en minúsculas, sin acentos, máximo 30 caracteres cada uno.
- Responde SOLO con JSON válido: { "tags": ["tag1", "tag2", "tag3"] }
`.trim();

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.fastModel,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 150,
        }),
      });

      if (!response.ok) return [];
      const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
      const content = data.choices?.[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(content) as { tags?: unknown };
      if (!Array.isArray(parsed.tags)) return [];
      return (parsed.tags as unknown[])
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.toLowerCase().trim())
        .slice(0, 5);
    } catch {
      return [];
    }
  }
}
