export type UserRole = 'user' | 'admin'

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: string
}

export interface AuthCredentials {
  email: string
  password: string
}

export interface RegisterPayload extends AuthCredentials {
  name: string
}
