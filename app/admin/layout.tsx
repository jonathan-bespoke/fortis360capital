import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import Navbar from '@/components/layout/Navbar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') redirect('/login')
  if (!(session.user as any)?.senhaTrocada) redirect('/trocar-senha')

  return (
    <>
      <Navbar />
      <main className="main">{children}</main>
    </>
  )
}
