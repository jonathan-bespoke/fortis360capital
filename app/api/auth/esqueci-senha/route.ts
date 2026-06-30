import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ erro: 'Email obrigatório' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email } })

  // Sempre retorna 200 para não revelar se o email existe
  if (!user) return NextResponse.json({ ok: true })

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1h

  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  })

  // TODO: enviar email com link de redefinição
  // Link: /redefinir-senha?token=<token>
  console.log(`[reset-senha] Token para ${email}: ${token}`)

  return NextResponse.json({ ok: true })
}
