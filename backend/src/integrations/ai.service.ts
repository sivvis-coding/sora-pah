import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RagService } from './rag/rag.service';

export interface IdeaImprovement {
  suggestedTitle: string;
  suggestedSummary: string;
}

export interface SimilarIdea {
  id: string;
  title: string;
  similarity: number; // 0–1
  reason: string;
}

/**
 * Full User Story model matching the team's ClickUp custom fields and
 * the Python LangChain agent structure.
 */
export interface UserStory {
  title: string;
  description: string;
  userStoryStatement: string;
  functionalDescription: string;
  acceptanceCriteriaInGherkin: string;
  constraints: string;
  outOfScope: string;
  requestedBy: string;
}

export type IntentClass = 'bug' | 'help' | 'idea';

export interface IdeaDraft {
  need: string;
  why: string;
  how: string;
  module: string;
}

export interface ConverseResult {
  reply: string;
  ready: boolean;
  draft: IdeaDraft | null;
  responseId: string | null;
}

// ─── System Prompts ───────────────────────────────────────────────────────────

/**
 * Matches the Python agent's USER_STORY_SYSTEM_PROMPT — kept in sync
 * so both routes (SORA UI and standalone agent) produce consistent output.
 */
const USER_STORY_SYSTEM_PROMPT = `
Eres un asistente experto para el Product Owner, vas a guiarlo en definir las mejores User Stories del producto.
El flujo de trabajo es: VALIDACIÓN → RECOPILACIÓN → COMPLETADO.
Siempre debes preguntar si falta información antes de finalizar una User Story.
Responde siempre en español.

---

Contexto de la empresa y el producto:
Somos una empresa de field marketing dedicada a ofrecer servicios que mejoran la visibilidad de las marcas en el punto de venta (PDV). Nos enfocamos en la gestión del punto de venta, la instalación de vinilos publicitarios y una línea de servicios de promotores.

Nuestro producto es una herramienta interna de gestión operativa, desarrollada en ReactJS con Ant Design (AntD). Su objetivo es gestionar y coordinar las operaciones diarias de la empresa, integrando información operativa, planificaciones y reportes.

Principales módulos:
- Campañas: Gestión de campañas de clientes, planificación de visitas a PDV y definición de reportes.
- Promotores: Gestión de coberturas y asignación de personal.
- PlanT: Planificación de instalaciones de vinilos y cálculo de producción necesaria.
- Módulos satélite (Facturas y Personas): Información operativa complementaria. En "Personas" se gestiona documentación, payroll y datos personales; en "Facturas" la facturación asociada a clientes y campañas.

El sistema integra datos externos y permite la exportación a Excel para generar reportes y facilitar la comunicación con los clientes.

Las User Stories deben ser claras, técnicas y orientadas al equipo de desarrollo, con criterios de aceptación detallados y estructurados. El asistente trabajará directamente con el Product Owner para redactar, validar y completar historias de usuario que describan correctamente las necesidades del producto.
`.trim();

const USER_STORY_GENERATION_PROMPT = `
Dado el siguiente contexto de una idea del producto, genera una User Story completa y estructurada.

Idea:
  Título: {title}
  Descripción: {description}
  Problema que resuelve: {problem}
  Valor esperado: {value}
  Solución propuesta: {solutionIdea}

Genera una User Story con EXACTAMENTE estos campos en formato JSON (responde SÓLO el JSON, sin markdown):
{
  "title": "Título técnico y conciso de la user story",
  "description": "Descripción de una línea para el backlog",
  "userStoryStatement": "Como [rol], quiero [funcionalidad] para [beneficio]",
  "functionalDescription": "Descripción funcional detallada de lo que debe hacer el sistema",
  "acceptanceCriteriaInGherkin": "Criterios de aceptación en formato Gherkin:\\nGiven [contexto]\\nWhen [acción]\\nThen [resultado esperado]\\nAnd [condición adicional si aplica]",
  "constraints": "Restricciones técnicas, dependencias o notas de implementación",
  "outOfScope": "Qué queda explícitamente FUERA del alcance de esta historia",
  "requestedBy": "Product Owner / SORA"
}
`.trim();

