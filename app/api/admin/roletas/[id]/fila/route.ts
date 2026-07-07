import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCicloAtivo, dataStringDe, getTempoAtual } from '@/lib/horarios'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  const role = (session?.user as any)?.role
  if (!['admin', 'gestor_trafego', 'auxiliar'].includes(role)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const agora = await getTempoAtual()
  const ciclo = getCicloAtivo(agora)
  const data = dataStringDe(agora)
  const dataDate = new Date(data + 'T00:00:00')

  if (!ciclo) {
    return NextResponse.json({ cicloAtivo: null, fila: [] })
  }

  const fila = await prisma.filaRoleta.findMany({
    where: { roletaId: params.id, data: dataDate, ciclo },
    include: { corretor: { include: { user: true, gerencia: true } } },
    orderBy: { posicao: 'asc' },
  })

  return NextResponse.json({
    cicloAtivo: ciclo,
    data,
    fila: fila.map((f) => ({
      posicao: f.posicao,
      corretorId: f.corretorId,
      nome: (f.corretor as any).user.nome,
      gerencia: (f.corretor as any).gerencia.nome,
      recebeuLeadEm: f.recebeuLeadEm,
    })),
  })
}
