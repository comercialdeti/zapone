import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const tags = await prisma.tag.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ tags })
  } catch (error) {
    console.error('Erro ao buscar tags:', error)
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
    const { name, color } = body

    const tag = await prisma.tag.create({
      data: {
        name,
        color: color || '#6366f1',
        tenantId: user.tenantId
      }
    })

    return NextResponse.json({ tag }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar tag:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}