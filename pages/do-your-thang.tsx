import React, { useState, useEffect, useRef } from 'react'
import { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { useCookies } from 'react-cookie'
import { AdjacentStreetViewPanoramaLocations } from '../lib/AdjacentStreetViewPanoramaLocations'
import useClientError from '../hooks/useClientError'
import useGoogleMapsApi from '../hooks/useGoogleMapsApi'

type AdjacentPanoramaLocations = {
  panosAndPoints: {pano: string, point: google.maps.LatLng}[],
  count: number
}

type ClientError = {
  endpoint: string,
  statusCode: string,
  status: boolean,
  errorTitle: string,
  errorMessage: string
}

type MapDetails = {
  center: { lat: number, lng: number } | undefined,
  zoom: number | undefined,
}

type MapPositionResult = {
  location: google.maps.LatLng,
  locationType: google.maps.GeocoderLocationType | undefined,
  statusCode: google.maps.GeocoderStatus | undefined
}

type PanoramaDetails = {
  pano: string,
  heading:number,
  pitch: number,
  zoom: number
}

enum PanoramaOrientation {
  LeftOf = 'LEFTOF',
  FrontOf = 'FRONTOF',
  RightOf = 'RIGHTOF'
}

type PanoramaPanoResult = {
  pano: string,
  statusCode: google.maps.StreetViewStatus | undefined
}

enum PanoramaType {
  MAIN, ADJACENT
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
    await geocoder.geocode({placeId: placeId}, (results, status) => {
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
    setClientError({endpoint: e.endpoint, statusCode: e.code, status: true} as ClientError)
  }
  return mapPositionResult
}






function initMap(
  mapRef: React.RefObject<HTMLDivElement>, 
  mapPosition: MapPositionResult,
  setMapDetails: (details: MapDetails) => any,
): google.maps.Map { 
  const options = {
    center: { lat: mapPosition.location.lat(), lng: mapPosition.location.lng() },
    zoom: 17,
    fullscreenControl: false,
    mapTypeControl: false,
    streetViewControl: false
  }
  const map = new google.maps.Map(
    mapRef.current as HTMLElement, 
    options
  )
  
  setMapDetails({ center: options.center, zoom: options.zoom })
  
  map.addListener('center_changed', processCenterChanged) 

  function processCenterChanged(): void {
    const newCenter = map.getCenter()?.toJSON()
    const newZoom = map.getZoom()
    setMapDetails({ center: newCenter, zoom: newZoom })
  }
  
  return map
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
  mapCenterPoint: google.maps.LatLng | undefined,
  panoramaDetails: PanoramaDetails
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

  if (panoramaDetails == null || panoramaDetails.pano == '') {
    const panoramaPoint = await getPanoramaPoint(pano)
    if (panoramaPoint == null || mapCenterPoint == null) {
      return streetViewPanorama
      // throw error
    }
    heading = google.maps.geometry.spherical.computeHeading(panoramaPoint, mapCenterPoint)
    pitch = 0
    zoom = 0.8 
  } else {
    heading = panoramaDetails.heading 
    pitch = panoramaDetails.pitch 
    zoom = panoramaDetails.zoom
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
  setPanoramaDetails: (details: PanoramaDetails) => any,
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
    setPanoramaDetails({ pano: newPano, heading: newHeading, pitch: newPitch, zoom: newZoom })
  }

  // Callback function to listen for pov changes
  function processPovChanged(): void {
    const newPano = panorama.getPano() // do I need this? i don't think pano changes if pov changes
    const newHeading = panorama.getPov().heading
    const newPitch = panorama.getPov().pitch
    const newZoom = panorama.getZoom()
    setPanoramaDetails({ pano: newPano, heading: newHeading, pitch: newPitch, zoom: newZoom })
  }
}






async function getAdjacentPanoramaLocations(
  mapCenterPoint: google.maps.LatLng, 
  panoramaPoint: google.maps.LatLng
): Promise<AdjacentPanoramaLocations> {
  let adjacentPanoramas: AdjacentPanoramaLocations = { panosAndPoints: [{pano: '', point: {lat: () => 0, lng: () => 0} as google.maps.LatLng}], count: 0 }

  if (mapCenterPoint == null || panoramaPoint == null) {
    return adjacentPanoramas
  }

  try {
    const adjacentStreetViewPanoramaLocations = new AdjacentStreetViewPanoramaLocations(
      mapCenterPoint,
      panoramaPoint,
      PanoramaOrientation.FrontOf
    )
    adjacentPanoramas = await adjacentStreetViewPanoramaLocations.getLocations()
  } catch (e) {
    console.log(e)
  }

  return adjacentPanoramas
}






function AdjustPage(props: Props) {
  const [clientError, setClientError] = useClientError(null)
  const router = useRouter()
  const [cookies, setCookie, removeCookie] = useCookies(['placeId', 'mainPanoramaDetails', 'adjacent1PanoramaDetails', 'adjacent2PanoramaDetails', 'mapDetails'])
  const google = useGoogleMapsApi()
  const [placeId, setPlaceId] = useState(props.placeId)
  const mainPanoramaRef = useRef<HTMLDivElement>(null)
  const adjacent1Ref = useRef<HTMLDivElement>(null)
  const adjacent2Ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapCenterPoint, setMapCenterPoint] = useState<google.maps.LatLng | undefined>()
  const [mainPanoramaDetails, setMainPanoramaDetails] = useState<PanoramaDetails>(cookies.mainPanoramaDetails || {pano: '', heading: 0, pitch: 0, zoom: 0})
  const [adjacent1PanoramaDetails, setAdjacent1PanoramaDetails] = useState<PanoramaDetails>(cookies.adjacent1PanoramaDetails)
  const [adjacent2PanoramaDetails, setAdjacent2PanoramaDetails] = useState<PanoramaDetails>(cookies.adjacent2PanoramaDetails)
  const [mapDetails, setMapDetails] = useState<MapDetails>(cookies.mapDetails)

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
      
      const panoramaPanoResult = await getPanoramaPano(newMapCenterPoint!, setClientError)
      
      if (panoramaPanoResult.statusCode != 'OK') {
        return
      }

      const panoramaPano = panoramaPanoResult.pano
      const streetViewPanorama = await initPanorama(
        PanoramaType.MAIN, 
        mainPanoramaRef,
        panoramaPano,
        newMapCenterPoint,
        mainPanoramaDetails
      )

      addListenerToPanorama('pano_changed', streetViewPanorama.panorama, setMainPanoramaDetails)
      addListenerToPanorama('pov_changed', streetViewPanorama.panorama, setMainPanoramaDetails)

      // Initialize map 
      initMap(mapRef, mapPositionResult, setMapDetails)

      // Update state
      setMapCenterPoint(newMapCenterPoint)
      setMainPanoramaDetails(streetViewPanorama.details)
    }
    init()
  }, [google])

  useEffect(() => {
    if (!google) {
      return
    }
    
    async function init() {
      // Initialize and configure adjacent panoramas 
      const panoramaPoint = await getPanoramaPoint(mainPanoramaDetails.pano)
      const adjacentPanoramaLocations = await getAdjacentPanoramaLocations(mapCenterPoint!, panoramaPoint!)  
      
      if (adjacentPanoramaLocations.panosAndPoints[0]) {
        if (adjacentPanoramaLocations.panosAndPoints[0].pano != null) {
          const adjacent1Pano = adjacentPanoramaLocations.panosAndPoints[0].pano
          
          const streetViewPanorama = await initPanorama(
            PanoramaType.ADJACENT, 
            adjacent1Ref,
            adjacent1Pano, 
            mapCenterPoint,
            adjacent1PanoramaDetails
          )
          setAdjacent1PanoramaDetails(streetViewPanorama.details)
          addListenerToPanorama('pov_changed', streetViewPanorama.panorama, setAdjacent1PanoramaDetails)
        }
      }
      
      if (adjacentPanoramaLocations.panosAndPoints[1]) {
        if (adjacentPanoramaLocations.panosAndPoints[1].pano != null) {
          const adjacent2Pano = adjacentPanoramaLocations.panosAndPoints[1].pano
          
          const streetViewPanorama = await initPanorama(
            PanoramaType.ADJACENT, 
            adjacent2Ref,
            adjacent2Pano, 
            mapCenterPoint,
            adjacent2PanoramaDetails
          )
          setAdjacent2PanoramaDetails(streetViewPanorama.details)
          addListenerToPanorama('pov_changed', streetViewPanorama.panorama, setAdjacent2PanoramaDetails)
        }
      }
    }
    init()
  }, [mainPanoramaDetails.pano])

  function handleClickNextButton(): void {
    setCookie('placeId', placeId)
    setCookie('mainPanoramaDetails', mainPanoramaDetails)
    setCookie('adjacent1PanoramaDetails', adjacent1PanoramaDetails)
    setCookie('adjacent2PanoramaDetails', adjacent2PanoramaDetails)
    setCookie('mapDetails', mapDetails)

    router.push({pathname: '/download-it-yo'})
  }

  function handleClickNewAddressButton(): void {
    router.push({pathname: '/'})
  }

  if (clientError.status) {
    return (
      <div className='p-3 container mx-auto max-w-md'>
        <h1 className='text-2xl pb-3'>{clientError.errorTitle}</h1>
        <p className='pb-3'>{clientError.errorMessage}</p>
        <button 
          className={`w-full rounded-md py-2 bg-gray-900 text-white text-base font-bold hover:shadow-xl ${clientError.statusCode == 'ZERO_RESULTS' ? 'block' : 'hidden'}`}
          onClick={handleClickNewAddressButton}
        >
          Enter another address
        </button>
      </div>
    )
  }

  return (
    <div className='w-96 mx-auto'>
      <section className='p-3'>
        <h1 className='p-3 text-2xl text-black font-medium'>View from the front</h1>
        <div id='subject-map' className='h-80' ref={mainPanoramaRef}/>
      </section>
      
      <section className='p-3'>
        <h1 className='p-3 text-2xl text-black font-medium'>View from the left side</h1>
        <div id='subject-map' className='h-80' ref={adjacent1Ref}/>
      </section>

      <section className='p-3'>
        <h1 className='p-3 text-2xl text-black font-medium'>View from the right side</h1>
        <div id='subject-map' className='h-80' ref={adjacent2Ref}/>
      </section>

      <section className='p-3'>
        <h1 className='p-3 text-2xl text-black font-medium'>Map</h1>
        <div id='map' className='h-80' ref={mapRef}/>
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

export default AdjustPage






export const getServerSideProps: GetServerSideProps = async (context) => {
  const placeId = context.query.placeId
  
  return {
    props: {
      placeId: placeId
    }
  }
}