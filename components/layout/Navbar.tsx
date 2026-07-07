'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useTheme } from '@/components/ThemeProvider'

const roleLinks: Record<string, { href: string; label: string }[]> = {
  admin: [
    { href: '/admin', label: 'Usuários' },
    { href: '/admin/gerencias', label: 'Gerências' },
    { href: '/admin/roletas', label: 'Roletas' },
    { href: '/admin/campanhas', label: 'Campanhas' },
    { href: '/admin/logs', label: 'Logs' },
    { href: '/admin/config-tempo', label: 'Modo Teste' },
  ],
  gestor_trafego: [
    { href: '/gestor/campanhas', label: 'Campanhas' },
    { href: '/gestor/roletas', label: 'Roletas' },
  ],
  auxiliar: [{ href: '/auxiliar', label: 'Painel da Roleta' }],
  corretor: [{ href: '/corretor', label: 'Meu Ponto' }],
}

export default function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const [menuAberto, setMenuAberto] = useState(false)
  const role = (session?.user as any)?.role ?? ''
  const links = roleLinks[role] ?? []

  function fecharMenu() { setMenuAberto(false) }

  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav-logo">
          <Image src="/logo-horizontal.png" alt="Fortis 360 Capital" height={28} width={160} style={{ objectFit: 'contain', height: 28, width: 'auto' }} priority />
        </Link>

        <div className="nav-right">
          {/* Links desktop */}
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

          <span className="nav-username">{session?.user?.name}</span>

          <button
            className="theme-toggle"
            onClick={toggle}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>

          {/* Hambúrguer — só mobile */}
          {links.length > 0 && (
            <button
              className="nav-hamburger"
              onClick={() => setMenuAberto((v) => !v)}
              aria-label="Menu"
            >
              <span style={{ transform: menuAberto ? 'rotate(45deg) translate(5px, 5px)' : undefined }} />
              <span style={{ opacity: menuAberto ? 0 : 1 }} />
              <span style={{ transform: menuAberto ? 'rotate(-45deg) translate(5px, -5px)' : undefined }} />
            </button>
          )}

          <button
            className="btn btn-ghost nav-sair-desktop"
            style={{ minHeight: 40, padding: '0 14px', fontSize: '0.8125rem' }}
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            Sair
          </button>
        </div>
      </nav>

      {/* Menu mobile */}
      {menuAberto && (
        <div className="nav-mobile-menu">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link ${pathname === l.href ? 'active' : ''}`}
              onClick={fecharMenu}
            >
              {l.label}
            </Link>
          ))}
          <div style={{ paddingTop: 8, borderTop: '1px solid var(--border-hairline)', marginTop: 4 }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', padding: '8px 8px 4px' }}>
              {session?.user?.name}
            </div>
            <button
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: 4 }}
              onClick={() => { fecharMenu(); signOut({ callbackUrl: '/login' }) }}
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </>
  )
}
