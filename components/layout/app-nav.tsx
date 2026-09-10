"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
type NavItem = { href: string; label: string; matches?: string[] }
export function AppNav({ items }: { items: NavItem[] }) {
 const pathname = usePathname()
 return <nav aria-label="Main navigation" className="studio-nav text-sm text-studio-muted">{items.map(item => {
  const active = pathname === item.href || (item.href !== '/app/writer' && pathname.startsWith(`${item.href}/`)) || item.matches?.some(path => pathname === path || pathname.startsWith(`${path}/`))
  return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}>{item.label}</Link>
 })}</nav>
}
