import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        waPhoneNumberId: true,
        waBusinessAccountId: true,
        waAccessToken: true,
        waWebhookSecret: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            contacts: true,
            conversations: true,
            messages: true
          }
        }
      }
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ tenant })
  } catch (error) {
    console.error('Erro ao buscar configurações:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Só owners e admins podem alterar configurações
    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 })
    }

    const body = await req.json()
    const {
      name,
      waPhoneNumberId,
      waBusinessAccountId,
      waAccessToken,
      waWebhookSecret
    } = body

    const tenant = await prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        name,
        waPhoneNumberId,
        waBusinessAccountId,
        waAccessToken,
        waWebhookSecret
      },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        waPhoneNumberId: true,
        waBusinessAccountId: true,
        waAccessToken: true,
        waWebhookSecret: true,
        updatedAt: true
      }
    })

    return NextResponse.json({ tenant })
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}