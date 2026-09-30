import Link from 'next/link'
export function BrandWordmark({ className = '', href = '/' }: { className?: string; href?: string }) {
 return <Link href={href} className={`literary-title whitespace-nowrap text-3xl text-studio-ink ${className}`} aria-label="shortstory.ink home">shortstory<span className="italic">.ink</span></Link>
}
