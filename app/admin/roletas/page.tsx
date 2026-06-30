'use client'

import { useEffect, useState } from 'react'

interface Roleta {
  id: string
  nome: string
  tipo: string
  gerencia: { id: string; nome: string } | null
  roletaCorretores: { corretor: { id: string; user: { nome: string } } }[]
}

interface Gerencia { id: string; nome: string }
interface Corretor { id: string; user: { nome: string }; gerencia: { nome: string } }

const tipoLabel: Record<string, string> = { diretoria: 'Diretoria', gerencia: 'Gerência', individual: 'Individual' }

export default function RoletasPage() {
  const [roletas, setRoletas] = useState<Roleta[]>([])
  const [gerencias, setGerencias] = useState<Gerencia[]>([])
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nome: '', tipo: 'diretoria', gerenciaId: '', corretorIds: [] as string[] })
  const [loading, setLoading] = useState(false)

  async function carregar() {
    const [r, g, u] = await Promise.all([
      fetch('/api/admin/roletas').then((x) => x.json()),
      fetch('/api/admin/gerencias').then((x) => x.json()),
      fetch('/api/admin/users').then((x) => x.json()),
    ])
    setRoletas(r)
    setGerencias(g)
    setCorretores(u.filter((u: any) => u.role === 'corretor'))
  }

  useEffect(() => { carregar() }, [])

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/admin/roletas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    setModal(false)
    setForm({ nome: '', tipo: 'diretoria', gerenciaId: '', corretorIds: [] })
    carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir roleta?')) return
    await fetch(`/api/admin/roletas/${id}`, { method: 'DELETE' })
    carregar()
  }

  function toggleCorretor(id: string) {
    setForm((prev) => ({
      ...prev,
      corretorIds: prev.corretorIds.includes(id)
        ? prev.corretorIds.filter((x) => x !== id)
        : [...prev.corretorIds, id],
    }))
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Roletas</h1>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Nova roleta</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>Tipo</th><th>Gerência</th><th>Corretores (individual)</th><th></th></tr></thead>
            <tbody>
              {roletas.map((r) => (
                <tr key={r.id}>
                  <td>{r.nome}</td>
                  <td><span className="badge badge-blue">{tipoLabel[r.tipo]}</span></td>
                  <td>{r.gerencia?.nome ?? '—'}</td>
                  <td>{r.tipo === 'individual' ? r.roletaCorretores.map((rc) => rc.corretor.user.nome).join(', ') || '—' : '—'}</td>
                  <td><button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => excluir(r.id)}>Excluir</button></td>
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
              <span className="modal-title">Nova roleta</span>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={criar}>
              <div className="form-group">
                <label>Nome</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required autoFocus />
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  <option value="diretoria">Diretoria</option>
                  <option value="gerencia">Gerência</option>
                  <option value="individual">Individual</option>
                </select>
              </div>
              {form.tipo === 'gerencia' && (
                <div className="form-group">
                  <label>Gerência</label>
                  <select value={form.gerenciaId} onChange={(e) => setForm({ ...form, gerenciaId: e.target.value })} required>
                    <option value="">Selecionar...</option>
                    {gerencias.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                </div>
              )}
              {form.tipo === 'individual' && (
                <div className="form-group">
                  <label>Corretores</label>
                  <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, padding: 8 }}>
                    {corretores.map((c) => (
                      <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', color: 'var(--text)' }}>
                        <input
                          type="checkbox"
                          style={{ width: 'auto' }}
                          checked={form.corretorIds.includes(c.id)}
                          onChange={() => toggleCorretor(c.id)}
                        />
                        {c.user.nome}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <span className="spinner" /> : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
