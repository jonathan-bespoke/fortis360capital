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

  // desativados: corretor IDs to mark ativo=false; removes previously excluded ones not in list
  if (body.desativados !== undefined) {
    const desativados: string[] = body.desativados ?? []
    // Remove all existing exclusion records for this roleta
    await prisma.roletaCorretor.deleteMany({
      where: { roletaId: params.id, ativo: false },
    })
    // Upsert exclusion records for newly desativados
    if (desativados.length > 0) {
      await Promise.all(
        desativados.map((corretorId) =>
          prisma.roletaCorretor.upsert({
            where: { roletaId_corretorId: { roletaId: params.id, corretorId } },
            create: { roletaId: params.id, corretorId, ativo: false },
            update: { ativo: false },
          })
        )
      )
    }
  }

  return NextResponse.json(roleta)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminOrGestor())) return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  await prisma.roleta.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
