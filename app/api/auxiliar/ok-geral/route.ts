import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { construirTodasAsFilas } from '@/services/roleta'
import { getJanelaOkGeralAtiva, getCicloAtivo, hojeStringBRT, CicloFila, getTempoAtual } from '@/lib/horarios'

const CICLO_JANELA: Record<string, string> = { c10_12: 'j10h', c12_15: 'j12h', c15_19: 'j15h', c19_22: 'j19h' }

export async function POST(req: NextRequest) {
  const session = await getSession()
  const role = (session?.user as any)?.role
  if (!['admin', 'auxiliar'].includes(role)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const { janela } = await req.json()
  const agora = await getTempoAtual()
  const janelaPreWindow = getJanelaOkGeralAtiva(agora)
  const cicloAtivo = getCicloAtivo(agora)
  // Aceita: janela na janela de 15 min pré-ciclo OU janela correspondente ao ciclo em curso (confirmação tardia)
  const janelaPermitida = janelaPreWindow ?? (cicloAtivo ? CICLO_JANELA[cicloAtivo] : null)

  if (!janelaPermitida || janelaPermitida !== janela) {
    return NextResponse.json({ erro: 'Nenhum ciclo ativo para este ok geral' }, { status: 400 })
  }

  const data = hojeStringBRT()
  const dataDate = new Date(data + 'T00:00:00')

  const jaConfirmado = await prisma.okGeral.findUnique({
    where: { data_janela: { data: dataDate, janela: janela as any } },
  })

  if (jaConfirmado) {
    return NextResponse.json({ erro: 'Ok geral já foi dado para esta janela' }, { status: 409 })
  }

  const cicloMap: Record<string, CicloFila> = {
    j10h: 'c10_12',
    j12h: 'c12_15',
    j15h: 'c15_19',
    j19h: 'c19_22',
  }

  await construirTodasAsFilas(cicloMap[janela])

  await prisma.okGeral.create({
    data: {
      data: dataDate,
      janela: janela as any,
      confirmadoPorId: (session?.user as any)?.id,
      confirmadoAutomaticamente: false,
    },
  })

  return NextResponse.json({ ok: true })
}
