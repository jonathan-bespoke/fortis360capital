'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const roleLinks: Record<string, { href: string; label: string }[]> = {
  admin: [
    { href: '/admin', label: 'Usuários' },
    { href: '/admin/gerencias', label: 'Gerências' },
    { href: '/admin/roletas', label: 'Roletas' },
    { href: '/admin/campanhas', label: 'Campanhas' },
    { href: '/admin/logs', label: 'Logs' },
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
  const role = (session?.user as any)?.role ?? ''
  const links = roleLinks[role] ?? []

  return (
    <nav className="nav">
      <span className="nav-logo">Fortis360</span>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`nav-link ${pathname === l.href ? 'active' : ''}`}
        >
          {l.label}
        </Link>
      ))}
      <div className="nav-right">
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{session?.user?.name}</span>
        <button className="btn btn-ghost" onClick={() => signOut({ callbackUrl: '/login' })}>
          Sair
        </button>
      </div>
    </nav>
  )
}
