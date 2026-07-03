import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCicloAtivo, getJanelaOkGeralAtiva, dataStringDe, getTempoAtual } from '@/lib/horarios'

export async function GET() {
  const session = await getSession()
  const role = (session?.user as any)?.role
  if (!['admin', 'auxiliar'].includes(role)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const CICLO_JANELA: Record<string, string> = { c10_12: 'j10h', c12_15: 'j12h', c15_19: 'j15h', c19_22: 'j19h' }

  const agora = await getTempoAtual()
  const ciclo = getCicloAtivo(agora)
  // Mostra botão na janela pré-ciclo (9h45-10h) OU durante o ciclo se ok geral ainda não foi dado
  const janelaPreWindow = getJanelaOkGeralAtiva(agora)
  const data = dataStringDe(agora)
  const dataDate = new Date(data + 'T00:00:00')

  const janelaCicloAtivo = ciclo ? CICLO_JANELA[ciclo] : null
  const janelaCandidata = janelaPreWindow ?? janelaCicloAtivo

  let okGeralJaDado = false
  let janelaOkGeral: string | null = null
  if (janelaCandidata) {
    const ok = await prisma.okGeral.findUnique({
      where: { data_janela: { data: dataDate, janela: janelaCandidata as any } },
    })
    okGeralJaDado = !!ok
    // Só expõe a janela se o ok geral ainda não foi dado
    janelaOkGeral = ok ? null : janelaCandidata
  }

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
    janelaOkGeral,
    okGeralJaDado,
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
