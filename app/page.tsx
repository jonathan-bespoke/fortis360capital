'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'

interface FilaEntry {
  posicao: number
  corretorId: string
  nome: string
  gerencia: string
  recebeuLeadEm: string | null
}

interface RoletaAtiva {
  id: string
  nome: string
  tipo: string
  gerencia: { id: string; nome: string } | null
  fila: FilaEntry[]
}

interface DashData {
  cicloAtivo: string | null
  data: string
  roletas: RoletaAtiva[]
}

const cicloLabel: Record<string, string> = {
  c10_12: '10h–12h',
  c12_15: '12h–15h',
  c15_19: '15h–19h',
  c19_22: '19h–22h',
}

const tipoBadge: Record<string, string> = {
  diretoria: 'badge-yellow',
  gerencia: 'badge-blue',
  individual: 'badge-gray',
}

const tipoLabel: Record<string, string> = {
  diretoria: 'Diretoria',
  gerencia: 'Gerência',
  individual: 'Individual',
}

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [dash, setDash] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null)

  const fetchDash = useCallback(async () => {
    const res = await fetch('/api/roletas/ativas').then((r) => r.json())
    setDash(res)
    setUltimaAtualizacao(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.replace('/login'); return }
    const u = (session.user as any)
    if (!u?.senhaTrocada) { router.replace('/trocar-senha'); return }
    fetchDash()
    const interval = setInterval(fetchDash, 30_000)
    return () => clearInterval(interval)
  }, [status, session, router, fetchDash])

  if (status === 'loading' || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <span className="spinner" />
      </div>
    )
  }

  if (!dash) return null

  const roletasComFila = dash.roletas.filter((r) => r.fila.length > 0)
  const roletasSemFila = dash.roletas.filter((r) => r.fila.length === 0)

  return (
    <div>
      <div className="page-header" style={{ alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>Roletas ativas</h1>
          {dash.cicloAtivo ? (
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Ciclo <strong style={{ color: 'var(--text)' }}>{cicloLabel[dash.cicloAtivo]}</strong>
              <span style={{ marginLeft: 10 }}>{dash.data}</span>
            </span>
          ) : (
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Nenhum ciclo ativo</span>
          )}
        </div>
        <button
          className="btn btn-ghost"
          style={{ fontSize: '0.8125rem' }}
          onClick={fetchDash}
        >
          ↺ Atualizar
        </button>
      </div>

      {ultimaAtualizacao && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 20, marginTop: -8 }}>
          Atualizado às {ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          <span style={{ marginLeft: 8, opacity: 0.6 }}>· atualiza a cada 30s</span>
        </p>
      )}

      {dash.roletas.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          Nenhuma roleta cadastrada.
        </div>
      )}

      {roletasComFila.length > 0 && (
        <div className="roletas-dashboard-grid">
          {roletasComFila.map((r) => (
            <RoletaCard key={r.id} roleta={r} />
          ))}
        </div>
      )}

      {roletasSemFila.length > 0 && dash.cicloAtivo && (
        <>
          <h2 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500, margin: '24px 0 10px' }}>
            Sem fila no ciclo atual
          </h2>
          <div className="roletas-dashboard-grid">
            {roletasSemFila.map((r) => (
              <RoletaCard key={r.id} roleta={r} empty />
            ))}
          </div>
        </>
      )}

      {!dash.cicloAtivo && dash.roletas.length > 0 && (
        <div className="roletas-dashboard-grid">
          {dash.roletas.map((r) => (
            <RoletaCard key={r.id} roleta={r} empty />
          ))}
        </div>
      )}
    </div>
  )
}

function RoletaCard({ roleta, empty }: { roleta: RoletaAtiva; empty?: boolean }) {
  return (
    <div className="card" style={{ opacity: empty ? 0.6 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: '0.9375rem', flex: 1 }}>{roleta.nome}</span>
        <span className={`badge ${tipoBadge[roleta.tipo] ?? 'badge-gray'}`} style={{ fontSize: '0.6875rem' }}>
          {tipoLabel[roleta.tipo]}
        </span>
        {roleta.gerencia && (
          <span className="badge badge-gray" style={{ fontSize: '0.6875rem' }}>{roleta.gerencia.nome}</span>
        )}
      </div>

      {empty ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px 0', fontSize: '0.8125rem' }}>
          Fila não iniciada
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {roleta.fila.map((entry, i) => (
            <div
              key={entry.corretorId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderBottom: i < roleta.fila.length - 1 ? '1px solid var(--border-hairline)' : 'none',
                background: entry.recebeuLeadEm ? 'rgba(212,175,55,0.06)' : 'transparent',
              }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: entry.posicao === 1 ? 'var(--gold-gradient)' : 'var(--bg-surface-hover)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6875rem', fontWeight: 700,
                color: entry.posicao === 1 ? 'var(--text-on-gold)' : 'var(--text-muted)',
              }}>
                {entry.posicao}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: entry.posicao === 1 ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {entry.nome}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{entry.gerencia}</div>
              </div>
              {entry.recebeuLeadEm && (
                <span className="badge badge-yellow" style={{ fontSize: '0.625rem', flexShrink: 0 }}>Lead</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
