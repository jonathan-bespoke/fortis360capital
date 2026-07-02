import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCicloAtivo, hojeStringBRT, getTempoAtual } from '@/lib/horarios'

export async function POST(req: NextRequest) {
  const session = await getSession()
  const role = (session?.user as any)?.role
  if (!['admin', 'auxiliar'].includes(role)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const { corretorId } = await req.json()
  if (!corretorId) return NextResponse.json({ erro: 'corretorId obrigatório' }, { status: 400 })

  const agora = await getTempoAtual()
  const data = hojeStringBRT()
  const dataDate = new Date(data + 'T00:00:00')
  const ciclo = getCicloAtivo(agora)

  await prisma.presencaDiaria.updateMany({
    where: { corretorId, data: dataDate, status: 'online' },
    data: {
      status: 'removido_manual',
      removidoPorId: (session?.user as any)?.id,
    },
  })

  if (ciclo) {
    await prisma.filaRoleta.deleteMany({ where: { corretorId, data: dataDate, ciclo } })
  }

  return NextResponse.json({ ok: true })
}
