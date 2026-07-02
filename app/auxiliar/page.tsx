'use client'

import { useEffect, useState, useCallback } from 'react'

interface FilaEntry { posicao: number; corretorId: string; nome: string; recebeuLeadEm: string | null }
interface RoletaData { id: string; nome: string; tipo: string; gerencia: string | null; fila: FilaEntry[] }
interface PresencaData { id: string; corretorId: string; nome: string; gerencia: string; ciclo: string; status: string; entradaMarcadaEm: string; manterOnlineMarcadoEm: string | null; local: string | null }
interface PainelData { cicloAtivo: string | null; janelaOkGeral: string | null; okGeralJaDado: boolean; data: string; roletas: RoletaData[]; presencas: PresencaData[] }

const statusLabel: Record<string, string> = {
  online: 'Online',
  removido_corte: 'Removido (corte)',
  removido_manual: 'Removido (manual)',
  offline_manual: 'Offline',
}

const statusBadge: Record<string, string> = {
  online: 'badge-green',
  removido_corte: 'badge-red',
  removido_manual: 'badge-red',
  offline_manual: 'badge-gray',
}

const janelaLabel: Record<string, string> = { j10h: '10h', j12h: '12h', j15h: '15h', j19h: '19h' }
const cicloLabel: Record<string, string> = { c10_12: '10h–12h', c12_15: '12h–15h', c15_19: '15h–19h', c19_22: '19h–22h' }

export default function AuxiliarPage() {
  const [dados, setDados] = useState<PainelData | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const carregar = useCallback(async () => {
    const painel = await fetch('/api/auxiliar/painel').then((r) => r.json())
    setDados(painel)
  }, [])

  useEffect(() => {
    carregar()
    const t = setInterval(carregar, 30000)
    return () => clearInterval(t)
  }, [carregar])

  async function darOkGeral() {
    if (!dados?.janelaOkGeral) return
    setLoading(true)
    setMsg('')
    const res = await fetch('/api/auxiliar/ok-geral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ janela: dados.janelaOkGeral }),
    })
    setLoading(false)
    if (res.ok) {
      setMsg('Roleta ativada! Fila construída.')
      carregar()
    } else {
      const d = await res.json()
      setMsg(d.erro ?? 'Erro')
    }
  }

  async function removerCorretor(corretorId: string, nome: string) {
    if (!confirm(`Remover ${nome} da fila?`)) return
    await fetch('/api/auxiliar/remover-corretor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ corretorId }),
    })
    carregar()
  }

  if (!dados) return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><span className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Painel da Roleta</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {dados.data} &nbsp;·&nbsp;
            {dados.cicloAtivo ? `Ciclo: ${cicloLabel[dados.cicloAtivo]}` : 'Fora do ciclo'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {dados?.janelaOkGeral && (
            dados.okGeralJaDado ? (
              <span className="badge badge-green" style={{ fontSize: 13, padding: '6px 14px' }}>
                ✓ Roleta ativada ({janelaLabel[dados.janelaOkGeral]})
              </span>
            ) : (
              <button className="btn btn-success" onClick={darOkGeral} disabled={loading}>
                {loading ? <span className="spinner" /> : `⚑ Ativar Roleta (${janelaLabel[dados.janelaOkGeral]})`}
              </button>
            )
          )}
          <button className="btn btn-ghost" onClick={carregar}>Atualizar</button>
        </div>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}

      <div style={{ display: 'grid', gap: 24 }}>
        {/* Roletas com fila */}
        {dados.cicloAtivo && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Filas ativas</h2>
            <div className="grid-3">
              {dados.roletas.map((r) => (
                <div key={r.id} className="card">
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.nome}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                    {r.tipo === 'gerencia' ? r.gerencia : r.tipo}
                  </div>
                  {r.fila.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nenhum na fila</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {r.fila.map((f) => (
                        <div key={f.corretorId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2)', borderRadius: 6, padding: '6px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                              {f.posicao}
                            </span>
                            <span style={{ fontSize: 13 }}>{f.nome}</span>
                            {f.recebeuLeadEm && <span className="badge badge-yellow" style={{ fontSize: 10 }}>Lead</span>}
                          </div>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '2px 8px', fontSize: 11 }}
                            onClick={() => removerCorretor(f.corretorId, f.nome)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Presença do dia */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Presença do dia</h2>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Gerência</th>
                    <th>Ciclo</th>
                    <th>Status</th>
                    <th>Entrada</th>
                    <th>Manter-online</th>
                    <th>Local</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {dados.presencas.map((p) => (
                    <tr key={p.id}>
                      <td>{p.nome}</td>
                      <td>{p.gerencia}</td>
                      <td>{p.ciclo === 'manha_10_12' ? 'Manhã' : 'Tarde'}</td>
                      <td>
                        <span className={`badge ${statusBadge[p.status] ?? 'badge-gray'}`}>
                          {statusLabel[p.status] ?? p.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(p.entradaMarcadaEm).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {p.manterOnlineMarcadoEm
                          ? new Date(p.manterOnlineMarcadoEm).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td style={{ fontSize: 12 }}>{p.local?.replace('_', ' ') ?? '—'}</td>
                      <td>
                        {p.status === 'online' && (
                          <button
                            className="btn btn-danger"
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            onClick={() => removerCorretor(p.corretorId, p.nome)}
                          >
                            Remover
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {dados.presencas.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Nenhuma presença registrada hoje</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
