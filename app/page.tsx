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
  c10_12: '10h–12h', c12_15: '12h–15h', c15_19: '15h–19h', c19_22: '19h–22h',
}
const tipoBadge: Record<string, string> = {
  diretoria: 'badge-yellow', gerencia: 'badge-blue', individual: 'badge-gray',
}
const tipoLabel: Record<string, string> = {
  diretoria: 'Diretoria', gerencia: 'Gerência', individual: 'Individual',
}
const tipoOrdem: Record<string, number> = { diretoria: 0, gerencia: 1, individual: 2 }

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [dash, setDash] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null)
  const [modalRoleta, setModalRoleta] = useState<RoletaAtiva | null>(null)

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
      <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
        <span className="spinner" />
      </div>
    )
  }

  if (!dash) return null

  const roletasOrdenadas = [...dash.roletas].sort(
    (a, b) => (tipoOrdem[a.tipo] ?? 9) - (tipoOrdem[b.tipo] ?? 9) || a.nome.localeCompare(b.nome)
  )

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          Roletas ativas
        </h1>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
          {dash.cicloAtivo
            ? <>Ciclo <strong style={{ color: 'var(--text)', marginLeft: 4 }}>{cicloLabel[dash.cicloAtivo]}</strong></>
            : 'Nenhum ciclo ativo'}
          {ultimaAtualizacao && (
            <span style={{ opacity: 0.5 }}>
              · {ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button className="btn btn-ghost" style={{ fontSize: '0.75rem', minHeight: 28, padding: '0 10px', marginLeft: 4 }} onClick={fetchDash}>
            ↺
          </button>
        </div>
      </div>

      {roletasOrdenadas.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          Nenhuma roleta cadastrada.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {roletasOrdenadas.map((r) => {
          const preview = r.fila.slice(0, 3)
          const total = r.fila.length
          return (
            <div key={r.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Cabeçalho */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{r.nome}</span>
                  <span className={`badge ${tipoBadge[r.tipo] ?? 'badge-gray'}`} style={{ fontSize: '0.6875rem' }}>
                    {tipoLabel[r.tipo]}{r.gerencia ? ` · ${r.gerencia.nome}` : ''}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {total} na fila
                </span>
              </div>

              {/* Preview — 3 primeiros */}
              {total === 0 ? (
                <div style={{ padding: '14px 16px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Fila não iniciada
                </div>
              ) : (
                <div style={{ padding: '6px 0' }}>
                  {preview.map((entry, i) => (
                    <div
                      key={entry.corretorId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '7px 16px',
                        background: entry.recebeuLeadEm ? 'rgba(212,175,55,0.06)' : 'transparent',
                        borderLeft: entry.posicao === 1 ? '2px solid var(--gold-400)' : '2px solid transparent',
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
                        <span style={{ fontSize: '0.875rem', fontWeight: entry.posicao === 1 ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                          {entry.nome}
                        </span>
                      </div>
                      {entry.recebeuLeadEm && (
                        <span className="badge badge-yellow" style={{ fontSize: '0.625rem' }}>Lead</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Rodapé com botão ver fila completa */}
              {total > 0 && (
                <div style={{ borderTop: '1px solid var(--border-hairline)', padding: '8px 16px' }}>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: '0.8125rem', width: '100%' }}
                    onClick={() => setModalRoleta(r)}
                  >
                    {total > 3 ? `Ver fila completa (+${total - 3} mais)` : 'Ver fila completa'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal fila completa */}
      {modalRoleta && (
        <div className="modal-overlay" onClick={() => setModalRoleta(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="modal-title">{modalRoleta.nome}</span>
                <span className={`badge ${tipoBadge[modalRoleta.tipo] ?? 'badge-gray'}`} style={{ fontSize: '0.6875rem' }}>
                  {tipoLabel[modalRoleta.tipo]}{modalRoleta.gerencia ? ` · ${modalRoleta.gerencia.nome}` : ''}
                </span>
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModalRoleta(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginTop: 4 }}>
              {modalRoleta.fila.map((entry, i) => (
                <div
                  key={entry.corretorId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    borderBottom: i < modalRoleta.fila.length - 1 ? '1px solid var(--border-hairline)' : 'none',
                    background: entry.recebeuLeadEm ? 'rgba(212,175,55,0.06)' : 'transparent',
                    borderLeft: entry.posicao === 1 ? '2px solid var(--gold-400)' : '2px solid transparent',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: entry.posicao === 1 ? 'var(--gold-gradient)' : 'var(--bg-surface-hover)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700,
                    color: entry.posicao === 1 ? 'var(--text-on-gold)' : 'var(--text-muted)',
                  }}>
                    {entry.posicao}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: entry.posicao === 1 ? 600 : 400 }}>{entry.nome}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{entry.gerencia}</div>
                  </div>
                  {entry.recebeuLeadEm && (
                    <span className="badge badge-yellow" style={{ fontSize: '0.6875rem' }}>Lead</span>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setModalRoleta(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
