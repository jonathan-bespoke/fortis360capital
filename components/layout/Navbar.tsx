'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useTheme } from '@/components/ThemeProvider'

const roleLinks: Record<string, { href: string; label: string }[]> = {
  admin: [
    { href: '/', label: 'Filas' },
    { href: '/admin', label: 'Usuários' },
    { href: '/admin/gerencias', label: 'Gerências' },
    { href: '/admin/roletas', label: 'Roletas' },
    { href: '/admin/campanhas', label: 'Campanhas' },
    { href: '/admin/logs', label: 'Logs' },
    { href: '/admin/config-tempo', label: 'Modo Teste' },
  ],
  gestor_trafego: [
    { href: '/', label: 'Filas' },
    { href: '/gestor/campanhas', label: 'Campanhas' },
    { href: '/gestor/roletas', label: 'Roletas' },
  ],
  auxiliar: [
    { href: '/', label: 'Filas' },
    { href: '/auxiliar', label: 'Painel da Roleta' },
  ],
  corretor: [
    { href: '/', label: 'Filas' },
    { href: '/corretor', label: 'Meu Ponto' },
  ],
}

const roleLabel: Record<string, string> = {
  admin: 'Administrador',
  gestor_trafego: 'Gestor de Tráfego',
  auxiliar: 'Auxiliar',
  corretor: 'Corretor',
}

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const [menuAberto, setMenuAberto] = useState(false)

  const role = (session?.user as any)?.role ?? ''
  const links = roleLinks[role] ?? []
  const nome = session?.user?.name ?? ''

  function fecharMenu() { setMenuAberto(false) }

  return (
    <>
      <nav className="nav">
        {/* Logo */}
        <Link href="/" className="nav-logo">
          <Image
            src="/logo-horizontal.png"
            alt="Fortis 360 Capital"
            height={28} width={160}
            style={{ objectFit: 'contain', height: 28, width: 'auto' }}
            priority
          />
        </Link>

        {/* Links desktop — centralizados */}
        <div className="nav-links">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link ${pathname === l.href ? 'active' : ''}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Direita: avatar + toggle + sair */}
        <div className="nav-right">
          {/* Avatar + nome + role */}
          <div className="nav-user">
            <div className="nav-avatar" aria-hidden="true">{initials(nome)}</div>
            <div className="nav-user-info">
              <span className="nav-user-name">{nome}</span>
              <span className="nav-user-role">{roleLabel[role]}</span>
            </div>
          </div>

          {/* Toggle tema */}
          <button
            className="theme-toggle"
            onClick={toggle}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>

          {/* Sair — desktop */}
          <button
            className="nav-logout nav-sair-desktop"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <span>Sair</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>

          {/* Hambúrguer — mobile */}
          {links.length > 0 && (
            <button
              className={`nav-hamburger${menuAberto ? ' active' : ''}`}
              onClick={() => setMenuAberto((v) => !v)}
              aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menuAberto}
            >
              <span />
              <span />
              <span />
            </button>
          )}
        </div>
      </nav>

      {/* Overlay mobile — full-screen */}
      <div
        className={`nav-overlay${menuAberto ? ' open' : ''}`}
        aria-hidden={!menuAberto}
        onClick={(e) => { if (e.target === e.currentTarget) fecharMenu() }}
      >
        <nav className="nav-overlay-links">
          {links.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-overlay-item${pathname === l.href ? ' active' : ''}`}
              style={{ transitionDelay: menuAberto ? `${0.06 + i * 0.06}s` : '0s' }}
              onClick={fecharMenu}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="nav-overlay-footer">
          <div className="nav-overlay-user">
            <div className="nav-avatar nav-avatar-lg">{initials(nome)}</div>
            <div className="nav-user-info">
              <span className="nav-user-name">{nome}</span>
              <span className="nav-user-role">{roleLabel[role]}</span>
            </div>
          </div>
          <button
            className="nav-logout nav-logout-full"
            onClick={() => { fecharMenu(); signOut({ callbackUrl: '/login' }) }}
          >
            <span>Sair da conta</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}
