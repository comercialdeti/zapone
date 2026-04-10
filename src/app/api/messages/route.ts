import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { sendTextMessage } from '@/lib/whatsapp'
import { z } from 'zod'

const sendSchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1),
  type: z.enum(['TEXT', 'IMAGE', 'DOCUMENT']).default('TEXT'),
  mediaUrl: z.string().optional(),
})

// ─── POST: Enviar mensagem ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { conversationId, content, type, mediaUrl } = sendSchema.parse(body)

  // Busca conversa e tenant
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId: user.tenantId },
    include: { contact: true },
  })

  if (!conversation) {
    return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } })
  if (!tenant?.waPhoneNumberId || !tenant?.waAccessToken) {
    return NextResponse.json({ error: 'WhatsApp não configurado' }, { status: 400 })
  }

  // Envia via WhatsApp API
  const waResult = await sendTextMessage({
    phoneNumberId: tenant.waPhoneNumberId,
    accessToken: tenant.waAccessToken,
    to: conversation.contact.phone,
    text: content,
  })

  // Salva no banco
  const message = await prisma.message.create({
    data: {
      waMessageId: waResult.messages?.[0]?.id,
      direction: 'OUTBOUND',
      type: type as never,
      content,
      mediaUrl,
      tenantId: user.tenantId,
      conversationId,
      senderId: user.id,
      status: 'SENT',
    },
    include: { sender: { select: { id: true, name: true, avatar: true } } },
  })

  // Atualiza lastMessageAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  })

  // Publica no Redis para tempo real
  await redis.publish(
    `tenant:${user.tenantId}:messages`,
    JSON.stringify({ event: 'new_message', conversationId, message })
  )

  return NextResponse.json({ message }, { status: 201 })
}

// ─── GET: Listar mensagens de uma conversa ────────────────────────────────────

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get('conversationId')
  const cursor = searchParams.get('cursor')
  const limit = parseInt(searchParams.get('limit') || '50')

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId obrigatório' }, { status: 400 })
  }

  const messages = await prisma.message.findMany({
    where: { conversationId, tenantId: user.tenantId },
    include: { sender: { select: { id: true, name: true, avatar: true } } },
    orderBy: { sentAt: 'asc' },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  })

  return NextResponse.json({ messages })
}
