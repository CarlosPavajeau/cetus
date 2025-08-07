import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  pixelBasedPreset,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'

interface InviteUserEmailProps {
  invitedByUsername?: string
  invitedByEmail?: string
  teamName?: string
  inviteLink?: string
}

export const InviteUserEmail = ({
  invitedByUsername,
  invitedByEmail,
  teamName,
  inviteLink,
}: InviteUserEmailProps) => {
  const previewText = `${invitedByUsername} te invitó a colaborar en ${teamName}`

  return (
    <Html>
      <Head />
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
        }}
      >
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Preview>{previewText}</Preview>
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid p-[20px]">
            <Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">
              🎉 ¡Has sido invitado a <strong>{teamName}</strong>!
            </Heading>
            <Text className="text-[14px] text-black leading-[24px]">
              ¡Hola! 👋
            </Text>
            <Text className="text-[14px] text-black leading-[24px]">
              Tenemos excelentes noticias para ti.{' '}
              <strong>{invitedByUsername}</strong> te ha invitado a formar parte
              del equipo de <strong>{teamName}</strong> en{' '}
              <strong>Cetus</strong>.
            </Text>
            <Text className="text-[14px] text-black leading-[24px]">
              Como miembro del equipo, podrás:
            </Text>
            <Text className="ml-4 text-[14px] text-black leading-[24px]">
              • Gestionar productos y pedidos
              <br />• Colaborar con el equipo
              <br />• Acceder a herramientas exclusivas
              <br />• Contribuir al crecimiento de la tienda
            </Text>
            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-[#0139a9] px-6 py-4 text-center font-semibold text-[14px] text-white no-underline"
                href={inviteLink}
              >
                🚀 Aceptar invitación
              </Button>
            </Section>
            <Text className="text-center text-[12px] text-gray-600 leading-[20px]">
              Si tienes problemas con el botón, copia y pega este enlace en tu
              navegador:
            </Text>
            <Text className="break-all text-center text-[12px] leading-[20px]">
              <Link className="text-blue-600 no-underline" href={inviteLink}>
                {inviteLink}
              </Link>
            </Text>
            <Text className="mt-4 text-center text-[12px] text-gray-500 leading-[20px]">
              Invitado por: <strong>{invitedByUsername}</strong> ({' '}
              <Link
                className="text-blue-600 no-underline"
                href={`mailto:${invitedByEmail}`}
              >
                {invitedByEmail}
              </Link>
              )
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

InviteUserEmail.PreviewProps = {
  invitedByUsername: 'María González',
  invitedByEmail: 'maria.gonzalez@example.com',
  teamName: 'Tienda El Ejemplo',
  inviteLink: 'https://cetus.vercel.app/accept-invitation/abc123',
} as InviteUserEmailProps

export default InviteUserEmail
