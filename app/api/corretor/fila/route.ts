import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCicloAtivo, hojeStringBRT, isJanelaManterOnlineManha, isJanelaManterOnlineTarde, isJanelaEntradaManha, isJanelaEntradaTarde, agoraBRT } from '@/lib/horarios'

export async function GET() {
  const session = await getSession()
  if ((session?.user as any)?.role !== 'corretor') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const userId = (session?.user as any)?.id
  const corretor = await prisma.corretor.findUnique({ where: { userId } })
  if (!corretor) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

  const ciclo = getCicloAtivo()
  const agora = agoraBRT()

  const data = hojeStringBRT()
  const dataDate = new Date(data + 'T00:00:00')

  if (!ciclo) {
    return NextResponse.json({
      cicloAtivo: null,
      posicoes: [],
      janelas: {
        entradaManha: isJanelaEntradaManha(agora),
        entradaTarde: isJanelaEntradaTarde(agora),
        manterOnlineManha: isJanelaManterOnlineManha(agora),
        manterOnlineTarde: isJanelaManterOnlineTarde(agora),
      },
    })
  }

  // Busca posição em todas as roletas em que o corretor aparece
  const posicoes = await prisma.filaRoleta.findMany({
    where: { corretorId: corretor.id, data: dataDate, ciclo },
    include: { roleta: true },
    orderBy: { posicao: 'asc' },
  })

  const totalPorRoleta = await Promise.all(
    posicoes.map(async (p: any) => {
      const total = await prisma.filaRoleta.count({
        where: { roletaId: p.roletaId, data: dataDate, ciclo },
      })
      return { ...p, total }
    }),
  )

  return NextResponse.json({
    cicloAtivo: ciclo,
    posicoes: totalPorRoleta.map((p: any) => ({
      roleta: p.roleta.nome,
      tipo: p.roleta.tipo,
      posicao: p.posicao,
      totalNaFila: p.total,
    })),
    janelas: {
      entradaManha: isJanelaEntradaManha(agora),
      entradaTarde: isJanelaEntradaTarde(agora),
      manterOnlineManha: isJanelaManterOnlineManha(agora),
      manterOnlineTarde: isJanelaManterOnlineTarde(agora),
    },
  })
}
