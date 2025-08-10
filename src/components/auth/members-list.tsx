import { InviteMemberDialog } from '@/components/auth/invite-member-dialog'
import { MemberCard } from '@/components/auth/member-card'
import type { Member as BaseMember } from 'better-auth/plugins'

type Member = BaseMember & {
  user: {
    id: string
    name: string
    email: string
    image: string | undefined
  }
}

type Props = {
  members: Member[]
  isOwner: boolean
  isAdmin: boolean
}

export function MembersList({ members, isOwner, isAdmin }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="font-heading font-semibold">Miembros</p>

        {(isOwner || isAdmin) && <InviteMemberDialog />}
      </div>

      <div className="flex flex-col gap-1.5">
        {members.map((member) => (
          <MemberCard isOwner={isOwner} key={member.id} member={member} />
        ))}
      </div>
    </div>
  )
}
