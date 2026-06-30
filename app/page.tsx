import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')

  const role = (session.user as any)?.role
  const senhaTrocada = (session.user as any)?.senhaTrocada

  if (!senhaTrocada) redirect('/trocar-senha')

  switch (role) {
    case 'admin': redirect('/admin')
    case 'gestor_trafego': redirect('/gestor')
    case 'auxiliar': redirect('/auxiliar')
    case 'corretor': redirect('/corretor')
    default: redirect('/login')
  }
}
