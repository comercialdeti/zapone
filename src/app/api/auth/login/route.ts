import { NextRequest, NextResponse } from 'next/server'
import { login } from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  tenantSlug: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, tenantSlug } = loginSchema.parse(body)

    const { token, user } = await login(email, password, tenantSlug)

    const response = NextResponse.json({ user }, { status: 200 })

    // Seta cookie HTTP-only
    response.cookies.set('zapone_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/',
    })

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
