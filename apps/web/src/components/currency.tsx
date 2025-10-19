import { useNumberFormatter } from 'react-aria'

type Props = {
  value: number
  currency: string
}

export const Currency = ({ value, currency }: Props) => {
  const formatter = useNumberFormatter({
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  })

  return <span>{formatter.format(value)}</span>
}
