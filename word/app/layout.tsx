import BottomNav from './components/BottomNav'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="pb-20">
        {children}
        <BottomNav />
      </body>
    </html>
  )
}