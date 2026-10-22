import HelpClient from './HelpClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Help & Support | CreatorStore',
  description: 'Find answers, troubleshoot issues, or get help from the CreatorStore team.',
}

export default async function HelpPage() {
  return <HelpClient />
}
