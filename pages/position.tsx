import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useCookies } from 'react-cookie'
import useClientError from '../hooks/useClientError'
import useGoogleMapsApi from '../hooks/useGoogleMapsApi'
import { Tracker } from '../components/Tracker'
import { MaxSessionsClient } from '../lib/MaxSessionsClient'

type ClientError = {
  endpoint: string,
  statusCode: string,
  status: boolean,
  errorTitle: string,
  errorMessage: string
}

type PanoramaConfig = {
  pano: string,
  heading:number,
  pitch: number,
  zoom: number
}

type PanoramaPanoResult = {
  pano: string,
  statusCode: google.maps.StreetViewStatus | undefined
}

enum PanoramaType {
  ACTIVE, ADJACENT
}






async function getPanoramaPoint(
  pano: string
): Promise<google.maps.LatLng | null | undefined> {
  let panoramaPoint: google.maps.LatLng | null | undefined

  const streetViewService = new google.maps.StreetViewService()
  const request = { pano: pano }

  try {
    await streetViewService.getPanorama(request, processSVData)
  } catch (e) {
    console.log('error', e)
  }
  
  async function processSVData(
    data: google.maps.StreetViewPanoramaData | null,
    status: google.maps.StreetViewStatus
  ): Promise<void> {
    if (status === 'OK') {
      const location = (data as google.maps.StreetViewPanoramaData).location as google.maps.StreetViewLocation
      
      if (location == null) {
        return
      }

      panoramaPoint = location.latLng
   
    }
  }

  return panoramaPoint
}






async function getPanoramaPano(
  mapCenterPoint: google.maps.LatLng,
  setClientError: (clientError: ClientError) => void
): Promise<PanoramaPanoResult> {
  let panoramaPanoResult: PanoramaPanoResult = { pano: '', statusCode: undefined}

  const streetViewService = new google.maps.StreetViewService()
  const request = {
    location: { lat: mapCenterPoint.lat(), lng: mapCenterPoint.lng() },
    radius: 100,
    source: google.maps.StreetViewSource.OUTDOOR
  }

  try {
    await streetViewService.getPanorama(request, processSVData)
  } catch (e) {
    setClientError({endpoint: e.endpoint, statusCode: e.code, status: true} as ClientError)
    console.log('error', e)
  }
  
  async function processSVData(
    data: google.maps.StreetViewPanoramaData | null,
    status: google.maps.StreetViewStatus
  ): Promise<void> {
    if (status === 'OK') {
      const location = (data as google.maps.StreetViewPanoramaData).location as google.maps.StreetViewLocation
      
      if (location == null) {
        return
      }

      panoramaPanoResult.pano = location.pano
      panoramaPanoResult.statusCode = status
    }
  }

  return panoramaPanoResult
}






async function initPanorama(
  panoramaType: PanoramaType, 
  panoramaRef: React.RefObject<HTMLDivElement>, 
  panoramaPano: string,
  mapCenterPoint: google.maps.LatLng,
  panoramaPoint: google.maps.LatLng,
  panoramaConfig: PanoramaConfig
 ) {
  let streetViewPanorama = {
    panorama: {} as google.maps.StreetViewPanorama,
    details: {
      pano: '',
      heading: 0,
      pitch: 0,
      zoom: 0
    }
  }

  let pano = panoramaPano
  let heading = 0 
  let pitch = 0 
  let zoom = 0

  // We need to check whether panorma config is not null, in case the user 
  // navigates back to this page.
  if (panoramaConfig == null || panoramaConfig.pano == '') {
    heading = google.maps.geometry.spherical.computeHeading(panoramaPoint, mapCenterPoint)
    pitch = 0
    zoom = 0.8 
  } else {
    heading = panoramaConfig.heading 
    pitch = panoramaConfig.pitch 
    zoom = panoramaConfig.zoom
  }
  
  const panorama = new google.maps.StreetViewPanorama(
    panoramaRef.current as HTMLElement,
    {
      pano: pano,
      pov: {
        heading: heading,
        pitch: pitch
      },
      zoom: zoom,
      motionTracking: false,
      motionTrackingControl: false,
      fullscreenControl: false,
      panControl: false,
      addressControl: false,
      linksControl: panoramaType == PanoramaType.ADJACENT ? false : true,
      imageDateControl: true
    }
  )

  streetViewPanorama.panorama = panorama
  streetViewPanorama.details.pano = pano
  streetViewPanorama.details.heading = heading
  streetViewPanorama.details.pitch = pitch
  streetViewPanorama.details.zoom = zoom

  return streetViewPanorama
}






