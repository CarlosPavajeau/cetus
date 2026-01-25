import { type } from 'arktype'

export const signInWithEmailAndPasswordSchema = type({
  email: type('string.email').configure({
    message: 'El correo electrónico no es válido',
  }),
  password: type('string>=8').configure({
    message: 'La contraseña debe tener al menos 8 caracteres',
  }),
})

export const signUpWithEmailAndPasswordSchema = type({
  name: type('string>=2').configure({
    message: 'El nombre debe tener al menos 2 caracteres',
  }),
  email: type('string.email').configure({
    message: 'El correo electrónico no es válido',
  }),
  password: type('string>=8').configure({
    message: 'La contraseña debe tener al menos 8 caracteres',
  }),
})
