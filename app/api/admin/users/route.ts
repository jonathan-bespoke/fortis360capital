import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getCicloAtivo, dataStringDe, getTempoAtual } from '@/lib/horarios'

const createSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6),
  role: z.enum(['admin', 'gestor_trafego', 'auxiliar', 'corretor']),
  gerenciaId: z.string().optional(),
})

export async function GET() {
  const session = await getSession()
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const agora = await getTempoAtual()
  const ciclo = getCicloAtivo(agora)
  const data = dataStringDe(agora)
  const dataDate = new Date(data + 'T00:00:00')

  // Ciclo de presença correspondente
  const cicloPresenca = ciclo === 'c10_12' || ciclo === 'c12_15' ? 'manha_10_12' : 'tarde_15_19'

  const [users, presencasOnline] = await Promise.all([
    prisma.user.findMany({
      include: { corretor: { include: { gerencia: true } } },
      orderBy: { nome: 'asc' },
    }),
    ciclo
      ? prisma.presencaDiaria.findMany({
          where: { data: dataDate, ciclo: cicloPresenca, status: 'online' },
          select: { corretorId: true },
        })
      : Promise.resolve([]),
  ])

  const onlineIds = new Set((presencasOnline as { corretorId: string }[]).map((p) => p.corretorId))

  return NextResponse.json(users.map((u: any) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    role: u.role,
    ativo: u.ativo,
    senhaTrocada: u.senhaTrocadaNoPrimeiroAcesso,
    gerencia: u.corretor?.gerencia?.nome ?? null,
    gerenciaId: u.corretor?.gerenciaId ?? null,
    corretorId: u.corretor?.id ?? null,
    online: u.corretor ? onlineIds.has(u.corretor.id) : false,
  })))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 400 })
  }

  const { nome, email, senha, role, gerenciaId } = parsed.data

  if (role === 'corretor' && !gerenciaId) {
    return NextResponse.json({ erro: 'Corretor precisa de uma gerência' }, { status: 400 })
  }

  const senhaHash = await bcrypt.hash(senha, 12)

  try {
    const user = await prisma.user.create({
      data: {
        nome,
        email,
        senhaHash,
        role: role as any,
        senhaTrocadaNoPrimeiroAcesso: false,
        ...(role === 'corretor'
          ? { corretor: { create: { gerenciaId: gerenciaId! } } }
          : {}),
      },
      include: { corretor: true },
    })

    return NextResponse.json({ id: user.id, nome: user.nome, email: user.email }, { status: 201 })
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ erro: 'Email já cadastrado' }, { status: 409 })
    }
    throw err
  }
}
