import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  nome: z.string().min(1),
  tipoHierarquia: z.enum(['diretoria', 'gerencia', 'individual']),
  gerenciaId: z.string().optional().nullable(),
  roletaId: z.string(),
  ativa: z.boolean().optional(),
})

async function requireAdminOrGestor() {
  const session = await getSession()
  const role = (session?.user as any)?.role
  return ['admin', 'gestor_trafego'].includes(role) ? session : null
}

export async function GET() {
  if (!(await requireAdminOrGestor())) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const campanhas = await prisma.campanha.findMany({
    include: { gerencia: true, roleta: true },
    orderBy: { nome: 'asc' },
  })
  return NextResponse.json(campanhas)
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminOrGestor())) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 400 })

  const { nome, tipoHierarquia, gerenciaId, roletaId, ativa } = parsed.data

  try {
    const campanha = await prisma.campanha.create({
      data: {
        nome,
        tipoHierarquia: tipoHierarquia as any,
        gerenciaId: tipoHierarquia === 'gerencia' ? gerenciaId ?? null : null,
        roletaId,
        ativa: ativa ?? true,
      },
      include: { gerencia: true, roleta: true },
    })
    return NextResponse.json(campanha, { status: 201 })
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ erro: 'Nome de campanha já cadastrado' }, { status: 409 })
    }
    throw err
  }
}
