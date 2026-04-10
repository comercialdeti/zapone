import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { scheduleCampaign } from '@/workers/blast.worker'
import { z } from 'zod'

const createCampaignSchema = z.object({
  name: z.string().min(1),
  message: z.string().min(1),
  mediaUrl: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  phones: z.array(z.string()).min(1),
  contactIds: z.array(z.string()).optional(),
})

// ─── POST: Criar campanha ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { name, message, mediaUrl, scheduledAt, phones, contactIds } =
    createCampaignSchema.parse(body)

  // Cria campanha
  const campaign = await prisma.blastCampaign.create({
    data: {
      name,
      message,
      mediaUrl,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      totalCount: phones.length,
      tenantId: user.tenantId,
      recipients: {
        create: phones.map((phone, i) => ({
          phone,
          contactId: contactIds?.[i] || null,
        })),
      },
    },
  })

  // Agenda ou dispara agora
  if (scheduledAt) {
    await scheduleCampaign(campaign.id, new Date(scheduledAt))
  }

  return NextResponse.json({ campaign }, { status: 201 })
}

// ─── GET: Listar campanhas ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const campaigns = await prisma.blastCampaign.findMany({
    where: { tenantId: user.tenantId },
    include: { _count: { select: { recipients: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ campaigns })
}
