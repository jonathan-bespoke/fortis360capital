import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

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

  const users = await prisma.user.findMany({
    include: { corretor: { include: { gerencia: true } } },
    orderBy: { nome: 'asc' },
  })

  return NextResponse.json(users.map((u: any) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    role: u.role,
    ativo: u.ativo,
    senhaTrocada: u.senhaTrocadaNoPrimeiroAcesso,
    gerencia: u.corretor?.gerencia?.nome ?? null,
    gerenciaId: u.corretor?.gerenciaId ?? null,
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
