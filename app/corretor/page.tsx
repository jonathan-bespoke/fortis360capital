'use client'

import { useEffect, useState, useCallback } from 'react'

interface Presenca { id: string; ciclo: string; status: string; entradaMarcadaEm: string; manterOnlineMarcadoEm: string | null }
interface Posicao { roleta: string; tipo: string; posicao: number; totalNaFila: number }
interface DadosCorretor { corretor: { id: string; nome: string; gerencia: string; localAtual: string | null }; presencas: Presenca[]; janelas: { entradaManha: boolean; entradaTarde: boolean } }
interface DadosFila { cicloAtivo: string | null; posicoes: Posicao[]; janelas: { entradaManha: boolean; entradaTarde: boolean; manterOnlineManha: boolean; manterOnlineTarde: boolean } }

const locais = ['Paulista', 'Faria_Lima', 'Frei_Caneca', 'House_Paulista'] as const
const localLabel: Record<string, string> = { Paulista: 'Paulista', Faria_Lima: 'Faria Lima', Frei_Caneca: 'Frei Caneca', House_Paulista: 'House Paulista' }
const cicloLabel: Record<string, string> = { c10_12: '10h–12h', c12_15: '12h–15h', c15_19: '15h–19h', c19_22: '19h–22h' }
const tipoLabel: Record<string, string> = { diretoria: 'Diretoria', gerencia: 'Gerência', individual: 'Individual' }

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

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Olá, {dados.corretor.nome}</h1>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Gerência: {dados.corretor.gerencia}</div>
      </div>

      {msg && (
        <div className={`alert ${msg.tipo === 'ok' ? 'alert-success' : 'alert-error'}`}>
          {msg.texto}
        </div>
      )}

      {/* Status atual */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 600 }}>Status</div>
            <div style={{ marginTop: 4 }}>
              {online ? (
                <span><span className="status-dot dot-green" />Online {cicloAtual === 'manha_10_12' ? '(manhã)' : '(tarde)'}</span>
              ) : (
                <span><span className="status-dot dot-gray" />Offline</span>
              )}
            </div>
          </div>
          {online && (
            <button className="btn btn-danger" onClick={sair} disabled={loading === 'sair'}>
              {loading === 'sair' ? <span className="spinner" /> : 'Sair'}
            </button>
          )}
        </div>

        {/* Seleção de local */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ marginBottom: 8 }}>Local de atendimento</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {locais.map((l) => (
              <button
                key={l}
                className={`btn ${localSelecionado === l ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: 13 }}
                onClick={() => setLocalSelecionado(l)}
              >
                {localLabel[l]}
              </button>
            ))}
          </div>
        </div>

        {/* Botão de marcar online */}
        {(j.entradaManha || j.entradaTarde) && !online && (
          <button className="btn btn-success" style={{ width: '100%' }} onClick={marcarOnline} disabled={loading === 'online'}>
            {loading === 'online' ? <span className="spinner" /> : `Marcar online ${j.entradaManha ? '(manhã)' : '(tarde)'}`}
          </button>
        )}

        {/* Botão manter-online */}
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
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>
            Fora da janela de entrada. Aguarde a próxima janela (8h45–9h45 ou 13h45–14h45).
          </div>
        )}
      </div>

      {/* Posições na fila */}
      {fila.cicloAtivo && fila.posicoes.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Sua posição na fila — {cicloLabel[fila.cicloAtivo]}</div>
          <div className="grid-3">
            {fila.posicoes.map((p) => (
              <div key={p.roleta} className="position-card">
                <div className="position-number">{p.posicao}º</div>
                <div className="position-label" style={{ marginTop: 4 }}>{p.roleta}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>de {p.totalNaFila} na fila</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{tipoLabel[p.tipo]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {fila.cicloAtivo && fila.posicoes.length === 0 && online && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
          Aguardando a construção da fila (ok geral do auxiliar)...
        </div>
      )}
    </div>
  )
}
