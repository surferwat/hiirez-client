import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useCookies } from 'react-cookie'
import axios, { AxiosRequestConfig } from 'axios'
import { Tracker } from '../components/Tracker'

type MapConfig = {
  center: { lat: number, lng: number },
  zoom: number,
  fullscreenControl: boolean,
  mapTypeControl: boolean,
  streetViewControl: boolean,
  mapTypeId?: string
}

type PanoramaDetails = {
  pano: string,
  heading:number,
  pitch: number,
  zoom: number
}






function convertZoomToFov(zoom: number): number {
  return 180 / Math.pow(2, zoom)
}






function preparePanoramaRequestUrl(
  panoramaConfig: PanoramaDetails,
  width: number,
  height: number,
): string {
  const base = 'https://maps.googleapis.com/maps/api/streetview'
  const size = `size=${width}x${height}`
  const pano = `pano=${panoramaConfig.pano}`
  const fov = `fov=${convertZoomToFov(panoramaConfig.zoom)}`
  const heading = `heading=${panoramaConfig.heading}`
  const pitch = `pitch=${panoramaConfig.pitch}`
  const key = `key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
  
  const parameters = [size, pano, fov, heading, pitch, key].join('&')
  const url = [base, parameters].join('?')
  
  return url
}






async function prepareMapRequestUrl(
  mapConfig: MapConfig,
  width: number,
  height: number,
): Promise<string> {
  const base = 'https://maps.googleapis.com/maps/api/staticmap'
  const size = `size=${width}x${height}`
  const center = `center=${mapConfig.center.lat},${mapConfig.center.lng}`
  const zoom = `zoom=${mapConfig.zoom}`
  const key = `key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
  const scale = `scale=2`
  const maptype = `maptype=${mapConfig.mapTypeId ? mapConfig.mapTypeId : 'roadmap'}`

  const parameters = [size, center, zoom, scale, key, maptype].join('&')
  const url = [base, parameters].join('?')

  const signedUrl = await signRequestUrl(url)

  
  return signedUrl
}






function removeDomain(url: string): string {
  return url.substring('https://maps.googleapis.com'.length)
}






function addDomain(url: string): string {
  return 'https://maps.googleapis.com'.concat(url)
}






async function signRequestUrl(
  unsignedUrl: string
): Promise<string> {
  const unsignedUrlStub = removeDomain(unsignedUrl)

  const url = `${process.env.NEXT_PUBLIC_HOST}/api/v0/signed-urls`
  const req: AxiosRequestConfig = {
    method: 'post',
    url: url,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    data: {unsigned_url_stub: unsignedUrlStub}
  }

  
  let signedUrlStub: string = ''
  try {
    const res = await axios(req)
    signedUrlStub = res.data.signed_url_stub
  } catch (e) {
    console.log(e)
    // handle error
  }

  const signedUrl = addDomain(signedUrlStub)
  return signedUrl
}






function DownloadPage() {
  const [cookies, setCookie, removeCookie] = useCookies(['panoramaConfigs', 'mapConfigs', 'placeId', 'activePanoramaDetails', 'mapCenterPoint'])
  const [panoramaConfigs, setPanoramaConfigs] = useState(cookies.panoramaConfigs)
  const [mapConfigs, setMapConfigs] = useState(cookies.mapConfigs)
  const [address, setAddress] = useState(cookies.address || '')
  const [panoramaUrls, setPanoramaUrls] = useState<string[]>([''])
  const [mapUrls, setMapUrls] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    // Set up configuration for panoramas
    const panoramaWidth = 640
    const panoramaHeight = 640
 
    // Initialize panorama urls
    let newPanoramaUrls = []
    for (let i = 0; i < panoramaConfigs.length; i++) {
      const url = preparePanoramaRequestUrl(panoramaConfigs[i], panoramaWidth, panoramaHeight)
      newPanoramaUrls.push(url)
    }

    // Store state
    setPanoramaUrls(newPanoramaUrls)

    // Set up configuration for maps
    const mapWidth = 300
    const mapHeight = 300

    async function handleMapRequestUrl() {
      // Initialize map urls
      let newMapUrls = []
      for (let i = 0; i < mapConfigs.length; i++) {
        const url = await prepareMapRequestUrl(mapConfigs[i], mapWidth, mapHeight)
        newMapUrls.push(url)
      }

      // Store state 
      setMapUrls(newMapUrls)
    }
    handleMapRequestUrl()
  },[])

  function handleClickNewAddressButton(): void {
    // Remove all cookies before starting over with a new address
    removeCookie('placeId')
    removeCookie('address')
    removeCookie('panoramaConfigs')
    removeCookie('mapConfigs')
    removeCookie('activePanoramaDetails')
    removeCookie('mapCenterPoint')
    
    router.push({pathname: '/'})
  }

  return (
    <div className='w-full md:w-3/4 mx-auto'>
      {Tracker.logPageView('/download-it-yo')}
      <h1 className='pt-3 px-3 text-base'>{address}</h1>
      <section className='p-3 h-32'>
        <h1 className='text-2xl text-black font-medium'>Click on an image and download it</h1>
      </section>

      <section className='p-3'>
        <div className='flex flex-wrap justify-center'>
          <a href={panoramaUrls[0]} rel='noreferrer' target='_blank' download>
            <img className='w-full md:w-80 lg:w-96 h-80 lg:h-96 my-2 sm:m-2 md:m-2' src={panoramaUrls[0]}/>
          </a>

          <a href={panoramaUrls[1]} rel='noreferrer' target='_blank' download>
            <img className='w-full md:w-80 lg:w-96 h-80 lg:h-96 my-2 sm:m-2 md:m-2' src={panoramaUrls[1]}/>
          </a>

          <a href={panoramaUrls[2]} rel='noreferrer' target='_blank' download>
            <img className='w-full md:w-80 lg:w-96 h-80 lg:h-96 my-2 sm:m-2 md:m-2' src={panoramaUrls[2]}/>
          </a>

          <a href={panoramaUrls[3]} rel='noreferrer' target='_blank' download>
            <img className='w-full md:w-80 lg:w-96 h-80 lg:h-96 my-2 sm:m-2 md:m-2' src={panoramaUrls[3]}/>
          </a>

          <a href={panoramaUrls[4]} rel='noreferrer' target='_blank' download>
            <img className='w-full md:w-80 lg:w-96 h-80 lg:h-96 my-2 sm:m-2 md:m-2' src={panoramaUrls[4]}/>
          </a>

          <a href={panoramaUrls[5]} rel='noreferrer' target='_blank' download>
            <img className='w-full md:w-80 lg:w-96 h-80 lg:h-96 my-2 sm:m-2 md:m-2' src={panoramaUrls[5]}/>
          </a>

          <a href={mapUrls[0]} rel='noreferrer' target='_blank' download>
            <img className='w-full md:w-80 lg:w-96 h-80 lg:h-96 my-2 sm:m-2 md:m-2' src={mapUrls[0]}/>
          </a>

          <a href={mapUrls[1]} rel='noreferrer' target='_blank' download>
            <img className='w-full md:w-80 lg:w-96 h-80 lg:h-96 my-2 sm:m-2 md:m-2' src={mapUrls[1]}/>
          </a>
        </div>
      </section>

      <section className='p-3'>
        <button 
          className='w-full rounded-md py-3 bg-gray-900 text-white text-base font-bold hover:shadow-xl'
          onClick={handleClickNewAddressButton}
        >
          Enter another address
        </button>
      </section>
    </div>
  )
}

export default DownloadPage
