import { defaultProfile, normalizeProfile, PROFILE_KEY, type Profile } from '@/lib/profile'

type Changes = Record<string, { newValue?: unknown }>
/** O pedaço de `storage.local` que o Perfil usa. */
export interface ProfileArea {
  get(key: string): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
  onChanged?: { addListener(cb: (changes: Changes) => void): void; removeListener(cb: (changes: Changes) => void): void }
}

export interface ProfileStorage {
  load(): Promise<Profile>
  /** Ler → modificar → gravar, em fila: duas mudanças da mesma aba nunca se sobrepõem. */
  update(fn: (p: Profile) => Profile): Promise<Profile>
  /** Mudanças gravadas por qualquer aba (inclusive esta). */
  onChange(cb: (p: Profile) => void): () => void
}

const defaultArea = (): ProfileArea | undefined => {
  try {
    return (globalThis as { browser?: { storage?: { local?: ProfileArea } } }).browser?.storage?.local
  } catch {
    return undefined
  }
}

/**
 * Perfil em `storage.local` (Q-01): compartilhado por todas as abas e origens (CONQ-07).
 * Entre abas, a corrida fica restrita ao intervalo de um get/set; aceitamos essa perda mínima (design D7).
 * Sem storage (API ausente ou erro), o perfil vale só para a aba e a UI segue igual (D8).
 */
export function createProfileStorage(area: ProfileArea | undefined = defaultArea()): ProfileStorage {
  let memory = defaultProfile()
  let queue: Promise<unknown> = Promise.resolve()

  async function read(): Promise<Profile> {
    if (!area) return memory
    try {
      return normalizeProfile((await area.get(PROFILE_KEY))[PROFILE_KEY])
    } catch {
      area = undefined // storage negado: segue em memória a partir de agora
      return memory
    }
  }

  async function write(p: Profile): Promise<void> {
    memory = p
    try {
      await area?.set({ [PROFILE_KEY]: p })
    } catch {
      area = undefined
    }
  }

  return {
    load: () => (queue = queue.then(read)) as Promise<Profile>,
    update(fn) {
      const next = queue.then(async () => {
        const p = fn(await read())
        await write(p)
        return p
      })
      queue = next.catch(() => {})
      return next
    },
    onChange(cb) {
      const listener = (changes: Changes) => {
        if (PROFILE_KEY in changes) cb(normalizeProfile(changes[PROFILE_KEY]!.newValue))
      }
      try {
        area?.onChanged?.addListener(listener)
      } catch {
        return () => {}
      }
      return () => area?.onChanged?.removeListener(listener)
    },
  }
}
