import Link from 'next/link'
export function BrandWordmark({ className = '' }: { className?: string }) {
 return <Link href="/" className={`literary-title whitespace-nowrap text-3xl text-studio-ink ${className}`} aria-label="shortstory.ink home">shortstory<span className="italic">.ink</span></Link>
}
