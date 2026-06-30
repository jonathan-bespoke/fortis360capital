'use client'

import { useEffect, useState } from 'react'

interface Usuario {
  id: string
  nome: string
  email: string
  role: string
  ativo: boolean
  senhaTrocada: boolean
  gerencia: string | null
  gerenciaId: string | null
}

interface Gerencia {
  id: string
  nome: string
}

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  gestor_trafego: 'Gestor de Tráfego',
  auxiliar: 'Auxiliar',
  corretor: 'Corretor',
}

export default function AdminUsersPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [gerencias, setGerencias] = useState<Gerencia[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', role: 'corretor', gerenciaId: '' })
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function carregar() {
    const [u, g] = await Promise.all([
      fetch('/api/admin/users').then((r) => r.json()),
      fetch('/api/admin/gerencias').then((r) => r.json()),
    ])
    setUsuarios(u)
    setGerencias(g)
  }

  useEffect(() => { carregar() }, [])

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
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
    setForm({ nome: '', email: '', senha: '', role: 'corretor', gerenciaId: '' })
    carregar()
  }

  async function toggleAtivo(u: Usuario) {
    await fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !u.ativo }),
    })
    carregar()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Usuários</h1>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Novo usuário</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Perfil</th>
                <th>Gerência</th>
                <th>Status</th>
                <th>Senha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.nome}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                  <td><span className="badge badge-blue">{roleLabels[u.role] ?? u.role}</span></td>
                  <td>{u.gerencia ?? '—'}</td>
                  <td>
                    <span className={`badge ${u.ativo ? 'badge-green' : 'badge-red'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.senhaTrocada ? 'badge-green' : 'badge-yellow'}`}>
                      {u.senhaTrocada ? 'Ok' : 'Pendente'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => toggleAtivo(u)}>
                      {u.ativo ? 'Desativar' : 'Ativar'}
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
              <span className="modal-title">Novo usuário</span>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setModal(false)}>✕</button>
            </div>

            {erro && <div className="alert alert-error">{erro}</div>}

            <form onSubmit={criar}>
              <div className="form-group">
                <label>Nome</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Senha padrão</label>
                <input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} required minLength={6} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Perfil</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    <option value="corretor">Corretor</option>
                    <option value="auxiliar">Auxiliar</option>
                    <option value="gestor_trafego">Gestor de Tráfego</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {form.role === 'corretor' && (
                  <div className="form-group">
                    <label>Gerência</label>
                    <select value={form.gerenciaId} onChange={(e) => setForm({ ...form, gerenciaId: e.target.value })} required>
                      <option value="">Selecionar...</option>
                      {gerencias.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                    </select>
                  </div>
                )}
              </div>
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
