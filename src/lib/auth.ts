import { NextRequest, NextResponse } from 'next/server'
import { prisma } from './prisma'
import { redis } from './redis'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'zapone-secret-change-in-production'
)

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  tenantId: string
  tenantSlug: string
}

// ─── Gerar token JWT ──────────────────────────────────────────────────────────

export async function generateToken(user: AuthUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

// ─── Verificar token ──────────────────────────────────────────────────────────

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as AuthUser
  } catch {
    return null
  }
}

// ─── Hash de senha ────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string, tenantSlug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) throw new Error('Empresa não encontrada')

  const user = await prisma.user.findUnique({
    where: { email_tenantId: { email, tenantId: tenant.id } },
  })

  if (!user || !user.isActive) throw new Error('Credenciais inválidas')

  const valid = await comparePassword(password, user.password)
  if (!valid) throw new Error('Credenciais inválidas')

  const authUser: AuthUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    tenantSlug: tenant.slug,
  }

  const token = await generateToken(authUser)

  // Salva sessão no Redis (7 dias)
  await redis.setex(`session:${token}`, 60 * 60 * 24 * 7, JSON.stringify(authUser))

  return { token, user: authUser }
}

// ─── Middleware helper ────────────────────────────────────────────────────────

export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const token =
    req.cookies.get('zapone_token')?.value ||
    req.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) return null

  // Tenta pegar do Redis (cache)
  const cached = await redis.get(`session:${token}`)
  if (cached) return JSON.parse(cached)

  // Fallback: verifica JWT
  return verifyToken(token)
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(token: string) {
  await redis.del(`session:${token}`)
}
