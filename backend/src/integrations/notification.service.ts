import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ─── Payload types ───────────────────────────────────────────────────────────

interface BaseNotification {
  type: string;
  ideaTitle: string;
  ideaId: string;
  ideaUrl: string;
}

export interface IdeaStatusNotification extends BaseNotification {
  type: 'idea_status';
  recipientEmail: string;
  recipientName: string;
  newStatus: 'backlog' | 'implemented' | 'discarded';
  discardReason?: string;
}

export interface ShareIdeaNotification extends BaseNotification {
  type: 'share_idea';
  recipientEmail: string;
  senderName: string;
  message?: string;
}

type TeamsNotification = IdeaStatusNotification | ShareIdeaNotification;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly webhookUrl: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.webhookUrl = this.config.get<string>('TEAMS_NOTIFICATION_WEBHOOK_URL');

    if (!this.webhookUrl) {
      this.logger.warn(
        'TEAMS_NOTIFICATION_WEBHOOK_URL not set — Teams notifications disabled',
      );
    }
  }

  /**
   * Notify idea author of a status change via Power Automate.
   * Fire-and-forget — never throws, never blocks the caller.
   */
  notifyIdeaStatusChange(
    payload: Omit<IdeaStatusNotification, 'type'>,
  ): void {
    this.send({ ...payload, type: 'idea_status' });
  }

  /**
   * Share an idea with one or more recipients via Power Automate.
   * Sends one webhook call per recipient — Power Automate delivers each individually.
   */
  shareIdea(
    recipients: { email: string }[],
    payload: Omit<ShareIdeaNotification, 'type' | 'recipientEmail'>,
  ): void {
    for (const r of recipients) {
      this.send({ ...payload, type: 'share_idea', recipientEmail: r.email });
    }
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private send(payload: TeamsNotification): void {
    if (!this.webhookUrl) return;

    this.post(payload).catch((err) => {
      this.logger.error(
        `Failed to send Teams notification (${payload.type}) for idea ${payload.ideaId}: ${err.message}`,
      );
    });
  }

  private async post(payload: TeamsNotification): Promise<void> {
    const link = `<a href="${payload.ideaUrl}">💡 Ver idea</a>`;

    let text: string;

    if (payload.type === 'idea_status') {
      const statusLabel: Record<string, string> = {
        backlog: '🗂️ añadida al backlog — el equipo la tiene en el radar',
        implemented: '✅ implementada — ¡enhorabuena!',
        discarded: '❌ descartada',
      };
      const label = statusLabel[payload.newStatus] ?? payload.newStatus;
      text = `Hola ${payload.recipientName} 👋, tu idea "<b>${payload.ideaTitle}</b>" ha sido ${label}.`;
      if (payload.newStatus === 'discarded' && payload.discardReason) {
        text += `<br>Motivo: <i>${payload.discardReason}</i>`;
      }
      text += `<br><br>${link}`;
    } else {
      const msg = payload.message ? `<br><i>${payload.message}</i>` : '';
      text = `👋 <b>${payload.senderName}</b> cree que esta idea te puede interesar:<br><b>${payload.ideaTitle}</b>${msg}<br><br>${link}`;
    }

    const body = {
      email: payload.recipientEmail,
      text,
      url: payload.ideaUrl,
    };

    const response = await fetch(this.webhookUrl!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Webhook responded ${response.status}: ${response.statusText}`);
    }

    this.logger.log(
      `Notification sent (${payload.type}) → ${payload.recipientEmail} (idea: ${payload.ideaId})`,
    );
  }
}
