import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isJanelaEntradaManha, isJanelaEntradaTarde, hojeStringBRT, dataStringDe, getTempoAtual } from '@/lib/horarios'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if ((session?.user as any)?.role !== 'corretor') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const userId = (session?.user as any)?.id
  const { local } = await req.json()

  const agora = await getTempoAtual()
  const isManha = isJanelaEntradaManha(agora)
  const isTarde = isJanelaEntradaTarde(agora)

  if (!isManha && !isTarde) {
    return NextResponse.json({ erro: 'Fora da janela de entrada' }, { status: 400 })
  }

  const ciclo = isManha ? 'manha_10_12' : 'tarde_15_19'

  const corretor = await prisma.corretor.findUnique({ where: { userId } })
  if (!corretor) return NextResponse.json({ erro: 'Corretor não encontrado' }, { status: 404 })

  const data = dataStringDe(agora)
  const dataDate = new Date(data + 'T00:00:00')

  if (local) {
    await prisma.corretor.update({ where: { id: corretor.id }, data: { localAtual: local } })
  }

  const presenca = await prisma.presencaDiaria.upsert({
    where: { corretorId_data_ciclo: { corretorId: corretor.id, data: dataDate, ciclo } },
    create: {
      corretorId: corretor.id,
      data: dataDate,
      ciclo,
      entradaMarcadaEm: new Date(),
      status: 'online',
      localNoMomento: local ?? corretor.localAtual,
    },
    update: { status: 'online' },
  })

  return NextResponse.json({ ok: true, presencaId: presenca.id, ciclo })
}

export async function GET() {
  const session = await getSession()
  if ((session?.user as any)?.role !== 'corretor') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const userId = (session?.user as any)?.id
  const corretor = await prisma.corretor.findUnique({
    where: { userId },
    include: { user: true, gerencia: true },
  })
  if (!corretor) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

  const agora = await getTempoAtual()
  const data = dataStringDe(agora)
  const dataDate = new Date(data + 'T00:00:00')

  const presencas = await prisma.presencaDiaria.findMany({
    where: { corretorId: corretor.id, data: dataDate },
  })

  return NextResponse.json({
    corretor: {
      id: corretor.id,
      nome: corretor.user.nome,
      gerencia: corretor.gerencia.nome,
      localAtual: corretor.localAtual,
    },
    presencas,
    janelas: {
      entradaManha: isJanelaEntradaManha(agora),
      entradaTarde: isJanelaEntradaTarde(agora),
    },
    horaAtual: agora.toISOString(),
  })
}
