'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    const res = await signIn('credentials', {
      email,
      password: senha,
      redirect: false,
    })

    setLoading(false)

    if (res?.error) {
      setErro('Email ou senha incorretos')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="login-wrap">
      <div className="card" style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <img src="/logo-square.png" alt="Fortis 360 Capital" style={{ height: 84, width: 'auto', objectFit: 'contain' }} />
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Roleta de Leads</div>
        </div>

        {erro && <div className="alert alert-error">{erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? <span className="spinner" /> : 'Entrar'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <a href="/esqueci-senha" style={{ fontSize: 13 }}>Esqueci minha senha</a>
        </div>
      </div>
    </div>
  )
}
