import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Nav from '../Nav'

const useIsMounted = () => {
    const [isMounted, setIsMounted] = useState(false)
    useEffect(() => {
      setIsMounted(true)
    }, [])
    return isMounted
}






function NavContainer() {
    // We need to check whether client has been rendered, otherwise, will get this
    // Nextjs message _Warning: Prop `href` did not match. Server: "/" Client: "/dashboard"_
    const router = useRouter()
    const isMounted = useIsMounted()
    const href = isMounted ? '/' : '/'

    function onClickInfoButton() {
        router.push({pathname: '/info'})
    }

    return (
        <Nav
            onClickInfoButton={onClickInfoButton}
            href={href}
        />
    )
}

export default NavContainer