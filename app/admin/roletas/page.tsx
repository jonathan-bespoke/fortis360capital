'use client'

import { useEffect, useState } from 'react'

interface RoletaCorretor {
  corretor: { id: string; user: { nome: string }; gerencia: { nome: string } }
  ativo: boolean
}

interface Roleta {
  id: string
  nome: string
  tipo: string
  gerencia: { id: string; nome: string } | null
  roletaCorretores: RoletaCorretor[]
}

interface Gerencia { id: string; nome: string }
interface Corretor { id: string; nome: string; gerencia: string | null; gerenciaId: string | null; corretorId: string | null; role: string }
interface FilaEntry { posicao: number; corretorId: string; nome: string; gerencia: string; recebeuLeadEm: string | null }
interface FilaData { cicloAtivo: string | null; data: string; fila: FilaEntry[] }

const tipoLabel: Record<string, string> = { diretoria: 'Diretoria', gerencia: 'Gerência', individual: 'Individual' }
const cicloLabel: Record<string, string> = { c10_12: '10h–12h', c12_15: '12h–15h', c15_19: '15h–19h', c19_22: '19h–22h' }
const tipoBadge: Record<string, string> = { diretoria: 'badge-yellow', gerencia: 'badge-blue', individual: 'badge-gray' }

const emptyForm = { nome: '', tipo: 'diretoria', gerenciaId: '', corretorIds: [] as string[] }

