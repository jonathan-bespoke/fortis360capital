import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdminOrGestor() {
  const session = await getSession()
  const role = (session?.user as any)?.role
  return ['admin', 'gestor_trafego'].includes(role) ? session : null
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminOrGestor())) return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })

  const body = await req.json()
  const { nome, gerenciaId, corretorIds } = body

  const roleta = await prisma.roleta.update({
    where: { id: params.id },
    data: {
      ...(nome ? { nome } : {}),
      ...(gerenciaId !== undefined ? { gerenciaId } : {}),
    },
  })

  if (corretorIds !== undefined) {
    await prisma.roletaCorretor.deleteMany({ where: { roletaId: params.id } })
    if (corretorIds.length > 0) {
      await prisma.roletaCorretor.createMany({
        data: corretorIds.map((id: string) => ({ roletaId: params.id, corretorId: id })),
      })
    }
  }

  return NextResponse.json(roleta)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminOrGestor())) return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  await prisma.roleta.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
