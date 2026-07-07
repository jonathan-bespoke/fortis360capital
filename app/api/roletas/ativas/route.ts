import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCicloAtivo, dataStringDe, getTempoAtual } from '@/lib/horarios'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const agora = await getTempoAtual()
  const ciclo = getCicloAtivo(agora)
  const data = dataStringDe(agora)
  const dataDate = new Date(data + 'T00:00:00')

  const roletas = await prisma.roleta.findMany({
    include: { gerencia: true },
    orderBy: { nome: 'asc' },
  })

  if (!ciclo) {
    return NextResponse.json({ cicloAtivo: null, data, roletas: roletas.map((r) => ({ id: r.id, nome: r.nome, tipo: r.tipo, gerencia: r.gerencia, fila: [] })) })
  }

  const filas = await prisma.filaRoleta.findMany({
    where: { data: dataDate, ciclo },
    include: { corretor: { include: { user: true, gerencia: true } } },
    orderBy: { posicao: 'asc' },
  })

  const filasPorRoleta = new Map<string, typeof filas>()
  for (const f of filas) {
    const arr = filasPorRoleta.get(f.roletaId) ?? []
    arr.push(f)
    filasPorRoleta.set(f.roletaId, arr)
  }

  return NextResponse.json({
    cicloAtivo: ciclo,
    data,
    roletas: roletas.map((r) => ({
      id: r.id,
      nome: r.nome,
      tipo: r.tipo,
      gerencia: r.gerencia,
      fila: (filasPorRoleta.get(r.id) ?? []).map((f) => ({
        posicao: f.posicao,
        corretorId: f.corretorId,
        nome: (f.corretor as any).user.nome,
        gerencia: (f.corretor as any).gerencia.nome,
        recebeuLeadEm: f.recebeuLeadEm,
      })),
    })),
  })
}
