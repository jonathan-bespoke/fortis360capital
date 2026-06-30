'use client'

import { useState } from 'react'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/auth/esqueci-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    setEnviado(true)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 360 }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Recuperar senha</div>

        {enviado ? (
          <div className="alert alert-success">
            Se o email estiver cadastrado, você receberá um link para redefinir a senha em breve.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email cadastrado</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Enviar link'}
            </button>
          </form>
        )}

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <a href="/login" style={{ fontSize: 13 }}>Voltar ao login</a>
        </div>
      </div>
    </div>
  )
}
