import { useEffect, useState } from 'react'
import { useApi } from '../../api/ApiContext'
import { errorMessage, type Person } from '../../api/types'

export type PeopleState =
  | { status: 'loading' }
  | { status: 'ready'; people: Person[] }
  | { status: 'error'; error: string }

export function usePeople(): PeopleState {
  const api = useApi()
  const [state, setState] = useState<PeopleState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    api.getPeople(controller.signal).then(
      (people) => setState({ status: 'ready', people }),
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ status: 'error', error: errorMessage(error) })
      },
    )
    return () => controller.abort()
  }, [api])

  return state
}
