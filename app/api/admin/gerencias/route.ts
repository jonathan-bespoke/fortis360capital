import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

async function requireAdmin() {
  const session = await getSession()
  return (session?.user as any)?.role === 'admin' ? session : null
}

export async function GET() {
  const session = await getSession()
  const role = (session?.user as any)?.role
  if (!['admin', 'gestor_trafego'].includes(role)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const gerencias = await prisma.gerencia.findMany({ orderBy: { nome: 'asc' } })
  return NextResponse.json(gerencias)
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const { nome } = await req.json()
  if (!nome?.trim()) return NextResponse.json({ erro: 'Nome obrigatório' }, { status: 400 })

  const g = await prisma.gerencia.create({ data: { nome: nome.trim() } })
  return NextResponse.json(g, { status: 201 })
}
