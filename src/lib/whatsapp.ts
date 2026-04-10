/**
 * ZapOne - Integração com WhatsApp Cloud API (Meta)
 * Documentação: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const WA_API_VERSION = 'v21.0'
const WA_BASE_URL = `https://graph.facebook.com/${WA_API_VERSION}`

interface SendTextOptions {
  phoneNumberId: string
  accessToken: string
  to: string
  text: string
  previewUrl?: boolean
}

interface SendTemplateOptions {
  phoneNumberId: string
  accessToken: string
  to: string
  templateName: string
  languageCode?: string
  components?: object[]
}

interface SendMediaOptions {
  phoneNumberId: string
  accessToken: string
  to: string
  type: 'image' | 'video' | 'audio' | 'document'
  mediaUrl: string
  caption?: string
  filename?: string
}

// ─── Enviar mensagem de texto ─────────────────────────────────────────────────

export async function sendTextMessage({
  phoneNumberId,
  accessToken,
  to,
  text,
  previewUrl = false,
}: SendTextOptions) {
  const response = await fetch(`${WA_BASE_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: text, preview_url: previewUrl },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`WhatsApp API Error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

// ─── Enviar template ──────────────────────────────────────────────────────────

export async function sendTemplateMessage({
  phoneNumberId,
  accessToken,
  to,
  templateName,
  languageCode = 'pt_BR',
  components = [],
}: SendTemplateOptions) {
  const response = await fetch(`${WA_BASE_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`WhatsApp API Error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

// ─── Enviar mídia ─────────────────────────────────────────────────────────────

export async function sendMediaMessage({
  phoneNumberId,
  accessToken,
  to,
  type,
  mediaUrl,
  caption,
  filename,
}: SendMediaOptions) {
  const mediaObj: Record<string, string> = { link: mediaUrl }
  if (caption) mediaObj.caption = caption
  if (filename) mediaObj.filename = filename

  const response = await fetch(`${WA_BASE_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type,
      [type]: mediaObj,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`WhatsApp API Error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

// ─── Marcar mensagem como lida ────────────────────────────────────────────────

export async function markMessageAsRead({
  phoneNumberId,
  accessToken,
  messageId,
}: {
  phoneNumberId: string
  accessToken: string
  messageId: string
}) {
  const response = await fetch(`${WA_BASE_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  })

  return response.json()
}

// ─── Processar payload do webhook ─────────────────────────────────────────────

export function parseWebhookPayload(body: Record<string, unknown>) {
  const entry = (body.entry as Record<string, unknown>[])?.[0]
  const changes = (entry?.changes as Record<string, unknown>[])?.[0]
  const value = changes?.value as Record<string, unknown>

  if (!value) return null

  const messages = value.messages as Record<string, unknown>[] | undefined
  const statuses = value.statuses as Record<string, unknown>[] | undefined
  const metadata = value.metadata as Record<string, string>

  return {
    phoneNumberId: metadata?.phone_number_id,
    messages: messages || [],
    statuses: statuses || [],
  }
}