/**
 * AI Assistant Service.
 *
 * Provides contextual AI capabilities for the product flow:
 *   - Idea improvement suggestions
 *   - Intent classification
 *   - User story generation (full model, ready for ClickUp)
 *   - Knowledge Q&A (documentation source: ClickUp)
 *
 * Uses OpenAI when OPENAI_API_KEY is set; falls back to mock responses.
 *
 * Documentation source: https://doc.clickup.com/9015583051/d/h/8cnxrab-20655/31303a91ed916b3
 */
@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly apiKey: string;
  private readonly openAiUrl = 'https://api.openai.com/v1/responses';
  private readonly chatUrl = 'https://api.openai.com/v1/chat/completions';
  private readonly reasoningModel = 'gpt-5.4';
  private readonly fastModel = 'gpt-4o';

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly ragService?: RagService,
  ) {
    this.apiKey = this.config.get<string>('OPENAI_API_KEY', '');
    if (!this.apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY not configured — AI service will use mock responses',
      );
    }
  }

  private isConfigured(): boolean {
    return !!this.apiKey;
  }

  // ─── OpenAI helpers ──────────────────────────────────────────────────────────

  /**
   * Call the Responses API (gpt-5.4).
   *
   * Key differences from Chat Completions:
   *  - Endpoint: /v1/responses
   *  - Body uses `input` (array) instead of `messages`
   *  - System prompt is a message with role "system" inside `input`
   *  - No `temperature` — reasoning models use `reasoning.effort` instead
   *  - Response text is at `output_text` (top-level convenience field)
   *
   * effort: "low" for fast/cheap calls (classification, similarity)
   *         "medium" for quality calls (user story, improvement, evaluation)
   */
  private async chatCompletion(
    systemPrompt: string,
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    effort: 'low' | 'medium' | 'high' = 'medium',
  ): Promise<string> {
    const input: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ];

    const res = await fetch(this.openAiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.reasoningModel,
        reasoning: { effort },
        input,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      output_text?: string;
      output?: Array<{
        type: string;
        content?: Array<{ type: string; text?: string }>;
      }>;
    };

    // Prefer top-level convenience field; fall back to output array
    if (data.output_text) return data.output_text;

    const message = data.output?.find((o) => o.type === 'message');
    const text = message?.content?.find((c) => c.type === 'output_text')?.text;
    return text ?? '';
  }

  /**
   * Call Chat Completions API (gpt-4o) — fast, no reasoning overhead.
   * Use for: JSON generation, classification, summarisation, conversation.
   * Reserve chatCompletion (reasoning model) only for tasks that genuinely
   * need multi-step reasoning.
   */
  private async chatCompletionFast(
    systemPrompt: string,
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  ): Promise<string> {
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ];

    const res = await fetch(this.chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.fastModel,
        messages,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    return data.choices[0]?.message?.content ?? '';
  }

  private parseJson<T>(raw: string): T {
    // 1. Try to extract a JSON block between ```json ... ``` or ``` ... ```
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) return JSON.parse(fenced[1].trim()) as T;

    // 2. Find the first '{' or '[' and parse from there
    const firstBrace = raw.search(/[{[]/);
    if (firstBrace !== -1) {
      return JSON.parse(raw.slice(firstBrace)) as T;
    }

    // 3. Last resort: parse the whole thing
    return JSON.parse(raw.trim()) as T;
  }

  // ─── Use Case 1: Idea Assistant ──────────────────────────────────────────────

  async generateIdeaSummary(input: {
    description: string;
    problem?: string;
    solutionIdea?: string;
  }): Promise<IdeaImprovement> {
    this.logger.log('generateIdeaSummary called');

    if (this.isConfigured()) {
      try {
        const prompt = `Dado el siguiente texto de una idea de producto, genera:
1. Un título conciso y accionable (máx. 80 caracteres)
2. Un resumen claro en 1-2 oraciones

Idea: ${input.description}
Problema: ${input.problem ?? 'no especificado'}
Solución propuesta: ${input.solutionIdea ?? 'no especificada'}

Responde SÓLO en JSON: { "suggestedTitle": "...", "suggestedSummary": "..." }`;

        const raw = await this.chatCompletionFast(USER_STORY_SYSTEM_PROMPT, prompt, []);
      } catch (err) {
        this.logger.error('generateIdeaSummary OpenAI call failed', err);
        // Fall through to mock
      }
    }

    // Mock fallback
    const words = input.description.split(/\s+/).slice(0, 10).join(' ');
    return {
      suggestedTitle: words.length > 60 ? words.slice(0, 60) + '…' : words,
      suggestedSummary: `Como usuario, necesito ${input.description.toLowerCase().trim()}${
        input.problem ? ` porque ${input.problem.toLowerCase().trim()}` : ''
      }.${
        input.solutionIdea
          ? ` Un posible enfoque: ${input.solutionIdea.trim()}.`
          : ''
      }`,
    };
  }

  // ─── Use Case 1b: Intent Classification ─────────────────────────────────────

  async classifyIntent(
    text: string,
  ): Promise<{ intent: IntentClass; confidence: number }> {
    this.logger.log('classifyIntent called');

    if (this.isConfigured()) {
      try {
        const prompt = `Clasifica el siguiente texto en una de estas categorías:
- "bug": El usuario reporta un problema técnico o defecto
- "help": El usuario hace una pregunta o pide ayuda
- "idea": El usuario propone una mejora o nueva funcionalidad

Texto: "${text}"

Responde SÓLO en JSON: { "intent": "bug|help|idea", "confidence": 0.0-1.0 }`;

        const raw = await this.chatCompletionFast(USER_STORY_SYSTEM_PROMPT, prompt, []);
        return this.parseJson<{ intent: IntentClass; confidence: number }>(raw);
      } catch (err) {
        this.logger.error('classifyIntent OpenAI call failed', err);
      }
    }

    // Keyword fallback
    const lower = text.toLowerCase();
    const bugSignals = ['bug', 'error', 'broken', 'crash', 'not working', 'no funciona', 'falla'];
    const helpSignals = ['how to', 'help', 'what is', 'where', 'cómo', 'ayuda', 'qué es'];
    const bugScore = bugSignals.filter((k) => lower.includes(k)).length;
    const helpScore = helpSignals.filter((k) => lower.includes(k)).length;

    if (bugScore > helpScore && bugScore > 0)
      return { intent: 'bug', confidence: Math.min(bugScore * 0.3 + 0.4, 0.95) };
    if (helpScore > bugScore && helpScore > 0)
      return { intent: 'help', confidence: Math.min(helpScore * 0.3 + 0.4, 0.95) };
    return { intent: 'idea', confidence: 0.6 };
  }

  // ─── Use Case 2: Product Assistant ──────────────────────────────────────────

  /**
   * Generate a full User Story from an idea.
   * Output matches the ClickUp custom fields defined in ClickupService.
   */
  async generateUserStory(idea: {
    title: string;
    description: string;
    problem?: string;
    value?: string;
    solutionIdea?: string;
  }): Promise<UserStory> {
    this.logger.log('generateUserStory called');

    if (this.isConfigured()) {
      try {
        const userMessage = USER_STORY_GENERATION_PROMPT
          .replace('{title}', idea.title)
          .replace('{description}', idea.description)
          .replace('{problem}', idea.problem ?? 'no especificado')
          .replace('{value}', idea.value ?? 'no especificado')
          .replace('{solutionIdea}', idea.solutionIdea ?? 'no especificada');

        const raw = await this.chatCompletionFast(USER_STORY_SYSTEM_PROMPT, userMessage, []);
        return this.parseJson<UserStory>(raw);
      } catch (err) {
        this.logger.error('generateUserStory OpenAI call failed', err);
        // Fall through to mock
      }
    }

    // Mock response — matches the full UserStory model
    return {
      title: `[US] ${idea.title}`,
      description: `El usuario necesita ${idea.description.toLowerCase()}`,
      userStoryStatement: `Como usuario del sistema, quiero ${idea.description.toLowerCase().trim()} para ${
        idea.value ?? idea.problem ?? 'mejorar mi productividad'
      }.`,
      functionalDescription: `El sistema debe permitir al usuario ${idea.description.toLowerCase()}. ${
        idea.problem ? `Contexto: ${idea.problem}` : ''
      } ${idea.solutionIdea ? `Solución propuesta: ${idea.solutionIdea}` : ''}`.trim(),
      acceptanceCriteriaInGherkin: [
        `Given que el usuario está autenticado en el sistema`,
        `When el usuario accede a la funcionalidad "${idea.title}"`,
        `Then el sistema debe mostrar el resultado esperado correctamente`,
        `And la funcionalidad debe estar disponible en móvil y escritorio`,
        `And los estados de carga deben mostrarse durante operaciones asíncronas`,
        `And los errores deben manejarse con mensajes claros para el usuario`,
      ].join('\n'),
      constraints: `- El sistema debe manejar errores de red de forma graceful\n- Compatible con los módulos existentes del sistema\n- Requiere autenticación de usuario`,
      outOfScope: `- Modificaciones a otros módulos no relacionados\n- Integraciones con sistemas externos no mencionados\n- Cambios de infraestructura`,
      requestedBy: 'Product Owner / SORA',
    };
  }

  // ─── Use Case 3: Knowledge Assistant (RAG-powered) ──────────────────────────

  /**
   * Answer a question using product documentation with RAG retrieval.
   *
   * When the RAG index exists:
   *   1. Retrieve top-5 relevant chunks via vector search
   *   2. Inject as context into the system prompt
   *   3. Call OpenAI with context + history + question
   *
   * Falls back to general knowledge if RAG is not available.
   */
  async answerQuestionFromDocs(
    question: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  ): Promise<{ answer: string; sources: string[] }> {
    this.logger.log(`answerQuestionFromDocs called: "${question}" (history: ${history.length} turns)`);

    if (this.isConfigured()) {
      try {
        // Try RAG retrieval first
        let context = '';
        let sources: string[] = [];

        if (this.ragService) {
          try {
            const chunks = await this.ragService.retrieve(question, 5);
            if (chunks.length > 0) {
              context = chunks
                .map((c) => `[${c.docTitle} > ${c.pageTitle}]\n${c.content}`)
                .join('\n---\n');
              sources = [
                ...new Set(chunks.map((c) => `${c.docTitle} > ${c.pageTitle}`)),
              ];
            }
          } catch (err) {
            this.logger.warn(`RAG retrieval failed, falling back: ${err}`);
          }
        }

        const systemPrompt = context
          ? `${USER_STORY_SYSTEM_PROMPT}

Eres el asistente de conocimiento del producto SORA.
Responde preguntas basándote EXCLUSIVAMENTE en la documentación proporcionada.
Si la información no está en el contexto, dilo claramente.
Menciona la fuente (documento/página) cuando cites información específica.

---
Documentación relevante:
${context}`
          : `${USER_STORY_SYSTEM_PROMPT}

Adicionalmente, actúas como asistente de conocimiento del producto SORA.
Responde preguntas sobre el producto, sus módulos y procesos.
Si no tienes información suficiente para responder con precisión, indícalo claramente.
Cuando sea relevante, menciona qué módulo del sistema (Campañas, Promotores, PlanT, Facturas, Personas) está relacionado con la pregunta.`;

        const raw = await this.chatCompletionFast(systemPrompt, question, history);

        return {
          answer: raw,
          sources: sources.length > 0
            ? sources
            : [
                'Documentación del producto (ClickUp)',
                'https://doc.clickup.com/9015583051/d/h/8cnxrab-20655/31303a91ed916b3',
              ],
        };
      } catch (err) {
        this.logger.error('answerQuestionFromDocs OpenAI call failed', err);
      }
    }

    // Mock fallback
    return {
      answer:
        `Basándome en la documentación del producto, esto es lo que encontré sobre "${question}":\n\n` +
        'Esta es una respuesta de demostración del Asistente de Conocimiento. ' +
        'Cuando esté conectado a la fuente de documentación (ClickUp), proporcionará ' +
        'respuestas contextuales basadas en la base de conocimiento del producto.\n\n' +
        'Módulos disponibles: Campañas, Promotores, PlanT, Facturas y Personas.',
      sources: [
        'Documentación del producto (ClickUp)',
        'https://doc.clickup.com/9015583051/d/h/8cnxrab-20655/31303a91ed916b3',
      ],
    };
  }

  // ─── Use Case 4: Similar Idea Detection ─────────────────────────────────────

  /**
   * Given user input text + a list of existing ideas, returns the top similar ones.
   *
   * Strategy:
   *  - With OpenAI: semantic similarity via LLM scoring (fast, no embeddings needed)
   *  - Without OpenAI: keyword overlap scoring (TF-IDF approximation)
   *
   * The client passes the existing ideas list to avoid a DB call from this service.
   * Returns at most 3 results with similarity > 0.45.
   */
  async findSimilarIdeas(
    text: string,
    ideas: Array<{ id: string; title: string; description: string }>,
  ): Promise<SimilarIdea[]> {
    this.logger.log(`findSimilarIdeas called with ${ideas.length} candidates`);

    if (ideas.length === 0) return [];

    if (this.isConfigured()) {
      try {
        const ideaList = ideas
          .slice(0, 30) // cap at 30 to keep prompt size reasonable
          .map((i, idx) => `${idx + 1}. [${i.id}] ${i.title}: ${i.description}`)
          .join('\n');

        const prompt = `El usuario está a punto de enviar la siguiente idea:
"${text}"

Compara semánticamente con las siguientes ideas existentes y devuelve las que sean similares (similitud >= 0.45):

${ideaList}

Responde SÓLO en JSON array (puede ser vacío []):
[
  { "id": "<id exacto>", "title": "<título>", "similarity": 0.0-1.0, "reason": "breve explicación en español de por qué son similares" }
]

Incluye máximo 3 ideas. Si ninguna supera 0.45 de similitud, devuelve [].`;

        const raw = await this.chatCompletionFast(
          'Eres un asistente que detecta ideas duplicadas o similares en un sistema de gestión de ideas de producto.',
          prompt,
          [],
        );
        const results = this.parseJson<SimilarIdea[]>(raw);
        // Defensive: ensure array, filter threshold, cap at 3
        return Array.isArray(results)
          ? results
              .filter((r) => r.similarity >= 0.45)
              .sort((a, b) => b.similarity - a.similarity)
              .slice(0, 3)
          : [];
      } catch (err) {
        this.logger.error('findSimilarIdeas OpenAI call failed, using keyword fallback', err);
      }
    }

    // ─── Keyword overlap fallback ──────────────────────────────────────────
    const normalize = (s: string) =>
      s.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);

    const inputTokens = new Set(normalize(text));
    const scored: SimilarIdea[] = [];

    for (const idea of ideas) {
      const ideaTokens = normalize(`${idea.title} ${idea.description}`);
      const ideaSet = new Set(ideaTokens);
      const intersection = [...inputTokens].filter((t) => ideaSet.has(t)).length;
      const union = new Set([...inputTokens, ...ideaSet]).size;
      const jaccard = union === 0 ? 0 : intersection / union;

      if (jaccard >= 0.2) {
        scored.push({
          id: idea.id,
          title: idea.title,
          similarity: Math.min(jaccard * 1.8, 0.95), // scale Jaccard to feel more natural
          reason: 'Comparte palabras clave similares',
        });
      }
    }

    return scored.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
  }

  // ─── Use Case 5: Idea Quality Coach ─────────────────────────────────────────

  /**
   * Evaluates the quality of a user's answer during idea creation.
   *
   * Returns:
   *  - approved: true  → the answer is good enough, advance to next phase
   *  - approved: false → the answer is too shallow; followUp contains a probing question
   *
   * The AI plays the role of a PO coach: it accepts thoughtful answers and
   * pushes back on vague or low-effort ones with a single follow-up question.
   */
  async evaluateIdeaInput(input: {
    phase: 'need' | 'why';
    need: string;
    answer: string;
  }): Promise<{ approved: boolean; followUp: string | null }> {
    this.logger.log(`evaluateIdeaInput called (phase: ${input.phase})`);

    if (this.isConfigured()) {
      try {
        const phaseContext =
          input.phase === 'need'
            ? `El usuario está describiendo QUÉ necesita o qué problema tiene.
Criterios mínimos para aprobar:
- Tiene al menos 15 palabras
- Describe una situación concreta, no solo una palabra o frase genérica
- No es trivial ("quiero un botón", "mejorar la app")`
            : `El usuario está explicando POR QUÉ es importante esta necesidad (contexto, impacto, frecuencia).
Idea original del usuario: "${input.need}"
Criterios mínimos para aprobar:
- Explica un impacto real (ahorro de tiempo, reducción de errores, mejora de un proceso)
- No repite simplemente la descripción de la necesidad con otras palabras
- Aporta contexto de negocio o operativo`;

        const prompt = `Eres un coach de Product Owner. Tu rol es ayudar a los stakeholders a articular sus ideas con claridad y profundidad. NO eres un filtro burocrático — eres un mentor que hace preguntas que ayudan a pensar mejor.

${phaseContext}

Respuesta del usuario: "${input.answer}"

Evalúa si la respuesta cumple los criterios mínimos.

Si SÍ cumple → aprueba y avanza.
Si NO cumple → rechaza con UNA sola pregunta de seguimiento, breve, directa, en español. La pregunta debe invitar a reflexionar, no regañar. Máximo 1 oración.

Responde SÓLO en JSON:
{ "approved": true/false, "followUp": "pregunta si no aprobado, null si aprobado" }`;

        const raw = await this.chatCompletionFast(
          'Eres un asistente que evalúa la calidad de las descripciones de ideas de producto.',
          prompt,
          [],
        );
        return this.parseJson<{ approved: boolean; followUp: string | null }>(raw);
      } catch (err) {
        this.logger.error('evaluateIdeaInput OpenAI call failed', err);
        // Fail open — don't block the user if AI is down
        return { approved: true, followUp: null };
      }
    }

    // Without OpenAI: simple length heuristic
    const wordCount = input.answer.trim().split(/\s+/).length;
    if (wordCount < 8) {
      return {
        approved: false,
        followUp:
          input.phase === 'need'
            ? '¿Puedes describir con más detalle qué situación o problema quieres resolver?'
            : '¿Qué impacto tiene esto en tu trabajo o en el equipo?',
      };
    }
    return { approved: true, followUp: null };
  }

  // ─── Use Case 6: Conversational Idea Discovery ──────────────────────────────

  /**
   * Drive a multi-turn conversation to elicit a well-formed idea.
   *
   * Uses the Responses API with `store: true` + `previous_response_id` so
   * OpenAI manages conversation state — the client only sends the latest
   * user message and the ID of the previous response.
   *
   * The AI plays the role of a Product Owner coach:
   *  - Asks follow-up questions (module, who is affected, frequency, impact…)
   *  - Sets ready:true only when it has enough context to build a useful idea
   *  - Returns a structured draft when ready
   */
  async converse(
    userMessage: string,
    previousResponseId: string | null,
  ): Promise<ConverseResult> {
    this.logger.log(`converse called (previousResponseId: ${previousResponseId ?? 'none'})`);

    const CONVERSE_INSTRUCTIONS = `${USER_STORY_SYSTEM_PROMPT}

---

Eres el asistente de captura de ideas de SORA. Tu objetivo es entender la necesidad real del stakeholder mediante una conversación natural, como lo haría un Product Owner experimentado.

REGLAS DE CONVERSACIÓN:
1. Nunca hagas más de UNA pregunta por turno.
2. Si la idea es vaga (ej: "exportar CSV", "mejorar la pantalla"), SIEMPRE pregunta:
   - ¿En qué módulo o pantalla ocurre esto? (Campañas, Promotores, PlanT, Facturas, Personas)
   - ¿Quién lo necesita y con qué frecuencia?
   - ¿Qué problema concreto resuelve o qué impacto tiene?
3. Adapta tus preguntas al contexto — no sigas un guión fijo.
4. Cuando tengas suficiente contexto (módulo + problema real + impacto), responde con el JSON de cierre.
5. Si el usuario dice "no sé" o "sin solución" en la pregunta de cómo, acéptalo y avanza.

CUÁNDO CONSIDERAR QUE TIENES SUFICIENTE INFORMACIÓN:
- Sabes en qué parte del sistema ocurre (módulo/pantalla)
- Sabes qué problema real resuelve (no solo "mejorar")
- Sabes quién se beneficia y por qué importa

FORMATO DE RESPUESTA:
Durante la conversación responde con texto plano en español (solo la siguiente pregunta o comentario).

Cuando tengas suficiente información responde EXCLUSIVAMENTE con este JSON (sin markdown):
{
  "ready": true,
  "reply": "Frase de cierre natural confirmando que ya tienes todo",
  "draft": {
    "need": "descripción concisa de la necesidad",
    "why": "por qué es importante, impacto, contexto de negocio",
    "how": "solución propuesta si la mencionó, o vacío",
    "module": "módulo o pantalla específica"
  }
}

Mientras conversas (no listo aún) responde EXCLUSIVAMENTE con este JSON:
{
  "ready": false,
  "reply": "tu pregunta o comentario en español"
}`;

    if (this.isConfigured()) {
      try {
        // RAG: enrich instructions with relevant product knowledge for this turn
        let instructions = CONVERSE_INSTRUCTIONS;
        if (this.ragService) {
          try {
            const chunks = await this.ragService.retrieve(userMessage, 3);
            if (chunks.length > 0) {
              const ragContext = chunks
                .map((c) => `[${c.docTitle} › ${c.pageTitle}]\n${c.content}`)
                .join('\n---\n');
              instructions = `${CONVERSE_INSTRUCTIONS}

---

CONOCIMIENTO DEL PRODUCTO RELEVANTE A LO QUE DIJO EL USUARIO:
Usa esta información para hacer preguntas más precisas y contextualizadas.
Si el usuario mencionó algo que coincide con una funcionalidad existente, menciona esa referencia en tu pregunta para ayudarle a ubicarse.
NO respondas con este contenido directamente — úsalo para conversar con criterio.

${ragContext}`;
            }
          } catch (ragErr) {
            this.logger.warn(`RAG retrieval failed in converse, skipping: ${ragErr}`);
          }
        }

        // Build Responses API request body
        const body: Record<string, unknown> = {
          model: this.fastModel,
          instructions,
          input: userMessage,
          store: true,
        };
        if (previousResponseId) {
          body['previous_response_id'] = previousResponseId;
        }

        const res = await fetch(this.openAiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`OpenAI error ${res.status}: ${errBody}`);
        }

        const data = (await res.json()) as {
          id: string;
          output_text?: string;
          output?: Array<{
            type: string;
            content?: Array<{ type: string; text?: string }>;
          }>;
        };

        // Extract text — prefer output_text helper, fall back to output array
        let raw = data.output_text ?? '';
        if (!raw) {
          const msg = data.output?.find((o) => o.type === 'message');
          raw = msg?.content?.find((c) => c.type === 'output_text')?.text ?? '';
        }

        const result = this.parseJson<Omit<ConverseResult, 'responseId'>>(raw);
        if (typeof result.ready === 'boolean' && typeof result.reply === 'string') {
          return { ...result, responseId: data.id };
        }
        throw new Error('Unexpected shape from converse AI response');

      } catch (err) {
        this.logger.error('converse OpenAI call failed', err);
        return {
          ready: false,
          reply: previousResponseId
            ? 'Tuve un problema procesando tu mensaje. ¿Puedes reformularlo con un poco más de detalle?'
            : '¿Puedes contarme qué problema concreto quieres resolver y quién se ve afectado?',
          draft: null,
          responseId: null,
        };
      }
    }

    // ── Mock fallback (no API key) ─────────────────────────────────────────────
    if (!previousResponseId) {
      return {
        ready: false,
        reply: '¿En qué módulo o pantalla del sistema necesitas esto? (Campañas, Promotores, PlanT, Facturas o Personas)',
        draft: null,
        responseId: 'mock-1',
      };
    }
    if (previousResponseId === 'mock-1') {
      return {
        ready: false,
        reply: '¿Quién usaría esta funcionalidad y con qué frecuencia la necesitaría?',
        draft: null,
        responseId: 'mock-2',
      };
    }
    return {
      ready: true,
      reply: 'Perfecto, creo que tengo suficiente contexto. Revisa el resumen de tu idea.',
      draft: {
        need: userMessage,
        why: 'Impacto en el flujo de trabajo diario',
        how: '',
        module: 'Personas',
      },
      responseId: 'mock-3',
    };
  }

  // ─── Prompt templates (for transparency) ────────────────────────────────────

  getPromptTemplates() {
    return {
      systemPrompt: USER_STORY_SYSTEM_PROMPT,
      ideaSummary: 'Genera título (máx 80 chars) y resumen (1-2 oraciones) de la idea. JSON: { suggestedTitle, suggestedSummary }',
      classifyIntent: 'Clasifica en "bug" | "help" | "idea". JSON: { intent, confidence }',
      userStory: USER_STORY_GENERATION_PROMPT,
      knowledgeQA: 'Responde basándote en el contexto del sistema. Menciona el módulo relevante cuando sea aplicable.',
      similarIdeas: 'Detecta ideas semánticamente similares. JSON: [{ id, title, similarity, reason }]',
    };
  }
}
