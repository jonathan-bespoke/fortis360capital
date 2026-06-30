import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { token, novaSenha } = await req.json()
  if (!token || !novaSenha || novaSenha.length < 6) {
    return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return NextResponse.json({ erro: 'Token inválido ou expirado' }, { status: 400 })
  }

  const hash = await bcrypt.hash(novaSenha, 12)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { senhaHash: hash, senhaTrocadaNoPrimeiroAcesso: true },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ])

  return NextResponse.json({ ok: true })
}
