import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const contacts = await prisma.contact.findMany({
      where: { tenantId: user.tenantId },
      include: {
        tags: {
          include: { tag: true }
        },
        conversations: {
          select: {
            id: true,
            status: true,
            unreadCount: true,
            lastMessageAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ contacts })
  } catch (error) {
    console.error('Erro ao buscar contatos:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { phone, name, email, notes } = body

    // Verificar se o contato já existe
    const existingContact = await prisma.contact.findUnique({
      where: {
        phone_tenantId: {
          phone,
          tenantId: user.tenantId
        }
      }
    })

    if (existingContact) {
      return NextResponse.json({ error: 'Contato já existe' }, { status: 400 })
    }

    const contact = await prisma.contact.create({
      data: {
        phone,
        name,
        email,
        notes,
        tenantId: user.tenantId
      },
      include: {
        tags: {
          include: { tag: true }
        }
      }
    })

    return NextResponse.json({ contact }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar contato:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}