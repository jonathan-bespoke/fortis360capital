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
  const campanha = await prisma.campanha.update({ where: { id: params.id }, data: body })
  return NextResponse.json(campanha)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminOrGestor())) return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  await prisma.campanha.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
