import { useState, useEffect } from 'react'
import { Loader } from "@googlemaps/js-api-loader"

function useGoogleMapsApi() {
    const [api, setApi] = useState()
  
    useEffect(() => {
        if ((window as any).google) {
            setApi((window as any).google)
            return
        }
        
        const loader = new Loader({
            apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
            version: 'beta',
            libraries: ['places', 'geometry'],
            
        })
        
        loader
            .load()
            .then(() => {
                setApi((window as any).google)
            })
    }, [])
    
    return api
}

export default useGoogleMapsApi