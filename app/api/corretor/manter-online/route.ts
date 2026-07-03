import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isJanelaManterOnlineManha, isJanelaManterOnlineTarde, dataStringDe, getTempoAtual } from '@/lib/horarios'

export async function POST() {
  const session = await getSession()
  if ((session?.user as any)?.role !== 'corretor') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const userId = (session?.user as any)?.id
  const agora = await getTempoAtual()
  const isManha = isJanelaManterOnlineManha(agora)
  const isTarde = isJanelaManterOnlineTarde(agora)

  if (!isManha && !isTarde) {
    return NextResponse.json({ erro: 'Fora da janela de manter-online' }, { status: 400 })
  }

  const ciclo = isManha ? 'manha_10_12' : 'tarde_15_19'
  const corretor = await prisma.corretor.findUnique({ where: { userId } })
  if (!corretor) return NextResponse.json({ erro: 'Corretor não encontrado' }, { status: 404 })

  const data = dataStringDe(agora)
  const dataDate = new Date(data + 'T00:00:00')

  const presenca = await prisma.presencaDiaria.findUnique({
    where: { corretorId_data_ciclo: { corretorId: corretor.id, data: dataDate, ciclo } },
  })

  if (!presenca || presenca.status !== 'online') {
    return NextResponse.json({ erro: 'Corretor não está online neste ciclo' }, { status: 400 })
  }

  await prisma.presencaDiaria.update({
    where: { id: presenca.id },
    data: { manterOnlineMarcadoEm: new Date() },
  })

  return NextResponse.json({ ok: true })
}
