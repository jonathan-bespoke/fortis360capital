import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const cfg = await prisma.configSistema.findUnique({ where: { chave: 'fake_now' } })
  return NextResponse.json({ fakeNow: cfg?.valor ?? null })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const { fakeNow } = await req.json()

  if (fakeNow) {
    await prisma.configSistema.upsert({
      where: { chave: 'fake_now' },
      update: { valor: fakeNow },
      create: { chave: 'fake_now', valor: fakeNow },
    })
  } else {
    await prisma.configSistema.deleteMany({ where: { chave: 'fake_now' } })
  }

  return NextResponse.json({ ok: true, fakeNow: fakeNow ?? null })
}
