import type { Scout, ScoutRelevanceWindow } from '@rolodex/types';

export interface ScoutResearchSource {
  title: string;
  url: string;
  content: string;
  publishedAt?: string | null;
  score?: number | null;
}

export interface ResearchProvider {
  searchForScout(input: {
    topic: string;
    relevanceWindow: ScoutRelevanceWindow;
  }): Promise<ScoutResearchSource[]>;
}

export interface SummaryProvider {
  summarizeScoutDigest(input: { scout: Scout; sources: ScoutResearchSource[] }): Promise<{
    subject: string;
    html: string;
    text: string;
  }>;
}

export interface EmailProvider {
  sendScoutDigest(input: {
    scout: Scout;
    recipients: string[];
    subject: string;
    html: string;
    text: string;
  }): Promise<void>;
}

// `command-r-plus` alias was deprecated; use a versioned model by default.
const DEFAULT_COHERE_MODEL = 'command-r-plus-08-2024';

const relevanceLabel = (value: ScoutRelevanceWindow) =>
  value === 'day' ? 'last 24 hours' : 'last 7 days';

export const tavilyResearchProvider: ResearchProvider = {
  async searchForScout({ topic, relevanceWindow }) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      throw new Error('Missing TAVILY_API_KEY.');
    }

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: `Research the latest developments about "${topic}" from the ${relevanceLabel(relevanceWindow)}.`,
        topic: 'general',
        search_depth: 'advanced',
        max_results: 6,
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily request failed with HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as {
      results?: Array<{
        title?: string;
        url?: string;
        content?: string;
        published_date?: string;
        score?: number;
      }>;
    };

    return (payload.results ?? [])
      .filter((result) => result.url && result.title)
      .map((result) => ({
        title: result.title ?? result.url ?? 'Untitled source',
        url: result.url ?? '',
        content: result.content ?? '',
        publishedAt: result.published_date ?? null,
        score: result.score ?? null,
      }));
  },
};

export const cohereSummaryProvider: SummaryProvider = {
  async summarizeScoutDigest({ scout, sources }) {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
      throw new Error('Missing COHERE_API_KEY.');
    }

    const fallbackBody = sources.length
      ? sources
          .map(
            (source, index) =>
              `${index + 1}. ${source.title}\nURL: ${source.url}\nPublished: ${source.publishedAt ?? 'Unknown'}\nSummary: ${source.content}`
          )
          .join('\n\n')
      : 'No relevant sources were found for this scout run.';

    const model = process.env.COHERE_MODEL || DEFAULT_COHERE_MODEL;

    const response = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Client-Name': 'rolodex',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You write concise research digests for email. Respond with valid JSON containing subject, html, and text fields only.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              scoutName: scout.name,
              topic: scout.topic,
              relevanceWindow: scout.relevanceWindow,
              sources,
              requirements: {
                subject: 'Short, specific email subject line.',
                html: 'Simple HTML email with a summary, key bullets, and linked sources list.',
                text: 'Plaintext version of the same digest.',
              },
            }),
          },
        ],
        response_format: {
          type: 'json_object',
        },
      }),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(
        `Cohere request failed with HTTP ${response.status} (model=${model}).${details ? ` Body: ${details}` : ''}`
      );
    }

    const payload = (await response.json()) as {
      message?: {
        content?: Array<{
          text?: string;
        }>;
      };
    };

    const rawContent = payload.message?.content?.map((item) => item.text ?? '').join('') ?? '';
    const parsed = JSON.parse(rawContent) as {
      subject?: string;
      html?: string;
      text?: string;
    };

    return {
      subject: parsed.subject?.trim() || `Scout update: ${scout.name}`,
      html:
        parsed.html?.trim() ||
        `<p>No structured summary was returned.</p><pre>${fallbackBody.replace(/[<>&]/g, '')}</pre>`,
      text: parsed.text?.trim() || fallbackBody,
    };
  },
};

export const resendEmailProvider: EmailProvider = {
  async sendScoutDigest({ recipients, subject, html, text }) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;

    if (!apiKey) {
      throw new Error('Missing RESEND_API_KEY.');
    }

    if (!from) {
      throw new Error('Missing RESEND_FROM_EMAIL.');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend request failed with HTTP ${response.status}.`);
    }
  },
};