function addListenerToPanorama(
  eventType: string, 
  panorama: google.maps.StreetViewPanorama,
  setPanoramaConfigs: (details: PanoramaConfig) => any,
) {
  switch(eventType) {
    case 'pano_changed': 
      panorama.addListener('pano_changed', processPanoChanged)
    case 'pov_changed': 
      panorama.addListener('pov_changed', processPovChanged)
    default:
      console.log('invalid event type')
  }

  // Callback function to listen for pano changes
  function processPanoChanged(): void {
    const newPano = panorama.getPano() // do I need this? i don't think pano changes if pov changes
    const newHeading = panorama.getPov().heading
    const newPitch = panorama.getPov().pitch
    const newZoom = panorama.getZoom()
    setPanoramaConfigs({ pano: newPano, heading: newHeading, pitch: newPitch, zoom: newZoom })
  }

  // Callback function to listen for pov changes
  function processPovChanged(): void {
    const newPano = panorama.getPano() // do I need this? i don't think pano changes if pov changes
    const newHeading = panorama.getPov().heading
    const newPitch = panorama.getPov().pitch
    const newZoom = panorama.getZoom()
    setPanoramaConfigs({ pano: newPano, heading: newHeading, pitch: newPitch, zoom: newZoom })
  }
}






function AdjustPositionPage() {
  const [clientError, setClientError] = useClientError(null)
  const router = useRouter()
  const [cookies, setCookie, removeCookie] = useCookies(['activePanoramaDetails', 'mapCenterPoint'])
  const google = useGoogleMapsApi()
  const [address, setAddress] = useState(cookies.address || '')
  const [mapCenterPoint, setMapCenterPoint] = useState<google.maps.LatLng>({lat: () => cookies.mapCenterPoint.lat, lng: () => cookies.mapCenterPoint.lng} as google.maps.LatLng) // hack because cannot store LatLng object cookie
  const activePanoramaRef = useRef<HTMLDivElement>(null)
  const [activePanoramaDetails, setActivePanoramaDetails] = useState<PanoramaConfig>(cookies.activePanoramaDetails || {pano: '', heading: 0, pitch: 0, zoom: 0})
  
  useEffect(() => {
    // We count each page load as the start of a new session for the purposes
    // of managing API usage costs
    async function handleSessions() {
      try {
        await MaxSessionsClient.decrementRemainingSessions()
      } catch (e) {
        console.log('e', e)
      }
    }
    handleSessions()
  }, [])

  useEffect(() => {
    if (!google) {
      return
    }
    
    async function init() {
      // Get panorama position
      const panoramaPanoResult = await getPanoramaPano(mapCenterPoint!, setClientError)
      
      if (panoramaPanoResult.statusCode != 'OK') {
        return
      }

      const panoramaPano = panoramaPanoResult.pano
      
      const newPanoramaPoint = await getPanoramaPoint(panoramaPano)
      
      if (newPanoramaPoint == null) {
        return
      }

      // Init panorama
      const streetViewPanorama = await initPanorama(
        PanoramaType.ACTIVE, 
        activePanoramaRef,
        panoramaPano,
        mapCenterPoint,
        newPanoramaPoint,
        activePanoramaDetails
      )

      addListenerToPanorama('pano_changed', streetViewPanorama.panorama, setActivePanoramaDetails)
      addListenerToPanorama('pov_changed', streetViewPanorama.panorama, setActivePanoramaDetails)
      // Update state
      setActivePanoramaDetails(streetViewPanorama.details)
    }
    init()
  }, [google])

  function handleClickNextButton(): void {
    setCookie('activePanoramaDetails', activePanoramaDetails)
    router.push({pathname: '/tune'})
  }

  function handleClickNewAddressButton(): void {
    router.push({pathname: '/'})
  }
  
  if (clientError.status) {
    return (
      <div className='w-full pt-12 md:w-11/12 lg:w-3/4 mx-auto'>
        {Tracker.logPageView('/tune')}
        <h1 className='pt-3 px-3 text-base'>{address}</h1>
        <section className='p-3 min-h-40'>
          <h1 className='pb-3 text-2xl text-black font-medium'>{clientError.errorTitle}</h1>
          <p className='pb-3'>{clientError.errorMessage}</p>
          <button 
            className={`${clientError.statusCode == 'ZERO_RESULTS' ? 'block' : 'hidden'} w-full rounded-md py-2 bg-gray-700 hover:bg-gray-900 text-white text-base font-bold hover:shadow-xl`}
            onClick={handleClickNewAddressButton}
          >
            Enter another address
          </button>
        </section>
      </div>
    )
  } else {
    return (
      <div className='w-full pt-12 md:w-11/12 lg:w-3/4 mx-auto'>
        {Tracker.logPageView('/position')}
        <h1 className='pt-3 px-3 text-base'>{address}</h1>
        <section className='p-3 min-h-40'>
          <h1 className='pb-3 text-2xl text-black font-medium'>Find the best point of view and press Next</h1>
          <ul className='px-4 pb-3 list-disc'>
            <li className='text-base text-black font-medium'>To move around, click on the control arrows</li>
            <li className='text-base text-black font-medium'>To zoom in and out, press the up and down tabs</li>
            <li className='text-base text-black font-medium'>To change the point of view, touch the screen and pan around</li>
          </ul>
        </section>

        <section className='p-3'>
          <div className='h-80 md:h-96' ref={activePanoramaRef}/>
        </section>
  
        <section className='p-3'>
          <button 
            className='w-full rounded-md py-3 bg-gray-700 hover:bg-gray-900 text-white text-base font-bold hover:shadow-xl'
            onClick={handleClickNextButton}
          >
            Next
          </button>
        </section>
      </div>
    )
  }
}

export default AdjustPositionPage