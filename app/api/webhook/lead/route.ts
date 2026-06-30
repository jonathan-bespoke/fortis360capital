import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { distribuirLead } from '@/services/roleta'
import { z } from 'zod'

const bodySchema = z.object({
  campanha: z.string().min(1),
  lead: z.object({
    nome: z.string().optional(),
    telefone: z.string().optional(),
    email: z.string().optional(),
  }),
})

export async function POST(req: NextRequest) {
  if (!verifyApiKey(req)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ erro: 'Payload inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Campanha não informada ou não cadastrada' }, { status: 422 })
  }

  const { campanha: nomeCampanha, lead } = parsed.data

  const campanha = await prisma.campanha.findUnique({
    where: { nome: nomeCampanha, ativa: true },
    include: { roleta: true },
  })

  if (!campanha) {
    return NextResponse.json({ erro: 'Campanha não informada ou não cadastrada' }, { status: 422 })
  }

  try {
    const nomeCorretor = await distribuirLead({
      campanhaId: campanha.id,
      roletaId: campanha.roletaId,
      nomeLead: lead.nome,
      telefoneLead: lead.telefone,
      emailLead: lead.email,
    })

    return NextResponse.json({ corretor: nomeCorretor })
  } catch (err) {
    console.error('[webhook/lead]', err)
    return NextResponse.json({ erro: 'Erro interno ao distribuir lead' }, { status: 500 })
  }
}
