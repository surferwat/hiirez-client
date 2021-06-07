import React from 'react'
import Link from 'next/link'

type NavItemProps = {
  href: string,
  isActive?: boolean,
  children: React.ReactNode
}

function NavItem({ href, isActive, children }: NavItemProps) {
  return (
    <li>
      <Link href={href} passHref>
        <a
          className={`block px-4 py-2 rounded ${isActive ? 'bg-amber-100 text-amber-700' : 'text-black text-base font-bold hover:text-green-400'}`}
        >
          {children}
        </a>
      </Link>
    </li>
  )
}

export default NavItem