export default function RoletasPage() {
  const [roletas, setRoletas] = useState<Roleta[]>([])
  const [gerencias, setGerencias] = useState<Gerencia[]>([])
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [modal, setModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [desativados, setDesativados] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [filaModal, setFilaModal] = useState(false)
  const [filaRoleta, setFilaRoleta] = useState<Roleta | null>(null)
  const [filaData, setFilaData] = useState<FilaData | null>(null)
  const [filaLoading, setFilaLoading] = useState(false)

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
    setForm(emptyForm)
    carregar()
  }

  function abrirEditar(r: Roleta) {
    setEditId(r.id)
    setForm({
      nome: r.nome,
      tipo: r.tipo,
      gerenciaId: r.gerencia?.id ?? '',
      corretorIds: r.roletaCorretores.map((rc) => rc.corretor.id),
    })
    // Pre-populate desativados from existing exclusion records
    const inativos = new Set(
      r.roletaCorretores.filter((rc) => !rc.ativo).map((rc) => rc.corretor.id)
    )
    setDesativados(inativos)
    setEditModal(true)
  }

  async function salvarEditar(e: React.FormEvent) {
    e.preventDefault()
    if (!editId) return
    setLoading(true)
    await fetch(`/api/admin/roletas/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: form.nome,
        gerenciaId: form.tipo === 'gerencia' ? form.gerenciaId || null : null,
        ...(form.tipo === 'individual' ? { corretorIds: form.corretorIds } : {}),
        desativados: Array.from(desativados),
      }),
    })
    setLoading(false)
    setEditModal(false)
    setEditId(null)
    setForm(emptyForm)
    setDesativados(new Set())
    carregar()
  }

  async function abrirFila(r: Roleta) {
    setFilaRoleta(r)
    setFilaData(null)
    setFilaModal(true)
    setFilaLoading(true)
    const res = await fetch(`/api/admin/roletas/${r.id}/fila`).then((x) => x.json())
    setFilaData(res)
    setFilaLoading(false)
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

  function toggleDesativado(id: string) {
    setDesativados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // For gerencia/diretoria edit: return all relevant corretores with active state
  function corretoresParaEditar(): { corretorId: string; nome: string; ativo: boolean }[] {
    if (!editId) return []
    const roleta = roletas.find((r) => r.id === editId)
    if (!roleta) return []

    const excluidosIds = new Set(
      roleta.roletaCorretores.filter((rc) => !rc.ativo).map((rc) => rc.corretor.id)
    )

    let lista: Corretor[] = []
    if (roleta.tipo === 'gerencia' && roleta.gerencia) {
      lista = corretores.filter((c) => c.gerenciaId === roleta.gerencia!.id)
    } else {
      lista = corretores
    }

    return lista
      .filter((c) => c.corretorId)
      .map((c) => ({ corretorId: c.corretorId!, nome: c.nome, ativo: !excluidosIds.has(c.corretorId!) }))
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Roletas</h1>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Nova roleta</button>
      </div>

      {/* Desktop table */}
      <div className="card roletas-table-wrap">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>Tipo</th><th>Gerência</th><th>Corretores (individual)</th><th></th></tr></thead>
            <tbody>
              {roletas.map((r) => (
                <tr key={r.id}>
                  <td>{r.nome}</td>
                  <td><span className={`badge ${tipoBadge[r.tipo] ?? 'badge-gray'}`}>{tipoLabel[r.tipo]}</span></td>
                  <td>{r.gerencia?.nome ?? '—'}</td>
                  <td>{r.tipo === 'individual' ? r.roletaCorretores.map((rc) => rc.corretor.user.nome).join(', ') || '—' : '—'}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => abrirFila(r)}>Ver Fila</button>
                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => abrirEditar(r)}>Editar</button>
                    <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => excluir(r.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="roletas-cards">
        {roletas.map((r) => (
          <div key={r.id} className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontWeight: 600, fontSize: '0.9375rem', flex: 1 }}>{r.nome}</span>
              <span className={`badge ${tipoBadge[r.tipo] ?? 'badge-gray'}`}>{tipoLabel[r.tipo]}</span>
            </div>
            {r.gerencia && (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 4 }}>{r.gerencia.nome}</div>
            )}
            {r.tipo === 'individual' && r.roletaCorretores.length > 0 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                {r.roletaCorretores.map((rc) => rc.corretor.user.nome).join(', ')}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1, fontSize: '0.8125rem' }} onClick={() => abrirFila(r)}>Ver Fila</button>
              <button className="btn btn-ghost" style={{ flex: 1, fontSize: '0.8125rem' }} onClick={() => abrirEditar(r)}>Editar</button>
              <button className="btn btn-danger" style={{ flex: 1, fontSize: '0.8125rem' }} onClick={() => excluir(r.id)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: fila ativa */}
      {filaModal && filaRoleta && (
        <div className="modal-overlay" onClick={() => setFilaModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-title">{filaRoleta.nome}</span>
                <span className={`badge ${tipoBadge[filaRoleta.tipo] ?? 'badge-gray'}`} style={{ marginLeft: 8, fontSize: '0.6875rem' }}>
                  {tipoLabel[filaRoleta.tipo]}{filaRoleta.gerencia ? ` · ${filaRoleta.gerencia.nome}` : ''}
                </span>
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setFilaModal(false)}>✕</button>
            </div>

            {filaLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <span className="spinner" />
              </div>
            )}

            {!filaLoading && filaData && (
              <>
                {filaData.cicloAtivo ? (
                  <>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                      Ciclo ativo: <strong style={{ color: 'var(--text)' }}>{cicloLabel[filaData.cicloAtivo]}</strong>
                      <span style={{ marginLeft: 10 }}>{filaData.data}</span>
                    </div>

                    {filaData.fila.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                        Fila vazia — roleta ainda não foi ativada para este ciclo.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                        {filaData.fila.map((entry, i) => (
                          <div
                            key={entry.corretorId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '10px 14px',
                              borderBottom: i < filaData.fila.length - 1 ? '1px solid var(--border-hairline)' : 'none',
                              background: entry.recebeuLeadEm ? 'rgba(212,175,55,0.06)' : 'transparent',
                            }}
                          >
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                              background: entry.posicao === 1 ? 'var(--gold-gradient)' : 'var(--bg-surface-hover)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.75rem', fontWeight: 700,
                              color: entry.posicao === 1 ? 'var(--text-on-gold)' : 'var(--text-muted)',
                            }}>
                              {entry.posicao}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.875rem', fontWeight: entry.posicao === 1 ? 600 : 400 }}>{entry.nome}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{entry.gerencia}</div>
                            </div>
                            {entry.recebeuLeadEm && (
                              <span className="badge badge-yellow" style={{ fontSize: '0.6875rem' }}>Lead recebido</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                    Nenhum ciclo ativo no momento.
                  </div>
                )}
              </>
            )}

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-ghost" style={{ fontSize: '0.8125rem' }} onClick={() => abrirFila(filaRoleta)}>
                ↺ Atualizar
              </button>
              <button className="btn btn-ghost" onClick={() => setFilaModal(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: criar roleta */}
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
                        <input type="checkbox" style={{ width: 'auto' }} checked={form.corretorIds.includes(c.id)} onChange={() => toggleCorretor(c.id)} />
                        {c.nome}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <span className="spinner" /> : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: editar roleta */}
      {editModal && (
        <div className="modal-overlay" onClick={() => { setEditModal(false); setDesativados(new Set()) }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Editar roleta</span>
              <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => { setEditModal(false); setDesativados(new Set()) }}>✕</button>
            </div>
            <form onSubmit={salvarEditar}>
              <div className="form-group">
                <label>Nome</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required autoFocus />
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
                        <input type="checkbox" style={{ width: 'auto' }} checked={form.corretorIds.includes(c.id)} onChange={() => toggleCorretor(c.id)} />
                        {c.nome}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {(form.tipo === 'gerencia' || form.tipo === 'diretoria') && (
                <div className="form-group">
                  <label>Corretores ativos na roleta</label>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                    Desmarque para impedir que o corretor receba leads temporariamente, sem removê-lo da empresa.
                  </p>
                  <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, padding: 8 }}>
                    {corretoresParaEditar().map((c) => (
                      <label key={c.corretorId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', color: 'var(--text)' }}>
                        <input
                          type="checkbox"
                          style={{ width: 'auto' }}
                          checked={!desativados.has(c.corretorId)}
                          onChange={() => toggleDesativado(c.corretorId)}
                        />
                        {c.nome}
                        {desativados.has(c.corretorId) && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(inativo)</span>}
                      </label>
                    ))}
                    {corretoresParaEditar().length === 0 && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nenhum corretor encontrado.</p>
                    )}
                  </div>
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => { setEditModal(false); setDesativados(new Set()) }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <span className="spinner" /> : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
