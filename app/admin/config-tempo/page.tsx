'use client'

import { useEffect, useState } from 'react'

const horariosSugeridos = [
  { label: 'Entrada manhã (9h00)', valor: '09:00' },
  { label: 'Ok geral manhã (9h47)', valor: '09:47' },
  { label: 'Início ciclo manhã (10h05)', valor: '10:05' },
  { label: 'Manter-online manhã (11h30)', valor: '11:30' },
  { label: 'Ok geral 12h (11h47)', valor: '11:47' },
  { label: 'Corte meio-dia (12h05)', valor: '12:05' },
  { label: 'Entrada tarde (14h00)', valor: '14:00' },
  { label: 'Ok geral tarde (14h47)', valor: '14:47' },
  { label: 'Início ciclo tarde (15h05)', valor: '15:05' },
  { label: 'Manter-online tarde (18h30)', valor: '18:30' },
  { label: 'Ok geral 19h (18h47)', valor: '18:47' },
  { label: 'Corte noite (19h05)', valor: '19:05' },
  { label: 'Corte geral (22h05)', valor: '22:05' },
]

export default function ConfigTempoPage() {
  const [fakeNow, setFakeNow] = useState<string | null>(null)
  const [ativo, setAtivo] = useState(false)
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  async function carregar() {
    const res = await fetch('/api/admin/config-tempo').then((r) => r.json())
    if (res.fakeNow) {
      setFakeNow(res.fakeNow)
      setAtivo(true)
      const d = new Date(res.fakeNow)
      setData(d.toISOString().slice(0, 10))
      setHora(d.toISOString().slice(11, 16))
    } else {
      setFakeNow(null)
      setAtivo(false)
      // default: hoje
      setData(new Date().toISOString().slice(0, 10))
      setHora('09:00')
    }
  }

  useEffect(() => { carregar() }, [])

  async function salvar() {
    setLoading(true)
    setMsg(null)
    const valor = ativo ? `${data}T${hora}:00` : null
    const res = await fetch('/api/admin/config-tempo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fakeNow: valor }),
    })
    setLoading(false)
    if (res.ok) {
      setMsg({ tipo: 'ok', texto: valor ? `Modo teste ativo: ${data} às ${hora}` : 'Modo teste desativado. Usando hora real.' })
      carregar()
    } else {
      setMsg({ tipo: 'erro', texto: 'Erro ao salvar' })
    }
  }

  function aplicarSugestao(h: string) {
    setHora(h)
    setAtivo(true)
  }

  const horaReal = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="page-header">
        <h1 className="page-title">Modo Teste — Relógio do Sistema</h1>
      </div>

      {msg && <div className={`alert ${msg.tipo === 'ok' ? 'alert-success' : 'alert-error'}`}>{msg.texto}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 600 }}>Status do modo teste</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Hora real agora: <strong>{horaReal}</strong> (Brasília)
            </div>
            {fakeNow && (
              <div style={{ fontSize: 13, color: 'var(--warning)', marginTop: 4 }}>
                Sistema usando: <strong>{new Date(fakeNow).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</strong>
              </div>
            )}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: 'var(--text)' }}>
            <div
              onClick={() => setAtivo(!ativo)}
              style={{
                width: 48, height: 26, borderRadius: 13,
                background: ativo ? 'var(--warning)' : 'var(--surface2)',
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2,
                left: ativo ? 24 : 2, transition: 'left 0.2s',
              }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{ativo ? 'Modo teste ativo' : 'Hora real'}</span>
          </label>
        </div>

        {ativo && (
          <>
            <div className="form-row" style={{ marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Data</label>
                <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Hora (Brasília)</label>
                <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ marginBottom: 8 }}>Atalhos de horário</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {horariosSugeridos.map((s) => (
                  <button
                    key={s.valor}
                    className={`btn btn-ghost`}
                    style={{ fontSize: 12, padding: '4px 10px', borderColor: hora === s.valor ? 'var(--warning)' : undefined, color: hora === s.valor ? 'var(--warning)' : undefined }}
                    onClick={() => aplicarSugestao(s.valor)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <button className="btn btn-primary" onClick={salvar} disabled={loading} style={{ width: '100%' }}>
          {loading ? <span className="spinner" /> : ativo ? 'Ativar modo teste' : 'Desativar modo teste'}
        </button>
      </div>

      <div className="card" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Como funciona</div>
        <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>Quando ativo, <strong>todo o sistema</strong> passa a usar o horário definido aqui.</li>
          <li>Corretores verão os botões corretos para aquela janela de tempo.</li>
          <li>O auxiliar verá os botões de ok geral correspondentes.</li>
          <li>O webhook de leads também usará o ciclo daquele horário.</li>
          <li>Quando desativado, volta ao horário real de Brasília automaticamente.</li>
          <li style={{ color: 'var(--warning)' }}>Lembre de desativar antes de ir para produção!</li>
        </ul>
      </div>
    </div>
  )
}
