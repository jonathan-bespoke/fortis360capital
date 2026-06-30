import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { aplicarCorteManterOnline, aplicarCorteGeral, construirTodasAsFilas } from '@/services/roleta'
import { hojeStringBRT, notifyWindowOpened, CicloFila } from '@/lib/horarios'

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const janela = req.nextUrl.searchParams.get('janela')
  const data = hojeStringBRT()
  const dataDate = new Date(data + 'T00:00:00')

  try {
    if (janela === '22h') {
      await aplicarCorteGeral()
      return NextResponse.json({ ok: true, acao: 'corte_geral' })
    }

    type JanelaCfg = { corte: 'manha' | 'tarde' | null; ciclo: CicloFila; okJanela: string }
    const janelaMap: Record<string, JanelaCfg> = {
      '10h': { corte: null, ciclo: 'c10_12', okJanela: 'j10h' },
      '12h': { corte: 'manha', ciclo: 'c12_15', okJanela: 'j12h' },
      '15h': { corte: null, ciclo: 'c15_19', okJanela: 'j15h' },
      '19h': { corte: 'tarde', ciclo: 'c19_22', okJanela: 'j19h' },
    }

    const cfg = janela ? janelaMap[janela] : null
    if (!cfg) {
      return NextResponse.json({ erro: 'Janela inválida' }, { status: 400 })
    }

    if (cfg.corte) {
      await aplicarCorteManterOnline(cfg.corte)
    }

    const okExistente = await prisma.okGeral.findUnique({
      where: { data_janela: { data: dataDate, janela: cfg.okJanela as any } },
    })

    if (!okExistente) {
      await construirTodasAsFilas(cfg.ciclo)

      await prisma.okGeral.create({
        data: {
          data: dataDate,
          janela: cfg.okJanela as any,
          confirmadoAutomaticamente: true,
        },
      })

      const corretoresOnline = await prisma.presencaDiaria.findMany({
        where: { data: dataDate, status: 'online' },
        include: { corretor: { include: { user: true } } },
      })
      await notifyWindowOpened(
        `ciclo_${cfg.ciclo}`,
        corretoresOnline.map((p: any) => p.corretor.user.nome),
      )
    }

    return NextResponse.json({ ok: true, janela, automatico: !okExistente })
  } catch (err) {
    console.error('[cron/corte]', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
