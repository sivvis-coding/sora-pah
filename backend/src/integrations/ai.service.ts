import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RagService } from './rag/rag.service';

export interface IdeaImprovement {
  suggestedTitle: string;
  suggestedSummary: string;
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
  private readonly openAiUrl = 'https://api.openai.com/v1/chat/completions';
  private readonly model = 'gpt-4o-mini';

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

  private async chatCompletion(
    systemPrompt: string,
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  ): Promise<string> {
    const res = await fetch(this.openAiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.4,
        messages: [
          { role: 'system', content: systemPrompt },
          // Inject prior conversation turns (mirrors InMemorySaver in the Python agent)
          ...history.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage },
        ],
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
    // Strip ```json ... ``` fences if model adds them
    const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    return JSON.parse(cleaned) as T;
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

        const raw = await this.chatCompletion(USER_STORY_SYSTEM_PROMPT, prompt);
        return this.parseJson<IdeaImprovement>(raw);
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

        const raw = await this.chatCompletion(USER_STORY_SYSTEM_PROMPT, prompt);
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

        const raw = await this.chatCompletion(USER_STORY_SYSTEM_PROMPT, userMessage);
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

        const raw = await this.chatCompletion(systemPrompt, question, history);

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

  // ─── Prompt templates (for transparency) ────────────────────────────────────

  getPromptTemplates() {
    return {
      systemPrompt: USER_STORY_SYSTEM_PROMPT,
      ideaSummary: 'Genera título (máx 80 chars) y resumen (1-2 oraciones) de la idea. JSON: { suggestedTitle, suggestedSummary }',
      classifyIntent: 'Clasifica en "bug" | "help" | "idea". JSON: { intent, confidence }',
      userStory: USER_STORY_GENERATION_PROMPT,
      knowledgeQA: 'Responde basándote en el contexto del sistema. Menciona el módulo relevante cuando sea aplicable.',
    };
  }
}
