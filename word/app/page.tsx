// app/page.tsx ✅ 正确
import { redirect } from 'next/navigation'

export default function HomePage() {
  redirect('/word')
}