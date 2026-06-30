import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const updateSchema = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  senha: z.string().min(6).optional(),
  ativo: z.boolean().optional(),
  gerenciaId: z.string().optional(),
})

async function requireAdmin() {
  const session = await getSession()
  return (session?.user as any)?.role === 'admin' ? session : null
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })
  }

  const { senha, gerenciaId, ...rest } = parsed.data

  const updates: any = { ...rest }
  if (senha) {
    updates.senhaHash = await bcrypt.hash(senha, 12)
    updates.senhaTrocadaNoPrimeiroAcesso = false
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...updates,
      ...(gerenciaId
        ? { corretor: { update: { gerenciaId } } }
        : {}),
    },
  })

  return NextResponse.json({ id: user.id })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  await prisma.user.update({
    where: { id: params.id },
    data: { ativo: false },
  })

  return NextResponse.json({ ok: true })
}
