'use client'

import { useEffect, useState } from 'react'

interface Campanha {
  id: string
  nome: string
  tipoHierarquia: string
  ativa: boolean
  gerencia: { nome: string } | null
  roleta: { nome: string }
}

interface Gerencia { id: string; nome: string }
interface Roleta { id: string; nome: string; tipo: string }

const tipoLabel: Record<string, string> = { diretoria: 'Diretoria', gerencia: 'Gerência', individual: 'Individual' }

export default function GestorCampanhasPage() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [gerencias, setGerencias] = useState<Gerencia[]>([])
  const [roletas, setRoletas] = useState<Roleta[]>([])
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Campanha | null>(null)
  const [form, setForm] = useState({ nome: '', tipoHierarquia: 'diretoria', gerenciaId: '', roletaId: '' })
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function carregar() {
    const [c, g, r] = await Promise.all([
      fetch('/api/admin/campanhas').then((x) => x.json()),
      fetch('/api/admin/gerencias').then((x) => x.json()),
      fetch('/api/admin/roletas').then((x) => x.json()),
    ])
    setCampanhas(c)
    setGerencias(g)
    setRoletas(r)
  }

  useEffect(() => { carregar() }, [])

  function abrirCriar() {
    setEditando(null)
    setForm({ nome: '', tipoHierarquia: 'diretoria', gerenciaId: '', roletaId: '' })
    setErro('')
    setModal(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const method = editando ? 'PATCH' : 'POST'
    const url = editando ? `/api/admin/campanhas/${editando.id}` : '/api/admin/campanhas'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json()
      setErro(d.erro ?? 'Erro')
      return
    }
    setModal(false)
    carregar()
  }

  async function toggleAtiva(c: Campanha) {
    await fetch(`/api/admin/campanhas/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativa: !c.ativa }),
    })
    carregar()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Campanhas</h1>
        <button className="btn btn-primary" onClick={abrirCriar}>+ Nova campanha</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>Tipo</th><th>Gerência</th><th>Roleta</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {campanhas.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{c.nome}</td>
                  <td><span className="badge badge-blue">{tipoLabel[c.tipoHierarquia]}</span></td>
                  <td>{c.gerencia?.nome ?? '—'}</td>
                  <td>{c.roleta.nome}</td>
                  <td><span className={`badge ${c.ativa ? 'badge-green' : 'badge-red'}`}>{c.ativa ? 'Ativa' : 'Inativa'}</span></td>
                  <td>
                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => toggleAtiva(c)}>
                      {c.ativa ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editando ? 'Editar campanha' : 'Nova campanha'}</span>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(false)}>✕</button>
            </div>
            {erro && <div className="alert alert-error">{erro}</div>}
            <form onSubmit={salvar}>
              <div className="form-group">
                <label>Nome (identificador do webhook)</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required disabled={!!editando} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tipo</label>
                  <select value={form.tipoHierarquia} onChange={(e) => setForm({ ...form, tipoHierarquia: e.target.value })}>
                    <option value="diretoria">Diretoria</option>
                    <option value="gerencia">Gerência</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>
                {form.tipoHierarquia === 'gerencia' && (
                  <div className="form-group">
                    <label>Gerência</label>
                    <select value={form.gerenciaId} onChange={(e) => setForm({ ...form, gerenciaId: e.target.value })} required>
                      <option value="">Selecionar...</option>
                      {gerencias.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Roleta vinculada</label>
                <select value={form.roletaId} onChange={(e) => setForm({ ...form, roletaId: e.target.value })} required>
                  <option value="">Selecionar...</option>
                  {roletas.map((r) => <option key={r.id} value={r.id}>{r.nome} ({r.tipo})</option>)}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <span className="spinner" /> : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
