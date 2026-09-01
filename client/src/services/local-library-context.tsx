import { createContext, useContext, type ReactNode } from 'react'
import type {
  LocalLibrarySnapshot,
} from './local-library'

const LocalLibraryContext = createContext<LocalLibrarySnapshot | null>(null)

type LocalLibraryProviderProps = {
  library: LocalLibrarySnapshot
  children: ReactNode
}

export function LocalLibraryProvider({
  library,
  children,
}: LocalLibraryProviderProps) {
  return (
    <LocalLibraryContext.Provider value={library}>
      {children}
    </LocalLibraryContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLocalLibrary() {
  const library = useContext(LocalLibraryContext)

  if (!library) {
    throw new Error('当前页面没有可用的本地素材库。')
  }

  return library
}
