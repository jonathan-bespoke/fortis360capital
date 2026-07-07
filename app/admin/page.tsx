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
  corretorId: string | null
  online: boolean
}

interface Gerencia { id: string; nome: string }

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  gestor_trafego: 'Gestor de Tráfego',
  auxiliar: 'Auxiliar',
  corretor: 'Corretor',
}
const roleBadge: Record<string, string> = {
  admin: 'badge-yellow',
  gestor_trafego: 'badge-blue',
  auxiliar: 'badge-gray',
  corretor: 'badge-gray',
}

function initials(nome: string) {
  const p = nome.trim().split(/\s+/)
  return (p[0][0] + (p[1]?.[0] ?? '')).toUpperCase()
}

export default function AdminUsersPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [gerencias, setGerencias] = useState<Gerencia[]>([])
  const [criarModal, setCriarModal] = useState(false)
  const [detalheUser, setDetalheUser] = useState<Usuario | null>(null)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', role: 'corretor', gerenciaId: '' })
  const [novaSenha, setNovaSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [msgDetalhe, setMsgDetalhe] = useState('')

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
    if (!res.ok) { const d = await res.json(); setErro(d.erro ?? 'Erro'); return }
    setCriarModal(false)
    setForm({ nome: '', email: '', senha: '', role: 'corretor', gerenciaId: '' })
    carregar()
  }

  async function patchUser(id: string, body: object) {
    setLoading(true)
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    await carregar()
    // Atualiza o detalhe com os novos dados
    setDetalheUser((prev) => {
      if (!prev || prev.id !== id) return prev
      const atualizado = usuarios.find((u) => u.id === id)
      return atualizado ?? prev
    })
  }

  async function excluir(u: Usuario) {
    if (!confirm(`Excluir "${u.nome}" permanentemente?`)) return
    await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
    setDetalheUser(null)
    carregar()
  }

  async function toggleAtivo(u: Usuario) {
    await patchUser(u.id, { ativo: !u.ativo })
    setMsgDetalhe(u.ativo ? 'Usuário desativado.' : 'Usuário ativado.')
  }

  async function redefinirSenha(u: Usuario) {
    if (!novaSenha || novaSenha.length < 6) { setMsgDetalhe('Senha precisa ter ao menos 6 caracteres.'); return }
    await patchUser(u.id, { senha: novaSenha })
    setNovaSenha('')
    setMsgDetalhe('Senha redefinida com sucesso.')
  }

  // Agrupado: corretores online primeiro, depois offline, depois não-corretores
  const corretoresOnline = usuarios.filter((u) => u.role === 'corretor' && u.online && u.ativo)
  const corretoresOffline = usuarios.filter((u) => u.role === 'corretor' && !u.online && u.ativo)
  const corretoresInativos = usuarios.filter((u) => u.role === 'corretor' && !u.ativo)
  const outros = usuarios.filter((u) => u.role !== 'corretor')

  function abrirDetalhe(u: Usuario) {
    setDetalheUser(u)
    setMsgDetalhe('')
    setNovaSenha('')
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Usuários</h1>
        <button className="btn btn-primary" onClick={() => { setCriarModal(true); setErro('') }}>+ Novo usuário</button>
      </div>

      {/* Lista de corretores */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          Corretores
        </div>

        {corretoresOnline.length > 0 && (
          <>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '0 0 6px 2px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="status-dot dot-green" style={{ flexShrink: 0 }} />Online
            </div>
            {corretoresOnline.map((u) => <UserRow key={u.id} u={u} onClick={() => abrirDetalhe(u)} />)}
          </>
        )}

        {corretoresOffline.length > 0 && (
          <>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: `${corretoresOnline.length > 0 ? '14px' : '0'} 0 6px 2px`, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="status-dot dot-gray" style={{ flexShrink: 0 }} />Offline
            </div>
            {corretoresOffline.map((u) => <UserRow key={u.id} u={u} onClick={() => abrirDetalhe(u)} />)}
          </>
        )}

        {corretoresInativos.length > 0 && (
          <>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '14px 0 6px 2px', opacity: 0.6 }}>Inativos</div>
            <div style={{ opacity: 0.45 }}>
              {corretoresInativos.map((u) => <UserRow key={u.id} u={u} onClick={() => abrirDetalhe(u)} />)}
            </div>
          </>
        )}

        {corretoresOnline.length === 0 && corretoresOffline.length === 0 && corretoresInativos.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Nenhum corretor cadastrado.</div>
        )}
      </div>

      {/* Outros usuários */}
      {outros.length > 0 && (
        <div className="card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            Equipe interna
          </div>
          {outros.map((u) => <UserRow key={u.id} u={u} onClick={() => abrirDetalhe(u)} showRole />)}
        </div>
      )}

      {/* Modal: detalhes */}
      {detalheUser && (() => {
        const u = usuarios.find((x) => x.id === detalheUser.id) ?? detalheUser
        return (
          <div className="modal-overlay" onClick={() => setDetalheUser(null)}>
            <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: u.ativo ? 'var(--gold-400)' : 'var(--bg-surface-hover)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8125rem', fontWeight: 700, color: u.ativo ? 'var(--text-on-gold)' : 'var(--text-muted)',
                  }}>{initials(u.nome)}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{u.nome}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                  </div>
                </div>
                <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setDetalheUser(null)}>✕</button>
              </div>

              {msgDetalhe && (
                <div className="alert alert-success" style={{ marginBottom: 12 }}>{msgDetalhe}</div>
              )}

              {/* Info */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <span className={`badge ${roleBadge[u.role] ?? 'badge-gray'}`}>{roleLabels[u.role] ?? u.role}</span>
                {u.gerencia && <span className="badge badge-gray">{u.gerencia}</span>}
                <span className={`badge ${u.ativo ? 'badge-green' : 'badge-red'}`}>{u.ativo ? 'Ativo' : 'Inativo'}</span>
                {u.role === 'corretor' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span className={`status-dot ${u.online ? 'dot-green' : 'dot-gray'}`} />
                    {u.online ? 'Online agora' : 'Offline'}
                  </span>
                )}
              </div>

              {/* Senha */}
              <div style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: 14, marginBottom: 14 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 8 }}>Senha</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                  Status: <span className={u.senhaTrocada ? '' : ''} style={{ color: u.senhaTrocada ? 'var(--success)' : 'var(--warning)' }}>
                    {u.senhaTrocada ? 'Trocada pelo usuário' : 'Pendente — ainda usa a senha padrão'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="password"
                    placeholder="Nova senha (mín. 6 chars)"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-ghost" style={{ flexShrink: 0 }} disabled={loading} onClick={() => redefinirSenha(u)}>
                    Redefinir
                  </button>
                </div>
              </div>

              {/* Ações */}
              <div style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: 14, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                <button
                  className="btn btn-danger"
                  style={{ fontSize: '0.8125rem' }}
                  disabled={loading}
                  onClick={() => excluir(u)}
                >
                  Excluir
                </button>
                <button
                  className={`btn ${u.ativo ? 'btn-ghost' : 'btn-success'}`}
                  style={{ fontSize: '0.8125rem' }}
                  disabled={loading}
                  onClick={() => toggleAtivo(u)}
                >
                  {loading ? <span className="spinner" /> : u.ativo ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal: criar */}
      {criarModal && (
        <div className="modal-overlay" onClick={() => setCriarModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Novo usuário</span>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setCriarModal(false)}>✕</button>
            </div>
            {erro && <div className="alert alert-error">{erro}</div>}
            <form onSubmit={criar}>
              <div className="form-group">
                <label>Nome</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required autoFocus />
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
                <button type="button" className="btn btn-ghost" onClick={() => setCriarModal(false)}>Cancelar</button>
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

function UserRow({ u, onClick, showRole }: { u: Usuario; onClick: () => void; showRole?: boolean }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 4px', borderRadius: 8, cursor: 'pointer',
        transition: 'background var(--ease-fast)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: u.online ? 'var(--gold-400)' : 'var(--bg-surface-hover)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.6875rem', fontWeight: 700,
        color: u.online ? 'var(--text-on-gold)' : 'var(--text-muted)',
        position: 'relative',
      }}>
        {initials(u.nome)}
        {u.role === 'corretor' && (
          <span style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 9, height: 9, borderRadius: '50%',
            background: u.online ? 'var(--success)' : 'var(--text-muted)',
            border: '1.5px solid var(--bg-elevated)',
          }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {u.nome}
        </div>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
          {u.gerencia ?? (showRole ? roleLabels[u.role] ?? u.role : '—')}
        </div>
      </div>
      {showRole && u.role !== 'corretor' && (
        <span className={`badge ${roleBadge[u.role] ?? 'badge-gray'}`} style={{ fontSize: '0.625rem', flexShrink: 0 }}>
          {roleLabels[u.role] ?? u.role}
        </span>
      )}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  )
}
