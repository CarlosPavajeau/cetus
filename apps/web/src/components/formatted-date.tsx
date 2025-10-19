import { useDateFormatter } from 'react-aria'

type Props = {
  date: Date
}

export const FormattedDate = ({ date }: Props) => {
  const formatter = useDateFormatter({
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })

  return <span>{formatter.format(date)}</span>
}
