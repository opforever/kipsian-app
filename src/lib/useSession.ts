import { useEffect, useState } from 'react'
import { getSession, subscribeSession } from './api'
import type { SessionUser } from './types'

export function useSession(): SessionUser | null {
  const [session, setLocal] = useState<SessionUser | null>(getSession())
  useEffect(() => subscribeSession(() => setLocal(getSession())), [])
  return session
}