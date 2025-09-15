"use client"
import Link from 'next/link'

export default function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--navbar-background)] text-[var(--navbar-foreground)] p-4 flex justify-between items-center border-b border-white-400">
            <Link href="/" className="text-xl font-bold tracking-wide">
                MYTH
            </Link>
            <div className="space-x-6 text-sm sm:text-base">
                <Link href="/groups" className="hover:text-[var(--navbar-hover)]">Groups</Link>
                <Link href="/auth" className="hover:text-[var(--navbar-hover)]">Auth</Link>
            </div>
        </nav>
    );
}