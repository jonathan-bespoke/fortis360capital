'use client'

import { useEffect, useState, useCallback } from 'react'

interface Presenca { id: string; ciclo: string; status: string; entradaMarcadaEm: string; manterOnlineMarcadoEm: string | null }
interface EntradaFila { posicao: number; corretorId: string; nome: string; souEu: boolean; recebeuLeadEm: string | null }
interface FilaRoleta { roletaId: string; nome: string; tipo: string; gerencia: string | null; minhaPosicao: number; fila: EntradaFila[] }
interface DadosCorretor { corretor: { id: string; nome: string; gerencia: string; localAtual: string | null }; presencas: Presenca[]; janelas: { entradaManha: boolean; entradaTarde: boolean } }
interface DadosFila { cicloAtivo: string | null; filas: FilaRoleta[]; janelas: { entradaManha: boolean; entradaTarde: boolean; manterOnlineManha: boolean; manterOnlineTarde: boolean } }

const locais = ['Paulista', 'Faria_Lima', 'Frei_Caneca', 'House_Paulista'] as const
const localLabel: Record<string, string> = { Paulista: 'Paulista', Faria_Lima: 'Faria Lima', Frei_Caneca: 'Frei Caneca', House_Paulista: 'House Paulista' }
const cicloLabel: Record<string, string> = { c10_12: '10h–12h', c12_15: '12h–15h', c15_19: '15h–19h', c19_22: '19h–22h' }
const tipoLabel: Record<string, string> = { diretoria: 'Diretoria', gerencia: 'Gerência', individual: 'Individual' }
const tipoBadge: Record<string, string> = { diretoria: 'badge-yellow', gerencia: 'badge-blue', individual: 'badge-gray' }

