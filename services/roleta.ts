import { prisma } from '@/lib/prisma'
import { getCicloAtivo, hojeStringBRT, CicloFila, getTempoAtual } from '@/lib/horarios'

// Retorna os corretores online no ciclo atual para uma roleta
export async function getCorretoresOnlineParaRoleta(
  roletaId: string,
  ciclo: CicloFila,
  data: string, // YYYY-MM-DD
): Promise<string[]> {
  const roleta = await prisma.roleta.findUniqueOrThrow({
    where: { id: roletaId },
  })

  const cicloPresenca = ciclo === 'c10_12' || ciclo === 'c12_15' ? 'manha_10_12' : 'tarde_15_19'

  if (roleta.tipo === 'diretoria') {
    const presencas = await prisma.presencaDiaria.findMany({
      where: {
        data: new Date(data + 'T00:00:00'),
        ciclo: cicloPresenca,
        status: 'online',
      },
      orderBy: { entradaMarcadaEm: 'asc' },
      select: { corretorId: true },
    })
    return presencas.map((p: { corretorId: string }) => p.corretorId)
  }

  if (roleta.tipo === 'gerencia') {
    const corretoresDaGerencia = await prisma.corretor.findMany({
      where: { gerenciaId: roleta.gerenciaId! },
      select: { id: true },
    })
    const ids = corretoresDaGerencia.map((c: { id: string }) => c.id)

    const presencas = await prisma.presencaDiaria.findMany({
      where: {
        corretorId: { in: ids },
        data: new Date(data + 'T00:00:00'),
        ciclo: cicloPresenca,
        status: 'online',
      },
      orderBy: { entradaMarcadaEm: 'asc' },
      select: { corretorId: true },
    })
    return presencas.map((p: { corretorId: string }) => p.corretorId)
  }

  // Individual
  const membros = await prisma.roletaCorretor.findMany({
    where: { roletaId },
    select: { corretorId: true },
  })
  const ids = membros.map((m: { corretorId: string }) => m.corretorId)

  const presencas = await prisma.presencaDiaria.findMany({
    where: {
      corretorId: { in: ids },
      data: new Date(data + 'T00:00:00'),
      ciclo: cicloPresenca,
      status: 'online',
    },
    orderBy: { entradaMarcadaEm: 'asc' },
    select: { corretorId: true },
  })
  return presencas.map((p: { corretorId: string }) => p.corretorId)
}

export async function construirFilaRoleta(
  roletaId: string,
  ciclo: CicloFila,
  data: string,
): Promise<void> {
  const corretores = await getCorretoresOnlineParaRoleta(roletaId, ciclo, data)
  const dataDate = new Date(data + 'T00:00:00')

  await prisma.$transaction(async (tx) => {
    await tx.filaRoleta.deleteMany({ where: { roletaId, data: dataDate, ciclo } })
    for (let i = 0; i < corretores.length; i++) {
      await tx.filaRoleta.create({
        data: { roletaId, data: dataDate, ciclo, posicao: i + 1, corretorId: corretores[i] },
      })
    }
  })
}

export async function construirTodasAsFilas(ciclo: CicloFila): Promise<void> {
  const data = hojeStringBRT()
  const roletas = await prisma.roleta.findMany({ select: { id: true } })
  await Promise.all(roletas.map((r: { id: string }) => construirFilaRoleta(r.id, ciclo, data)))
}

