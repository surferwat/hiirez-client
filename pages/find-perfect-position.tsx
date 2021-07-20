import React, { useState, useEffect, useRef } from 'react'
import { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { useCookies } from 'react-cookie'
import { AdjacentStreetViewPanoramaLocations } from '../lib/AdjacentStreetViewPanoramaLocations'
import useClientError from '../hooks/useClientError'
import useGoogleMapsApi from '../hooks/useGoogleMapsApi'
import { Tracker } from '../components/Tracker'
import { GeocodingUsageLimitClient } from '../lib/GeocodingUsageLimitClient'

type ClientError = {
  endpoint: string,
  statusCode: string,
  status: boolean,
  errorTitle: string,
  errorMessage: string
}

type MapPositionResult = {
  location: google.maps.LatLng,
  locationType: google.maps.GeocoderLocationType | undefined,
  statusCode: google.maps.GeocoderStatus | undefined
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

type Props = {
  placeId: string
}






async function getMapPosition(
  placeId: string,
  setClientError: (clientError: ClientError) => void
): Promise<MapPositionResult> {
  let mapPositionResult: MapPositionResult = {
    location: { lat: () => 0, lng: () => 0} as google.maps.LatLng,
    locationType: undefined,
    statusCode: undefined
  }
  try {
    const geocoder = new google.maps.Geocoder()
    await geocoder.geocode({placeId: placeId}, async (results, status) => {
      if (status === 'OK') {
        if (results !== null) {
          if (results[0] !== null) {
            mapPositionResult.location = results[0].geometry.location
            mapPositionResult.locationType = results[0].geometry.location_type
            mapPositionResult.statusCode = status
          }
        }
      } 
    })
  } catch (e) {
    console.log('e',e)
    setClientError({endpoint: e.endpoint, statusCode: e.code, status: true} as ClientError)
  }

  try {
    await GeocodingUsageLimitClient.decrementRemainingRequests()
  } catch (e) {
    console.log('e', e)
  }
  
  return mapPositionResult
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






function AdjustPositionPage(props: Props) {
  const [clientError, setClientError] = useClientError(null)
  const router = useRouter()
  const [cookies, setCookie, removeCookie] = useCookies(['placeId', 'activePanoramaDetails', 'mapCenterPoint'])
  const google = useGoogleMapsApi()
  const [placeId, setPlaceId] = useState(props.placeId)
  const [address, setAddress] = useState(cookies.address || '')
  const activePanoramaRef = useRef<HTMLDivElement>(null)
  const [activePanoramaDetails, setActivePanoramaDetails] = useState<PanoramaConfig>(cookies.activePanoramaDetails || {pano: '', heading: 0, pitch: 0, zoom: 0})
  const [mapCenterPoint, setMapCenterPoint] = useState<google.maps.LatLng>()

  useEffect(() => {
    if (!google) {
      return
    }

    async function init() {
      
      // Get map position using place id
      const mapPositionResult = await getMapPosition(placeId, setClientError)
      
      if (mapPositionResult.statusCode != 'OK') {
        return
      }
      const newMapCenterPoint = mapPositionResult.location
      
      // Get panorama position
      const panoramaPanoResult = await getPanoramaPano(newMapCenterPoint!, setClientError)
      
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
        newMapCenterPoint,
        newPanoramaPoint,
        activePanoramaDetails
      )

      addListenerToPanorama('pano_changed', streetViewPanorama.panorama, setActivePanoramaDetails)
      addListenerToPanorama('pov_changed', streetViewPanorama.panorama, setActivePanoramaDetails)

      // Update state
      setActivePanoramaDetails(streetViewPanorama.details)
      setMapCenterPoint(newMapCenterPoint)
    }
    init()
  }, [google])

  function handleClickNextButton(): void {
    setCookie('placeId', placeId)
    setCookie('activePanoramaDetails', activePanoramaDetails)
    setCookie('mapCenterPoint', mapCenterPoint)

    router.push({pathname: '/do-your-thang-1'})
  }

  function handleClickNewAddressButton(): void {
    router.push({pathname: '/'})
  }

  if (clientError.status) {
    return (
      <div className='p-3 container mx-auto max-w-md'>
        {Tracker.logPageView('/do-your-thang')}
        <h1 className='text-2xl pb-3'>{clientError.errorTitle}</h1>
        <p className='pb-3'>{clientError.errorMessage}</p>
        <button 
          className={`${clientError.statusCode == 'ZERO_RESULTS' ? 'block' : 'hidden'} w-full rounded-md py-2 bg-gray-900 text-white text-base font-bold hover:shadow-xl`}
          onClick={handleClickNewAddressButton}
        >
          Enter another address
        </button>
      </div>
    )
  } else {
    return (
      <div className='w-full md:w-3/4 mx-auto'>
        {Tracker.logPageView('/find-perfect-position')}
        <h1 className='pt-3 px-3 text-base'>{address}</h1>
        <section className='p-3 min-h-40'>
          <h1 className='text-2xl text-black font-medium'>Find the best point of view and press Next</h1>
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
            className='w-full rounded-md py-3 bg-gray-900 text-white text-base font-bold hover:shadow-xl'
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






export const getServerSideProps: GetServerSideProps = async (context) => {
  const placeId = context.query.placeId
  
  return {
    props: {
      placeId: placeId
    }
  }
}