import { redirect } from 'next/navigation'

export default function Home() {
  // The proxy handles auth redirects.
  // This page just acts as a fallback.
  redirect('/login')
}