export async function distribuirLead(params: {
  campanhaId: string
  roletaId: string
  nomeLead?: string
  telefoneLead?: string
  emailLead?: string
}): Promise<string> {
  const agora = await getTempoAtual()
  const ciclo = getCicloAtivo(agora)
  const data = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
  const dataDate = new Date(data + 'T00:00:00')

  const roleta = await prisma.roleta.findUniqueOrThrow({ where: { id: params.roletaId } })

  if (roleta.tipo === 'individual' && !ciclo) {
    const corretores = await getCorretoresOnlineParaRoleta(params.roletaId, 'c10_12', data)
    const emailCorretor = corretores.length > 0
      ? await getEmailCorretor(corretores[0])
      : 'Nenhum Corretor Online'
    await registrarLead(params, null, corretores[0] ?? null, emailCorretor, null)
    return emailCorretor
  }

  if (!ciclo) {
    await registrarLead(params, null, null, 'Nenhum Corretor Online', null)
    return 'Nenhum Corretor Online'
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const primeiros = await tx.$queryRaw<{ id: string; corretorId: string; posicao: number }[]>`
      SELECT id, "corretorId", posicao
      FROM fila_roletas
      WHERE "roletaId" = ${params.roletaId}
        AND data = ${dataDate}
        AND ciclo = ${ciclo}::"CicloFila"
      ORDER BY posicao ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `

    if (primeiros.length === 0) {
      return { corretorId: null as string | null, email: 'Nenhum Corretor Online' }
    }

    const primeiro = primeiros[0]

    const [totalRow] = await tx.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int as count
      FROM fila_roletas
      WHERE "roletaId" = ${params.roletaId}
        AND data = ${dataDate}
        AND ciclo = ${ciclo}::"CicloFila"
    `

    await tx.filaRoleta.update({
      where: { id: primeiro.id },
      data: { posicao: (totalRow?.count ?? 1) + 1, recebeuLeadEm: new Date() },
    })

    await tx.$executeRaw`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY posicao ASC) AS nova_pos
        FROM fila_roletas
        WHERE "roletaId" = ${params.roletaId}
          AND data = ${dataDate}
          AND ciclo = ${ciclo}::"CicloFila"
      )
      UPDATE fila_roletas f
      SET posicao = r.nova_pos
      FROM ranked r
      WHERE f.id = r.id
    `

    const user = await tx.user.findFirst({
      where: { corretor: { id: primeiro.corretorId } },
      select: { email: true },
    })

    return { corretorId: primeiro.corretorId as string | null, email: user?.email ?? 'Nenhum Corretor Online' }
  })

  await registrarLead(params, ciclo, resultado.corretorId, resultado.email, ciclo)
  return resultado.email
}

async function getEmailCorretor(corretorId: string): Promise<string> {
  const user = await prisma.user.findFirst({
    where: { corretor: { id: corretorId } },
    select: { email: true },
  })
  return user?.email ?? 'Nenhum Corretor Online'
}

async function registrarLead(
  params: { campanhaId: string; roletaId: string; nomeLead?: string; telefoneLead?: string; emailLead?: string },
  _cicloFila: CicloFila | null | undefined,
  corretorId: string | null,
  resposta: string,
  ciclo: CicloFila | null | undefined,
) {
  await prisma.leadRecebido.create({
    data: {
      campanhaId: params.campanhaId,
      roletaId: params.roletaId,
      corretorDesignadoId: corretorId ?? undefined,
      nomeLead: params.nomeLead,
      telefoneLead: params.telefoneLead,
      emailLead: params.emailLead,
      respostaEnviada: resposta,
      cicloAtivo: ciclo ?? undefined,
    },
  })
}

export async function aplicarCorteManterOnline(tipo: 'manha' | 'tarde'): Promise<void> {
  const data = hojeStringBRT()
  const dataDate = new Date(data + 'T00:00:00')
  const ciclo = tipo === 'manha' ? 'manha_10_12' : 'tarde_15_19'

  await prisma.presencaDiaria.updateMany({
    where: { data: dataDate, ciclo, status: 'online', manterOnlineMarcadoEm: null },
    data: { status: 'removido_corte' },
  })
}

export async function aplicarCorteGeral(): Promise<void> {
  const data = hojeStringBRT()
  const dataDate = new Date(data + 'T00:00:00')

  await prisma.presencaDiaria.updateMany({
    where: { data: dataDate, status: 'online' },
    data: { status: 'removido_corte' },
  })

  await prisma.filaRoleta.deleteMany({ where: { data: dataDate } })
}
