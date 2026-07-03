import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { prisma } from '@/lib/prisma'

export const TZ = 'America/Sao_Paulo'


export type CicloFila = 'c10_12' | 'c12_15' | 'c15_19' | 'c19_22'
export type JanelaOkGeral = 'j10h' | 'j12h' | 'j15h' | 'j19h'

export function agoraBRT(): Date {
  if (process.env.FAKE_NOW) {
    return toZonedTime(new Date(process.env.FAKE_NOW), TZ)
  }
  return toZonedTime(new Date(), TZ)
}

// Versão async que lê o fake_now do banco (usar nas API routes)
export async function getTempoAtual(): Promise<Date> {
  try {
    const cfg = await prisma.configSistema.findUnique({ where: { chave: 'fake_now' } })
    if (cfg?.valor) {
      // valor salvo como string BRT ("2026-07-02T09:14:00"); converte BRT→UTC→zonedDate
      return toZonedTime(fromZonedTime(cfg.valor, TZ), TZ)
    }
  } catch {
    // fallback silencioso
  }
  return agoraBRT()
}

export function hojeBRT(): Date {
  const agora = agoraBRT()
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
}

export function hojeStringBRT(): string {
  const d = agoraBRT()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Versão que usa a data de um agora já carregado (respeita fake_now do DB)
export function dataStringDe(agora: Date): string {
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
}

export function dateParaUTC(dataBRT: Date): Date {
  return fromZonedTime(dataBRT, TZ)
}

function hhmm(h: number, m: number, base: Date): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0)
}

export function getCicloAtivo(agora?: Date): CicloFila | null {
  const now = agora ?? agoraBRT()
  const h = now.getHours()
  const m = now.getMinutes()
  const min = h * 60 + m

  if (min >= 10 * 60 && min < 12 * 60) return 'c10_12'
  if (min >= 12 * 60 && min < 15 * 60) return 'c12_15'
  if (min >= 15 * 60 && min < 19 * 60) return 'c15_19'
  if (min >= 19 * 60 && min < 22 * 60) return 'c19_22'
  return null
}

export function isJanelaEntradaManha(agora?: Date): boolean {
  const now = agora ?? agoraBRT()
  const min = now.getHours() * 60 + now.getMinutes()
  return min >= 8 * 60 + 45 && min < 9 * 60 + 45
}

export function isJanelaEntradaTarde(agora?: Date): boolean {
  const now = agora ?? agoraBRT()
  const min = now.getHours() * 60 + now.getMinutes()
  return min >= 13 * 60 + 45 && min < 14 * 60 + 45
}

export function isJanelaManterOnlineManha(agora?: Date): boolean {
  const now = agora ?? agoraBRT()
  const min = now.getHours() * 60 + now.getMinutes()
  return min >= 11 * 60 && min < 12 * 60
}

export function isJanelaManterOnlineTarde(agora?: Date): boolean {
  const now = agora ?? agoraBRT()
  const min = now.getHours() * 60 + now.getMinutes()
  return min >= 18 * 60 && min < 19 * 60
}

export function getJanelaOkGeralAtiva(agora?: Date): JanelaOkGeral | null {
  const now = agora ?? agoraBRT()
  const min = now.getHours() * 60 + now.getMinutes()
  // 15 min antes de cada ciclo: auxiliar confere quem está online antes da roleta iniciar
  if (min >= 9 * 60 + 45 && min < 10 * 60) return 'j10h'
  if (min >= 11 * 60 + 45 && min < 12 * 60) return 'j12h'
  if (min >= 14 * 60 + 45 && min < 15 * 60) return 'j15h'
  if (min >= 18 * 60 + 45 && min < 19 * 60) return 'j19h'
  return null
}

export function cicloParaJanela(ciclo: CicloFila): JanelaOkGeral {
  const map: Record<CicloFila, JanelaOkGeral> = {
    c10_12: 'j10h',
    c12_15: 'j12h',
    c15_19: 'j15h',
    c19_22: 'j19h',
  }
  return map[ciclo]
}

// Notificações de abertura de janela (v2 hook — não implementado)
export async function notifyWindowOpened(
  evento: string,
  corretores: string[],
): Promise<void> {
  // TODO v2: disparar webhook/push/email para corretores
  console.log(`[notify] Evento: ${evento}, Corretores: ${corretores.join(', ')}`)
}
