import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useCookies } from 'react-cookie'
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { Tracker } from '../components/Tracker'

type MapDetails = {
  center: google.maps.LatLng,
  zoom: number
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
  panoramaDetails: PanoramaDetails,
  width: number,
  height: number,
): string {
  const base = 'https://maps.googleapis.com/maps/api/streetview'
  const size = `size=${width}x${height}`
  const pano = `pano=${panoramaDetails.pano}`
  const fov = `fov=${convertZoomToFov(panoramaDetails.zoom)}`
  const heading = `heading=${panoramaDetails.heading}`
  const pitch = `pitch=${panoramaDetails.pitch}`
  const key = `key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
  
  const parameters = [size, pano, fov, heading, pitch, key].join('&')
  const url = [base, parameters].join('?')
  
  return url
}






async function prepareMapRequestUrl(
  mapDetails: MapDetails,
  width: number,
  height: number,
): Promise<string> {
  const base = 'https://maps.googleapis.com/maps/api/staticmap'
  const size = `size=${width}x${height}`
  const center = `center=${mapDetails.center.lat},${mapDetails.center.lng}`
  const zoom = `zoom=${mapDetails.zoom}`
  const key = `key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
  const scale = `scale=2`
  
  const parameters = [size, center, zoom, scale, key].join('&')
  const url = [base, parameters].join('?')

  const signedUrl = await signRequestUrl(url)

  
  return signedUrl
}






function removeDomain(url: string): string {
  return url.substring('https://maps.googleapis.com'.length)
}






function addDomain(url: string): string {
  return 'https://maps.googleapis.com' + url
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
  const [cookies, setCookie, removeCookie] = useCookies(['mainPanoramaDetails', 'adjacent1PanoramaDetails', 'adjacent2PanoramaDetails'])
  const [mainPanoramaUrl, setMainPanoramaUrl] = useState<string>()
  const [adjacent1PanoramaUrl, setAdjacent1PanoramaUrl] = useState<string>()
  const [adjacent2PanoramaUrl, setAdjacent2PanoramaUrl] = useState<string>()
  const [mapUrl, setMapUrl] = useState<string>()
  const router = useRouter()

  useEffect(() => {
    const panoramaWidth = 640
    const panoramaHeight = 640
    const mapWidth = 300
    const mapHeight = 300

    const mainPanoramaDetails = cookies.mainPanoramaDetails
    const mainUrl = preparePanoramaRequestUrl(mainPanoramaDetails, panoramaWidth, panoramaHeight)
    setMainPanoramaUrl(mainUrl)

    const adjacent1PanoramaDetails = cookies.adjacent1PanoramaDetails
    const adjacent1Url = preparePanoramaRequestUrl(adjacent1PanoramaDetails, panoramaWidth, panoramaHeight)
    setAdjacent1PanoramaUrl(adjacent1Url)

    const adjacent2PanoramaDetails = cookies.adjacent2PanoramaDetails
    const adjacent2Url = preparePanoramaRequestUrl(adjacent2PanoramaDetails, panoramaWidth, panoramaHeight)
    setAdjacent2PanoramaUrl(adjacent2Url)

    async function handleMapRequestUrl() {
      const mapDetails = cookies.mapDetails
      const mapUrl = await prepareMapRequestUrl(mapDetails, mapWidth, mapHeight)
      setMapUrl(mapUrl)
    } 
    handleMapRequestUrl()
  },[])

  function handleClickNewAddressButton(): void {
    removeCookie('placeId')
    removeCookie('mainPanoramaDetails')
    removeCookie('adjacent1PanoramaDetails')
    removeCookie('adjacent2PanoramaDetails')
    removeCookie('mapDetails')
    
    router.push({pathname: '/'})
  }

  return (
    <div className='w-96 mx-auto'>
      {Tracker.logPageView('/download-it-yo')}
      <section className='p-3'>
        <h1 className='p-3 text-2xl text-black font-medium'>View from the front side</h1>
        <a href={mainPanoramaUrl} download>
          <img id='main-url' className='h-80 w-full' src={mainPanoramaUrl}/>
        </a>
      </section>

      <section className='p-3'>
        <h1 className='p-3 text-2xl text-black font-medium'>View from the left side</h1>
        <a href={adjacent1PanoramaUrl} download>
          <img id='adjacent-1-url' className='h-80 w-full' src={adjacent1PanoramaUrl}/>
        </a>
      </section>

      <section className='p-3'>
        <h1 className='p-3 text-2xl text-black font-medium'>View from the right side</h1>
        <a href={adjacent2PanoramaUrl} download>
          <img id='adjacent-2-url' className='h-80 w-full' src={adjacent2PanoramaUrl}/>
        </a>
      </section>

      <section className='p-3'>
        <h1 className='p-3 text-2xl text-black font-medium'>Map</h1>
        <a href={mapUrl} download>
          <img id='map' className='h-80 w-full' src={mapUrl}/>
        </a>
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
