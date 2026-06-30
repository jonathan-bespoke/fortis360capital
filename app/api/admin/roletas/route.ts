import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  nome: z.string().min(1),
  tipo: z.enum(['diretoria', 'gerencia', 'individual']),
  gerenciaId: z.string().optional().nullable(),
  corretorIds: z.array(z.string()).optional(),
})

async function requireAdminOrGestor() {
  const session = await getSession()
  const role = (session?.user as any)?.role
  return ['admin', 'gestor_trafego'].includes(role) ? session : null
}

export async function GET() {
  const session = await getSession()
  const role = (session?.user as any)?.role
  if (!['admin', 'gestor_trafego', 'auxiliar'].includes(role)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const roletas = await prisma.roleta.findMany({
    include: {
      gerencia: true,
      roletaCorretores: { include: { corretor: { include: { user: true } } } },
    },
    orderBy: { nome: 'asc' },
  })

  return NextResponse.json(roletas)
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminOrGestor())) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 })

  const { nome, tipo, gerenciaId, corretorIds } = parsed.data

  const roleta = await prisma.roleta.create({
    data: {
      nome,
      tipo: tipo as any,
      gerenciaId: tipo === 'gerencia' ? gerenciaId ?? null : null,
      ...(tipo === 'individual' && corretorIds?.length
        ? {
            roletaCorretores: {
              create: corretorIds.map((id) => ({ corretorId: id })),
            },
          }
        : {}),
    },
    include: { roletaCorretores: true },
  })

  return NextResponse.json(roleta, { status: 201 })
}
