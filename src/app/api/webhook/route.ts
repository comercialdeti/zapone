/**
 * ZapOne - Webhook WhatsApp (Meta Cloud API)
 * GET  = verificação do webhook
 * POST = receber mensagens em tempo real
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { parseWebhookPayload, markMessageAsRead } from '@/lib/whatsapp'
import crypto from 'crypto'

// ─── GET: Verificação do Webhook ──────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('[Webhook] Verificado com sucesso!')
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ─── POST: Receber Mensagens ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Verificar assinatura (segurança)
  const signature = req.headers.get('x-hub-signature-256')
  if (!verifySignature(JSON.stringify(body), signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const parsed = parseWebhookPayload(body)
  if (!parsed) return NextResponse.json({ status: 'ok' })

  const { phoneNumberId, messages, statuses } = parsed

  // Encontra o tenant pelo número de telefone
  const tenant = await prisma.tenant.findFirst({
    where: { waPhoneNumberId: phoneNumberId },
  })

  if (!tenant) {
    console.warn(`[Webhook] Tenant não encontrado para phoneNumberId: ${phoneNumberId}`)
    return NextResponse.json({ status: 'ok' })
  }

  // ─── Processar mensagens recebidas ───────────────────────────────────────

  for (const msg of messages) {
    const msgData = msg as Record<string, unknown>
    const from = msgData.from as string
    const waMessageId = msgData.id as string
    const timestamp = msgData.timestamp as string
    const msgType = msgData.type as string

    // Extrai conteúdo da mensagem
    let content = ''
    if (msgType === 'text') {
      content = ((msgData.text as Record<string, string>)?.body) || ''
    } else if (['image', 'video', 'audio', 'document'].includes(msgType)) {
      const mediaObj = msgData[msgType] as Record<string, string>
      content = mediaObj?.caption || `[${msgType}]`
    }

    // Busca ou cria contato
    const contact = await prisma.contact.upsert({
      where: { phone_tenantId: { phone: from, tenantId: tenant.id } },
      create: { phone: from, tenantId: tenant.id },
      update: {},
    })

    // Busca ou cria conversa aberta
    let conversation = await prisma.conversation.findFirst({
      where: {
        contactId: contact.id,
        tenantId: tenant.id,
        status: { in: ['OPEN', 'PENDING'] },
      },
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          contactId: contact.id,
          tenantId: tenant.id,
          status: 'OPEN',
          kanbanCol: 'NEW',
        },
      })
    }

    // Salva mensagem
    const message = await prisma.message.create({
      data: {
        waMessageId,
        direction: 'INBOUND',
        type: msgType.toUpperCase() as never,
        content,
        tenantId: tenant.id,
        conversationId: conversation.id,
        sentAt: new Date(parseInt(timestamp) * 1000),
      },
    })

    // Atualiza unreadCount e lastMessageAt da conversa
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        unreadCount: { increment: 1 },
        lastMessageAt: new Date(),
      },
    })

    // Publica no Redis para atualização em tempo real (Socket.io)
    await redis.publish(
      `tenant:${tenant.id}:messages`,
      JSON.stringify({
        event: 'new_message',
        conversationId: conversation.id,
        message,
        contact,
      })
    )

    // Marca como lida automaticamente (opcional - pode desabilitar)
    if (tenant.waPhoneNumberId && tenant.waAccessToken) {
      await markMessageAsRead({
        phoneNumberId: tenant.waPhoneNumberId,
        accessToken: tenant.waAccessToken,
        messageId: waMessageId,
      }).catch(() => {}) // silencia erros de read receipt
    }
  }

  // ─── Processar atualizações de status ────────────────────────────────────

  for (const status of statuses) {
    const statusData = status as Record<string, string>
    await prisma.message.updateMany({
      where: { waMessageId: statusData.id },
      data: { status: statusData.status?.toUpperCase() as never },
    })

    // Notifica em tempo real
    await redis.publish(
      `tenant:${tenant.id}:status`,
      JSON.stringify({ event: 'message_status', ...statusData })
    )
  }

  return NextResponse.json({ status: 'ok' })
}

// ─── Verificação de assinatura ────────────────────────────────────────────────

function verifySignature(body: string, signature: string | null): boolean {
  if (!signature || !process.env.META_APP_SECRET) return true // Dev mode

  const expected = `sha256=${crypto
    .createHmac('sha256', process.env.META_APP_SECRET)
    .update(body)
    .digest('hex')}`

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
