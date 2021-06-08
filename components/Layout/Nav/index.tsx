import React from 'react'
import Link from 'next/link'
import NavItemGroupContainer from '../NavItemGroupContainer'

type NavProps = {
    onClickInfoButton: () => void,
    href: string
}

function Nav({onClickInfoButton, href}: NavProps) {
    return (
        <nav className='fixed w-full bg-white z-40'>
        
        <div className='p-4 flex justify-between'>
            <div className='flex md:pl-3 lg:pl-3 xl:pl-3'>
                <Link href={href} passHref>
                    <a className='flex items-center'>
                        <span className='text-3xl text-black font-bold'>fanddly</span>
                    </a>
                </Link>
                <span className='flex items-center pl-3 text-sm text-gray-500'>v1.0.7</span>    
            </div>
            {/* <div className='hidden md:block'>
                <ul className="flex space-x-2">
                    <NavItemGroupContainer />
                </ul>
            </div> */}
            {/* <div className='-mr-3 flex md:hidden'>
                <button className='inline-flex items-center justify-center p-2 rounded' onClick={onClickInfoButton}>
                    <svg xmlns='http://www.w3.org/2000/svg' className='block h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                    </svg>
                </button> 
            </div> */}
        </div>
        
        </nav>
    )
}

export default Nav