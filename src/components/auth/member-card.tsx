import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BUILT_IN_ROLES } from '@/shared/constants'
import type { Member as BaseMember } from 'better-auth/plugins'
import { UserCog2, UserCogIcon, UserXIcon } from 'lucide-react'

type Member = BaseMember & {
  user: {
    id: string
    name: string
    email: string
    image: string | undefined
  }
}

type Props = {
  member: Member
  isOwner: boolean
}

export function MemberCard({ member, isOwner }: Props) {
  return (
    <Card className="py-2">
      <CardContent className="flex items-center justify-between gap-4 px-3">
        <div className="flex items-center gap-2">
          <div>
            <Avatar>
              <AvatarImage
                src={member.user.image ?? undefined}
                alt={member.user.name}
              />
              <AvatarFallback>{member.user.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-col">
              <p className="font-semibold text-sm">{member.user.name}</p>
              <p className="text-muted-foreground text-xs">
                {member.user.email}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {BUILT_IN_ROLES.find((role) => role.role === member.role)?.label ??
              'Desconocido'}
          </Badge>
          {isOwner && member.role !== 'owner' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-60 hover:opacity-100"
                >
                  <UserCog2 size={16} />
                  <span className="sr-only">Configurar miembro</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <UserCogIcon
                    size={16}
                    className="opacity-60"
                    aria-hidden="true"
                  />
                  Actualizar rol
                </DropdownMenuItem>

                <DropdownMenuItem variant="destructive">
                  <UserXIcon
                    size={16}
                    className="opacity-60"
                    aria-hidden="true"
                  />
                  Eliminar miembro
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
