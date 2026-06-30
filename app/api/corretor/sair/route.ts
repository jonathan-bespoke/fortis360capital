import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCicloAtivo, hojeStringBRT } from '@/lib/horarios'

export async function POST() {
  const session = await getSession()
  if ((session?.user as any)?.role !== 'corretor') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const userId = (session?.user as any)?.id
  const corretor = await prisma.corretor.findUnique({ where: { userId } })
  if (!corretor) return NextResponse.json({ erro: 'Corretor não encontrado' }, { status: 404 })

  const data = hojeStringBRT()
  const dataDate = new Date(data + 'T00:00:00')
  const ciclo = getCicloAtivo()

  await prisma.presencaDiaria.updateMany({
    where: {
      corretorId: corretor.id,
      data: dataDate,
      status: 'online',
    },
    data: { status: 'offline_manual' },
  })

  // Remove da fila ativa
  if (ciclo) {
    await prisma.filaRoleta.deleteMany({
      where: { corretorId: corretor.id, data: dataDate, ciclo },
    })
  }

  return NextResponse.json({ ok: true })
}
