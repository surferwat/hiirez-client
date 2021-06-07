import React from 'react'
import Link from 'next/link'

const Footer = () => {
  return (
    <footer className='mt-32'>
      <div className='px-3 pt-6 pb-3 bg-gray-50 md:px-9 lg:px-9 xl:px-9'>
        <div className='flex space-x-4 lg:space-x-12 xl:space-x-12'>
        <div className='p-3'>
          <h2 className='text-base text-gray-600 font-medium'>Resources</h2>
          <ul>
            <li>
              <a className='text-base text-gray-600 hover:text-gray-900' href={`mailto:email@fanddly.com`}>Email</a>
            </li>
            <li>
              <Link href="/privacy-policy" >
                <a className='text-base text-gray-600 hover:text-gray-900'>Privacy policy</a>
              </Link>
            </li>
          </ul>
        </div>
        </div>
        <aside className='p-3 text-base text-gray-400'>&#9400; 2021 fanddly</aside>
      </div>
    </footer>
  )
}

export default Footer
