import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { senhaAtual, novaSenha } = await req.json()
  if (!senhaAtual || !novaSenha || novaSenha.length < 6) {
    return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } })
  if (!user) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

  const valid = await bcrypt.compare(senhaAtual, user.senhaHash)
  if (!valid) return NextResponse.json({ erro: 'Senha atual incorreta' }, { status: 400 })

  const hash = await bcrypt.hash(novaSenha, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: { senhaHash: hash, senhaTrocadaNoPrimeiroAcesso: true },
  })

  return NextResponse.json({ ok: true })
}
