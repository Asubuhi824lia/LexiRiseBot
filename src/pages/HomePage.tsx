import { Typography } from 'antd'

const { Title, Paragraph } = Typography

export function HomePage() {
  return (
    <section>
      <Title level={1}>LexiRiseBot</Title>
      <Paragraph type="secondary">
        Бот для ежедневной практики слов: короткие сессии, карточки и проверка перевода.
      </Paragraph>
    </section>
  )
}
