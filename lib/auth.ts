import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'

export async function getSession() {
  return getServerSession(authOptions)
}

export async function requireRole(roles: string[]) {
  const session = await getSession()
  if (!session?.user) return null
  if (!roles.includes((session.user as any).role as string)) return null
  return session
}

export function verifyCronSecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-cron-secret')
  return secret === process.env.CRON_SECRET
}

export function verifyApiKey(req: NextRequest): boolean {
  const key = req.headers.get('x-api-key')
  return key === process.env.WEBHOOK_API_KEY
}
