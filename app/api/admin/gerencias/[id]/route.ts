import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getSession()
  return (session?.user as any)?.role === 'admin' ? session : null
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  const { nome } = await req.json()
  const g = await prisma.gerencia.update({ where: { id: params.id }, data: { nome } })
  return NextResponse.json(g)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  await prisma.gerencia.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
