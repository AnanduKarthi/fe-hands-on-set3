import { createContext, useContext } from 'react'
import { createMockApi, type BookingApi } from './mockApi'

/** One shared fake backend for the whole app. Tests pass their own via `ApiContext.Provider`. */
export const defaultApi: BookingApi = createMockApi()

export const ApiContext = createContext<BookingApi>(defaultApi)

export function useApi(): BookingApi {
  return useContext(ApiContext)
}
