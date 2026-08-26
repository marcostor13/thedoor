/** Los dos públicos de la casa: quien tiene sala y quien quiere entrar. */
export const SIGNUP_KINDS = ['venue', 'guest'] as const

export type SignupKind = (typeof SIGNUP_KINDS)[number]