export default function CorretorPage() {
  const [dados, setDados] = useState<DadosCorretor | null>(null)
  const [fila, setFila] = useState<DadosFila | null>(null)
  const [localSelecionado, setLocalSelecionado] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const carregar = useCallback(async () => {
    const [d, f] = await Promise.all([
      fetch('/api/corretor/presenca').then((r) => r.json()),
      fetch('/api/corretor/fila').then((r) => r.json()),
    ])
    setDados(d)
    setFila(f)
    setLocalSelecionado(d.corretor?.localAtual ?? null)
  }, [])

  useEffect(() => {
    carregar()
    const t = setInterval(carregar, 30000)
    return () => clearInterval(t)
  }, [carregar])

  function presencaAtiva(): Presenca | undefined {
    return dados?.presencas.find((p) => p.status === 'online')
  }

  const online = !!presencaAtiva()
  const cicloAtual = presencaAtiva()?.ciclo

  async function marcarOnline() {
    if (!localSelecionado) { setMsg({ tipo: 'erro', texto: 'Selecione um local primeiro' }); return }
    setLoading('online')
    setMsg(null)
    const res = await fetch('/api/corretor/presenca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local: localSelecionado }),
    })
    setLoading(null)
    if (res.ok) { setMsg({ tipo: 'ok', texto: 'Presença marcada!' }); carregar() }
    else { const d = await res.json(); setMsg({ tipo: 'erro', texto: d.erro ?? 'Erro' }) }
  }

  async function marcarManterOnline() {
    setLoading('manter')
    setMsg(null)
    const res = await fetch('/api/corretor/manter-online', { method: 'POST' })
    setLoading(null)
    if (res.ok) { setMsg({ tipo: 'ok', texto: 'Manter-online confirmado!' }); carregar() }
    else { const d = await res.json(); setMsg({ tipo: 'erro', texto: d.erro ?? 'Erro' }) }
  }

  async function sair() {
    if (!confirm('Confirmar saída? Você será removido da fila imediatamente.')) return
    setLoading('sair')
    setMsg(null)
    const res = await fetch('/api/corretor/sair', { method: 'POST' })
    setLoading(null)
    if (res.ok) { setMsg({ tipo: 'ok', texto: 'Você saiu da fila.' }); carregar() }
    else { const d = await res.json(); setMsg({ tipo: 'erro', texto: d.erro ?? 'Erro' }) }
  }

  if (!dados || !fila) return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><span className="spinner" /></div>

  const j = fila.janelas
  const mostrarManterOnline = online && (j.manterOnlineManha || j.manterOnlineTarde)
  const presencaOnline = presencaAtiva()
  const jaManteveOnline = !!presencaOnline?.manterOnlineMarcadoEm
  const filas = fila.filas ?? []

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          Olá, {dados.corretor.nome}
        </h1>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
          Gerência: {dados.corretor.gerencia}
          {fila.cicloAtivo && <span style={{ marginLeft: 10 }}>· Ciclo {cicloLabel[fila.cicloAtivo]}</span>}
        </div>
      </div>

      {msg && (
        <div className={`alert ${msg.tipo === 'ok' ? 'alert-success' : 'alert-error'}`}>
          {msg.texto}
        </div>
      )}

      {/* Card de status e ações */}
      <div className="card" style={{ marginBottom: 16 }}>
        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: 4 }}>Status</div>
            {online ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <span className="status-dot dot-green" />
                Online {cicloAtual === 'manha_10_12' ? '(manhã)' : '(tarde)'}
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                <span className="status-dot dot-gray" />Offline
              </span>
            )}
          </div>
          {online && (
            <button className="btn btn-danger" onClick={sair} disabled={loading === 'sair'} style={{ minHeight: 38, padding: '0 16px', fontSize: '0.8125rem' }}>
              {loading === 'sair' ? <span className="spinner" /> : 'Sair'}
            </button>
          )}
        </div>

        {/* Local */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: 8 }}>Local de atendimento</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {locais.map((l) => (
              <button
                key={l}
                className={`btn ${localSelecionado === l ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.8125rem', minHeight: 36, padding: '0 14px' }}
                onClick={() => setLocalSelecionado(l)}
              >
                {localLabel[l]}
              </button>
            ))}
          </div>
        </div>

        {/* Botão marcar online */}
        {(j.entradaManha || j.entradaTarde) && !online && (
          <button className="btn btn-success" style={{ width: '100%' }} onClick={marcarOnline} disabled={loading === 'online'}>
            {loading === 'online' ? <span className="spinner" /> : `Marcar online ${j.entradaManha ? '(manhã)' : '(tarde)'}`}
          </button>
        )}

        {/* Manter-online */}
        {mostrarManterOnline && (
          <button
            className={`btn ${jaManteveOnline ? 'btn-ghost' : 'btn-primary'}`}
            style={{ width: '100%', marginTop: 8 }}
            onClick={marcarManterOnline}
            disabled={loading === 'manter' || jaManteveOnline}
          >
            {loading === 'manter' ? <span className="spinner" /> : jaManteveOnline ? 'Manter-online já confirmado' : 'Manter-me Online'}
          </button>
        )}

        {!j.entradaManha && !j.entradaTarde && !online && !mostrarManterOnline && (
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', paddingTop: 8 }}>
            Fora da janela de entrada. Próxima: 8h45–9h45 ou 13h45–14h45.
          </div>
        )}
      </div>

      {/* Filas — hierarquia: Diretoria → Gerência → Individual */}
      {fila.cicloAtivo && filas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', paddingLeft: 2 }}>
            Filas ativas — {cicloLabel[fila.cicloAtivo]}
          </div>

          {filas.map((r) => (
            <div key={r.roletaId} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Cabeçalho do card de fila */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{r.nome}</span>
                  <span className={`badge ${tipoBadge[r.tipo] ?? 'badge-gray'}`} style={{ fontSize: '0.6875rem' }}>
                    {tipoLabel[r.tipo]}
                    {r.gerencia ? ` · ${r.gerencia}` : ''}
                  </span>
                </div>
                {/* Minha posição destacada */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)', background: 'var(--gold-gradient)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', lineHeight: 1 }}>
                    {r.minhaPosicao}º
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    de {r.fila.length} na fila
                  </div>
                </div>
              </div>

              {/* Lista da fila completa */}
              <div style={{ padding: '8px 0' }}>
                {r.fila.map((entrada) => (
                  <div
                    key={entrada.corretorId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 16px',
                      background: entrada.souEu ? 'rgba(212,175,55,0.08)' : 'transparent',
                      borderLeft: entrada.souEu ? '2px solid var(--gold-400)' : '2px solid transparent',
                    }}
                  >
                    {/* Posição */}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: entrada.souEu ? 'var(--gold-gradient)' : 'var(--bg-surface-hover)',
                      border: `1px solid ${entrada.souEu ? 'transparent' : 'var(--border-neutral)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700,
                      color: entrada.souEu ? 'var(--text-on-gold)' : 'var(--text-muted)',
                    }}>
                      {entrada.posicao}
                    </div>

                    {/* Nome */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: entrada.souEu ? 700 : 400,
                        color: entrada.souEu ? 'var(--text-gold)' : 'var(--text-primary)',
                      }}>
                        {entrada.nome}
                        {entrada.souEu && <span style={{ fontSize: '0.75rem', marginLeft: 6, opacity: 0.7 }}>(você)</span>}
                      </span>
                    </div>

                    {/* Lead recebido */}
                    {entrada.recebeuLeadEm && (
                      <span className="badge badge-yellow" style={{ fontSize: '0.6875rem' }}>Lead</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {fila.cicloAtivo && filas.length === 0 && online && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
          Aguardando a ativação da roleta pelo auxiliar...
        </div>
      )}
    </div>
  )
}
