'use client'

import { useEffect, useState } from 'react'

interface Gerencia {
  id: string
  nome: string
}

export default function GerenciasPage() {
  const [gerencias, setGerencias] = useState<Gerencia[]>([])
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Gerencia | null>(null)
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)

  async function carregar() {
    const data = await fetch('/api/admin/gerencias').then((r) => r.json())
    setGerencias(data)
  }

  useEffect(() => { carregar() }, [])

  function abrirModal(g?: Gerencia) {
    setEditando(g ?? null)
    setNome(g?.nome ?? '')
    setModal(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    if (editando) {
      await fetch(`/api/admin/gerencias/${editando.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      })
    } else {
      await fetch('/api/admin/gerencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      })
    }
    setLoading(false)
    setModal(false)
    carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir gerência? Isso pode afetar corretores vinculados.')) return
    await fetch(`/api/admin/gerencias/${id}`, { method: 'DELETE' })
    carregar()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gerências</h1>
        <button className="btn btn-primary" onClick={() => abrirModal()}>+ Nova gerência</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th></th></tr></thead>
            <tbody>
              {gerencias.map((g) => (
                <tr key={g.id}>
                  <td>{g.nome}</td>
                  <td style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => abrirModal(g)}>Editar</button>
                    <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => excluir(g.id)}>Excluir</button>
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
              <span className="modal-title">{editando ? 'Editar gerência' : 'Nova gerência'}</span>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={salvar}>
              <div className="form-group">
                <label>Nome</label>
                <input value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
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
