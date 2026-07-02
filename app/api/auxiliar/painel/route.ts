import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCicloAtivo, hojeStringBRT, getTempoAtual } from '@/lib/horarios'

export async function GET() {
  const session = await getSession()
  const role = (session?.user as any)?.role
  if (!['admin', 'auxiliar'].includes(role)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const agora = await getTempoAtual()
  const ciclo = getCicloAtivo(agora)
  const data = hojeStringBRT()
  const dataDate = new Date(data + 'T00:00:00')

  const roletas = await prisma.roleta.findMany({
    include: {
      gerencia: true,
      filaEntradas: {
        where: ciclo ? { data: dataDate, ciclo } : { id: 'none' },
        orderBy: { posicao: 'asc' },
        include: { corretor: { include: { user: true } } },
      },
    },
    orderBy: { nome: 'asc' },
  })

  const presencasHoje = await prisma.presencaDiaria.findMany({
    where: { data: dataDate },
    include: { corretor: { include: { user: true, gerencia: true } } },
    orderBy: { entradaMarcadaEm: 'asc' },
  })

  return NextResponse.json({
    cicloAtivo: ciclo,
    data,
    horaAtual: agora.toISOString(),
    roletas: roletas.map((r: any) => ({
      id: r.id,
      nome: r.nome,
      tipo: r.tipo,
      gerencia: r.gerencia?.nome ?? null,
      fila: r.filaEntradas.map((f: any) => ({
        posicao: f.posicao,
        corretorId: f.corretorId,
        nome: f.corretor.user.nome,
        recebeuLeadEm: f.recebeuLeadEm,
      })),
    })),
    presencas: presencasHoje.map((p: any) => ({
      id: p.id,
      corretorId: p.corretorId,
      nome: p.corretor.user.nome,
      gerencia: p.corretor.gerencia.nome,
      ciclo: p.ciclo,
      status: p.status,
      entradaMarcadaEm: p.entradaMarcadaEm,
      manterOnlineMarcadoEm: p.manterOnlineMarcadoEm,
      local: p.localNoMomento,
    })),
  })
}
