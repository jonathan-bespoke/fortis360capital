import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getCicloAtivo,
  hojeStringBRT,
  isJanelaManterOnlineManha,
  isJanelaManterOnlineTarde,
  isJanelaEntradaManha,
  isJanelaEntradaTarde,
  getTempoAtual,
} from '@/lib/horarios'

export async function GET() {
  const session = await getSession()
  if ((session?.user as any)?.role !== 'corretor') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const userId = (session?.user as any)?.id
  const corretor = await prisma.corretor.findUnique({ where: { userId } })
  if (!corretor) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

  const agora = await getTempoAtual()
  const ciclo = getCicloAtivo(agora)

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

  // Roletas onde o corretor tem posição no ciclo atual
  const minhasEntradas = await prisma.filaRoleta.findMany({
    where: { corretorId: corretor.id, data: dataDate, ciclo },
    include: { roleta: { include: { gerencia: true } } },
  })

  const roletaIds = minhasEntradas.map((e: any) => e.roletaId)

  // Fila completa de cada roleta onde o corretor está presente
  const filasCompletas = await Promise.all(
    roletaIds.map(async (roletaId: string) => {
      const entrada = minhasEntradas.find((e: any) => e.roletaId === roletaId)!
      const fila = await prisma.filaRoleta.findMany({
        where: { roletaId, data: dataDate, ciclo },
        include: { corretor: { include: { user: true } } },
        orderBy: { posicao: 'asc' },
      })
      return {
        roletaId,
        nome: entrada.roleta.nome,
        tipo: entrada.roleta.tipo,
        gerencia: (entrada.roleta as any).gerencia?.nome ?? null,
        minhaPosicao: entrada.posicao,
        fila: fila.map((f: any) => ({
          posicao: f.posicao,
          corretorId: f.corretorId,
          nome: f.corretor.user.nome,
          souEu: f.corretorId === corretor.id,
          recebeuLeadEm: f.recebeuLeadEm,
        })),
      }
    }),
  )

  // Hierarquia: diretoria → gerencia → individual
  const ordemTipo: Record<string, number> = { diretoria: 0, gerencia: 1, individual: 2 }
  filasCompletas.sort((a, b) => (ordemTipo[a.tipo] ?? 9) - (ordemTipo[b.tipo] ?? 9))

  return NextResponse.json({
    cicloAtivo: ciclo,
    filas: filasCompletas,
    janelas: {
      entradaManha: isJanelaEntradaManha(agora),
      entradaTarde: isJanelaEntradaTarde(agora),
      manterOnlineManha: isJanelaManterOnlineManha(agora),
      manterOnlineTarde: isJanelaManterOnlineTarde(agora),
    },
  })
}
