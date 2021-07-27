import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useCookies } from 'react-cookie'
import { AdjacentStreetViewPanoramaLocations } from '../lib/AdjacentStreetViewPanoramaLocations'
import useClientError from '../hooks/useClientError'
import useGoogleMapsApi from '../hooks/useGoogleMapsApi'
import { Tracker } from '../components/Tracker'

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

type MapConfig = {
  center: { lat: number, lng: number },
  zoom: number,
  fullscreenControl: boolean,
  mapTypeControl: boolean,
  streetViewControl: boolean,
  mapTypeId?: string
}






function initMap(
  mapRef: React.RefObject<HTMLDivElement>, 
  mapConfig: MapConfig
): google.maps.Map { 
  const map = new google.maps.Map(
    mapRef.current as HTMLElement, 
    mapConfig
  )
  return map
}






function addListenerToMap(
  map: google.maps.Map,
  setMapConfigs: (configs: any) => any,
  index: number
) {
  map.addListener('center_changed', processCenterChanged) 

  function processCenterChanged(): void {
    const newCenter = map.getCenter()?.toJSON()
    const newZoom = map.getZoom()
    setMapConfigs((prevConfigs: PanoramaConfig[]) => {
      return prevConfigs.map((config,i) => {
      if (i === index) {
        return { center: newCenter, zoom: newZoom }
      }
      return config
    })})
  }
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






async function initPanorama(
  panoramaRef: React.RefObject<HTMLDivElement>,
  panoramaConfig: PanoramaConfig,
 ) {
  const panorama = new google.maps.StreetViewPanorama(
    panoramaRef.current as HTMLElement,
    {
      pano: panoramaConfig.pano,
      pov: {
        heading: panoramaConfig.heading,
        pitch: panoramaConfig.pitch
      },
      zoom: panoramaConfig.zoom,
      motionTracking: false,
      motionTrackingControl: false,
      fullscreenControl: false,
      panControl: false,
      addressControl: false,
      linksControl: false,
      imageDateControl: true
    }
  )
  return panorama
}






function addListenerToPanorama(
  eventType: string, 
  panorama: google.maps.StreetViewPanorama,
  setPanoramaConfigs: (configs: any) => any,
  index: number
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
    setPanoramaConfigs((prevConfigs: PanoramaConfig[]) => {
      return prevConfigs.map((config,i) => {
      if (i === index) {
        return { pano: newPano, heading: newHeading, pitch: newPitch, zoom: newZoom }
      }
      return config
    })})
  }

  // Callback function to listen for pov changes
  function processPovChanged(): void {
    const newPano = panorama.getPano() // do I need this? i don't think pano changes if pov changes
    const newHeading = panorama.getPov().heading
    const newPitch = panorama.getPov().pitch
    const newZoom = panorama.getZoom()
    setPanoramaConfigs((prevConfigs: PanoramaConfig[]) => {
      return prevConfigs.map((config,i) => {
      if (i === index) {
        return { pano: newPano, heading: newHeading, pitch: newPitch, zoom: newZoom }
      }
      return config
    })})
  }
}






async function getAdjacentPanoramaLocations(
  mapCenterPoint: google.maps.LatLng, 
  panoramaPoint: google.maps.LatLng
): Promise<(string | null)[]> {
  let adjacentPanoramas: (string | null)[] = ['']

  if (mapCenterPoint == null || panoramaPoint == null) {
    return adjacentPanoramas
  }

  try {
    const adjacentStreetViewPanoramaLocations = new AdjacentStreetViewPanoramaLocations(
      mapCenterPoint,
      panoramaPoint,
    )
    adjacentPanoramas = await adjacentStreetViewPanoramaLocations.getLocations()
  } catch (e) {
    console.log('error', e)
  }

  return adjacentPanoramas
}






async function getHeading(pano: string, mapCenterPoint: google.maps.LatLng) {
  let heading = 0
  const panoramaPoint = await getPanoramaPoint(pano)
  
  if (panoramaPoint != null) {
    heading = google.maps.geometry.spherical.computeHeading(panoramaPoint, mapCenterPoint)
  }
  return heading
}






function initRefs(numRefs: number) {
  let refs = []
  for (let i = 0; i < numRefs; i++) {
    const ref = useRef<HTMLDivElement>(null)
    refs.push(ref)
  }
  return refs
}






