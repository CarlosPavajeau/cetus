import { env } from '@cetus/env/server'
import InviteUserEmail from '@/components/emails/invite-user-email'
import { resend } from '@/functions/resend'

type SendInvitationEmailData = {
  id: string
  email: string
  invitedByUsername: string
  invitedByEmail: string
  teamName: string
}

export async function sendInvitationEmail(data: SendInvitationEmailData) {
  const fromEmail = env.RESEND_FROM
  const appUrl = env.APP_URL

  if (!fromEmail) {
    throw new Error('From email not configured')
  }

  if (!appUrl) {
    throw new Error('App URL not configured')
  }

  const invitationLink = `${appUrl}/accept-invitation/${data.id}`

  await resend.emails.send({
    from: fromEmail,
    to: data.email,
    text:
      `Hola ${data.invitedByUsername},\n\n` +
      `Has sido invitado a unirte a nuestro equipo ${data.teamName} en Cetus.\n\n` +
      'Para aceptar la invitación, haz clic en el siguiente enlace:\n' +
      `${invitationLink}\n\n` +
      'Si tienes alguna pregunta, no dudes en contactarnos.\n\n' +
      'Saludos,\n' +
      'El equipo de Cetus',
    react: InviteUserEmail({
      invitedByUsername: data.invitedByUsername,
      invitedByEmail: data.invitedByEmail,
      teamName: data.teamName,
      inviteLink: invitationLink,
    }),
    subject: 'Has sido invitado a unirte a nuestro equipo',
  })
}
