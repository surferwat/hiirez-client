import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Header from '../Header'
import FooterContainer from '../FooterContainer'

type PageLayoutProps = {
    children: React.ReactNode
}

const useIsMounted = () => {
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])
  return isMounted
}






const PageLayout = ({ children }: PageLayoutProps) => {
  const isMounted = useIsMounted()
  const router = useRouter()

  if (router.pathname === '/' && isMounted) {
    return (
      <div className='flex flex-col min-h-screen'>
        <Header />
        <div className='mt-20 min-h-screen'>
            {children}
        </div>
        <FooterContainer />
      </div>
    )
  } else if (isMounted) {
    return (
      <div className='flex flex-col min-h-screen'>
        <Header />
        <div className='mt-20 min-h-screen'>
            {children}
        </div>
        <FooterContainer />
      </div>
    )
  } else {
    return null
  }
}

export default PageLayout