function AdjustPage() {
  const [clientError, setClientError] = useClientError(null)
  const router = useRouter()
  const [cookies, setCookie, removeCookie] = useCookies(['activePanoramaDetails', 'panoramaConfigs', 'mapConfigs', 'mapCenterPoint'])
  const google = useGoogleMapsApi()
  const [address, setAddress] = useState(cookies.address || '')
  const panoramaRefs = initRefs(6)
  const mapRefs = initRefs(2)
  const [mapCenterPoint, setMapCenterPoint] = useState<google.maps.LatLng | undefined>({lat: () => cookies.mapCenterPoint.lat, lng: () => cookies.mapCenterPoint.lng} as google.maps.LatLng) // hack because cannot store LatLng object cookie
  const [activePanoramaDetails, setActivePanoramaDetails] = useState<PanoramaConfig>(cookies.activePanoramaDetails || {pano: '', heading: 0, pitch: 0, zoom: 0})
  const [panoramaConfigs, setPanoramaConfigs] = useState<PanoramaConfig[]>(cookies.panoramaConfigs)
  const [mapConfigs, setMapConfigs] = useState<MapConfig[]>(cookies.mapConfigs)

  useEffect(() => {
    if (!google) {
      return
    }

    async function init() {
      // Find adjacent panoramas 
      const activePanoramaPoint = await getPanoramaPoint(activePanoramaDetails.pano)
      const adjacentPanoramaPanos = await getAdjacentPanoramaLocations(mapCenterPoint!, activePanoramaPoint!)  
      
      // Set up list of panorams to be configured
      const panos = [activePanoramaDetails.pano]
      for (let i = 0; i < adjacentPanoramaPanos.length; i++) {
          panos.push(adjacentPanoramaPanos[i]!)
      }
      let newPanoramaConfigs = [] // in total 6 panoramas should be configured

      // Configure user adjusted panoramas
      const userOptions = {
        pitch: activePanoramaDetails.pitch,
        zoom: activePanoramaDetails.zoom
      }

      for (let i = 0; i < panos.length; i++) {
        const config = {
          pano: panos[i],
          heading: await getHeading(panos[i], mapCenterPoint!),
          pitch: userOptions.pitch,
          zoom: userOptions.zoom
        }
        newPanoramaConfigs.push(config)
      }
      
      // Configure as is panoramas
      const asIsOptions = {
        pitch: 0,
        zoom: 0.8
      }

      for (let i = 0; i < panos.length; i++) {
        const config: PanoramaConfig = {
          pano: panos[i],
          heading: newPanoramaConfigs[i].heading,
          pitch: asIsOptions.pitch,
          zoom: asIsOptions.zoom
        }
        newPanoramaConfigs.push(config)
      }

      // Store state of configs
      setPanoramaConfigs(newPanoramaConfigs)
      
      // Initialize panoramas
      let panoramas = []
      for (let i = 0; i < newPanoramaConfigs.length; i++) {
        const panorama = await initPanorama(
          panoramaRefs[i],
          newPanoramaConfigs[i]
        )
        addListenerToPanorama('pano_changed', panorama, setPanoramaConfigs, i)
        addListenerToPanorama('pov_changed', panorama, setPanoramaConfigs, i)
        panoramas.push(panorama)
      }

      // Configure as is maps
      const asIsOptionsMaps = {
        center: { lat: mapCenterPoint!.lat(), lng: mapCenterPoint!.lng() },
        zoom: 17,
        fullscreenControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        rotateControl: false
      }

      let newMapConfigs = []
      newMapConfigs.push(asIsOptionsMaps)
      newMapConfigs.push({...asIsOptionsMaps, mapTypeId: 'satellite'})

      // Store state of configs
      setMapConfigs(newMapConfigs)

      // Initialize maps
      const mapRoad = initMap(mapRefs[0], newMapConfigs[0])
      addListenerToMap(mapRoad, setMapConfigs, 0)
      const mapSatellite = initMap(mapRefs[1], newMapConfigs[1])
      addListenerToMap(mapSatellite, setMapConfigs, 1)

    }
    init()
  }, [google])

  function handleClickNextButton(): void {
    setCookie('activePanoramaDetails', activePanoramaDetails)
    setCookie('panoramaConfigs', panoramaConfigs)
    setCookie('mapConfigs', mapConfigs)

    router.push({pathname: '/download'})
  }

  function handleClickNewAddressButton(): void {
    router.push({pathname: '/'})
  }

  if (clientError.status) {
    return (
      <div className='w-full pt-12 md:w-3/4 mx-auto'>
        {Tracker.logPageView('/tune:error')}
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
      <div className='w-full md:w-11/12 lg:w-3/4 mx-auto'>
        {Tracker.logPageView('/tune')}
        <h1 className='pt-3  px-3 text-base'>{address}</h1>
        <section className='p-3 min-h-40'>
          <h1 className='pb-3 text-2xl text-black font-medium'>Make any adjustments and press Next</h1>
          <ul className='px-4 pb-3 list-disc'>
            <li className='text-l text-black font-medium'>To zoom in and out, press the up and down tabs</li>
            <li className='text-l text-black font-medium'>To change the point of view, touch the screen and pan around</li>
          </ul>
        </section>

        <section className='p-3'>
          <div className='flex flex-wrap justify-center'>
            <div className='w-full md:w-80 lg:w-96 h-80 lg:h-96 my-2 sm:m-2 md:m-2' ref={panoramaRefs[0]}/>
            <div className='w-full md:w-80 lg:w-96 h-80 lg:h-96 my-2 sm:m-2 md:m-2' ref={panoramaRefs[1]}/>
            <div className='w-full md:w-80 lg:w-96 h-80 lg:h-96 my-2 sm:m-2 md:m-2' ref={panoramaRefs[2]}/>
          
            <div className='w-full md:w-80 lg:w-96 h-80 lg:h-96 my-2 sm:m-2 md:m-2' ref={panoramaRefs[3]}/>
            <div className='w-full md:w-80 lg:w-96 h-80 lg:h-96 my-2 sm:m-2 md:m-2' ref={panoramaRefs[4]}/>
            <div className='w-full md:w-80 lg:w-96 h-80 lg:h-96 my-2 sm:m-2 md:m-2' ref={panoramaRefs[5]}/>

            <div className='w-full md:w-80 lg:w-96 h-80 lg:h-96 my-2 sm:m-2 md:m-2' ref={mapRefs[0]}/>
            <div className='w-full md:w-80 lg:w-96 h-80 lg:h-96 my-2 sm:m-2 md:m-2' ref={mapRefs[1]}/>
          </div>
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

export default AdjustPage