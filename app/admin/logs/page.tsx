'use client'

import { useEffect, useState } from 'react'

interface Lead {
  id: string
  campanha: string
  roleta: string
  corretor: string | null
  nomeLead: string | null
  telefoneLead: string | null
  emailLead: string | null
  resposta: string
  ciclo: string | null
  timestamp: string
}

const cicloLabel: Record<string, string> = {
  c10_12: '10h–12h',
  c12_15: '12h–15h',
  c15_19: '15h–19h',
  c19_22: '19h–22h',
}

export default function LogsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [loading, setLoading] = useState(false)

  async function carregar(p = page) {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: '50' })
    if (dataInicio) params.set('dataInicio', dataInicio)
    if (dataFim) params.set('dataFim', dataFim)
    const data = await fetch(`/api/admin/logs?${params}`).then((r) => r.json())
    setLeads(data.dados)
    setTotal(data.total)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [page])

  function formatTs(ts: string) {
    return new Date(ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Logs de Leads</h1>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{total} registros</span>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>De</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Até</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => { setPage(1); carregar(1) }} disabled={loading}>
            Filtrar
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><span className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Campanha</th>
                  <th>Roleta</th>
                  <th>Ciclo</th>
                  <th>Corretor</th>
                  <th>Lead</th>
                  <th>Telefone</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-muted)' }}>{formatTs(l.timestamp)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{l.campanha}</td>
                    <td>{l.roleta}</td>
                    <td>{l.ciclo ? cicloLabel[l.ciclo] ?? l.ciclo : '—'}</td>
                    <td>
                      {l.corretor ? (
                        <span className="badge badge-green">{l.corretor}</span>
                      ) : (
                        <span className="badge badge-red">Nenhum</span>
                      )}
                    </td>
                    <td>{l.nomeLead ?? '—'}</td>
                    <td>{l.telefoneLead ?? '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.emailLead ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 50 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>← Anterior</button>
            <span style={{ padding: '8px 16px', color: 'var(--text-muted)' }}>
              {page} / {Math.ceil(total / 50)}
            </span>
            <button className="btn btn-ghost" disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(page + 1)}>Próxima →</button>
          </div>
        )}
      </div>
    </div>
  )
}
