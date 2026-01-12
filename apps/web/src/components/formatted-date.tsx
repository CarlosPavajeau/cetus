import { type DateFormatterOptions, useDateFormatter } from 'react-aria'

type Props = {
  date: Date
  options?: DateFormatterOptions
}

const defaultOptions: DateFormatterOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
}

export const FormattedDate = ({ date, options = undefined }: Props) => {
  const formatter = useDateFormatter(options ?? defaultOptions)

  return <span>{formatter.format(date)}</span>
}
