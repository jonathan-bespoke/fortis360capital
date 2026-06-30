import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const page = Number(searchParams.get('page') ?? '1')
  const limit = Number(searchParams.get('limit') ?? '50')
  const campanhaId = searchParams.get('campanhaId')
  const dataInicio = searchParams.get('dataInicio')
  const dataFim = searchParams.get('dataFim')

  const where: any = {}
  if (campanhaId) where.campanhaId = campanhaId
  if (dataInicio || dataFim) {
    where.timestamp = {}
    if (dataInicio) where.timestamp.gte = new Date(dataInicio)
    if (dataFim) where.timestamp.lte = new Date(dataFim + 'T23:59:59')
  }

  const [total, leads] = await Promise.all([
    prisma.leadRecebido.count({ where }),
    prisma.leadRecebido.findMany({
      where,
      include: {
        campanha: true,
        roleta: true,
        corretorDesignado: { include: { user: true } },
      },
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return NextResponse.json({
    total,
    page,
    limit,
    dados: leads.map((l: any) => ({
      id: l.id,
      campanha: l.campanha.nome,
      roleta: l.roleta.nome,
      corretor: l.corretorDesignado?.user.nome ?? null,
      nomeLead: l.nomeLead,
      telefoneLead: l.telefoneLead,
      emailLead: l.emailLead,
      resposta: l.respostaEnviada,
      ciclo: l.cicloAtivo,
      timestamp: l.timestamp,
    })),
  })
}
