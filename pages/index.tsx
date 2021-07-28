import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { GetServerSideProps } from 'next'
import { useCookies } from 'react-cookie'
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import useGoogleMapsApi from '../hooks/useGoogleMapsApi'
import { MaxSessionsClient } from '../lib/MaxSessionsClient'
import useClientError from '../hooks/useClientError'
import { Tracker } from '../components/Tracker'

type ClientError = {
  endpoint: string,
  statusCode: string,
  status: boolean,
  errorTitle?: string,
  errorMessage?: string
}

type SubscribeError = {
  status: boolean,
  message: string
}

type Subscribed = {
  status: boolean,
  message: string
}






function initAutocomplete(input: HTMLInputElement) {
  return new google.maps.places.Autocomplete(input)
}






function setAutocompleteFields(autocomplete: google.maps.places.Autocomplete, fields: string[]) {
  autocomplete.setFields(fields)
}






function addListenerToAutocomplete(
  autocomplete: google.maps.places.Autocomplete, 
  setAddress: (address: string | undefined) => void,
  setMapCenterPoint: (mapCenterPoint: google.maps.LatLng) => void
) {
  autocomplete.addListener('place_changed', () => {
    const newAddress = autocomplete.getPlace().formatted_address
    setAddress(newAddress)
    const newMapCenterPoint = autocomplete.getPlace().geometry?.location! // HACK: added _!_ operator to make work.
    setMapCenterPoint(newMapCenterPoint)
  })
}






function useHandleChange(initial: string): [string, (event: any)=> void] {
  const [value, setValue] = useState(initial)
  const handleChange = useCallback(
    (event) => {
        const val = event.target ? event.target.value : event
        setValue(val)
    },[])
  return [value, handleChange]
}






function checkMaxSessionsClientError(
  isExceeded: boolean, isAlmostExceeded: boolean, remainingSessions: number
) {
  let maxSessions = {
    endpoint: 'MAX_SESSIONS', 
    statusCode: 'OK', 
    status: false,
    options: {
      remainingSessions: 0
    }
  }

  if (isExceeded) {
    maxSessions.endpoint =  'MAX_SESSIONS', 
    maxSessions.statusCode = 'OVER_SESSIONS_LIMIT', 
    maxSessions.status = isExceeded,
    maxSessions.options.remainingSessions = remainingSessions
  } else if (isAlmostExceeded) {
    maxSessions.endpoint = 'MAX_SESSIONS', 
    maxSessions.statusCode = 'ALMOST_OVER_SESSIONS_LIMIT', 
    maxSessions.status = isAlmostExceeded,
    maxSessions.options.remainingSessions = remainingSessions
  }
  return maxSessions
}






function HomePage(props: {isExceeded: boolean, isAlmostExceeded: boolean, remainingSessions: number}) {
  const [clientError, setClientError] = useClientError(checkMaxSessionsClientError(props.isExceeded,props.isAlmostExceeded,props.remainingSessions))
  const google = useGoogleMapsApi()
  const router = useRouter()
  const [cookies, setCookie, removeCookie] = useCookies(['address','panoramaConfigs', 'mapConfigs', 'activePanoramaDetails', 'mapCenterPoint'])
  const [mapCenterPoint, setMapCenterPoint] = useState<google.maps.LatLng | undefined>()
  const [address, setAddress] = useState<string | undefined>()
  const [email, setEmail] = useHandleChange('')
  const [subscribed, setSubscribed] = useState<Subscribed>({status: false, message: 'not subscribed'})
  const [subscribeError, setSubscribeError] = useState<SubscribeError>({status: false, message: ''})
  const [remainingSessions, setRemainingSessions] = useState<number>(props.remainingSessions)

  useEffect(() => {
    if (!google) {
      return
    }
    const input = document.getElementById("pac-input") as HTMLInputElement
    const autocomplete = initAutocomplete(input)
    setAutocompleteFields(autocomplete, ['place_id','formatted_address','geometry'])
    addListenerToAutocomplete(autocomplete, setAddress, setMapCenterPoint)
  }, [google])

  const handleClickButton = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent> | React.KeyboardEvent<HTMLButtonElement>
  ) => {
    event.preventDefault()
    if (mapCenterPoint == null) {
      // prompt user to enter address again?
    } else {
        setCookie('mapCenterPoint', mapCenterPoint)
        setCookie('address', address)
        router.push({pathname: '/position'})
    }
  }
 
  useEffect(() => {
      // Reset and clean up any stored data from previous search
      removeCookie('mapCenterPoint')
      removeCookie('address')
      removeCookie('panoramaConfigs')
      removeCookie('mapConfigs')
      removeCookie('activePanoramaDetails')
      setSubscribed({status: false, message: 'not subscribed'})
      setSubscribeError({status: false, message: ''})
  }, [])

  useEffect(() => {
      setSubscribeError({ status: false, message: ''})
  }, [email])

  async function handleSubscribe(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    
    if (email.length < 1) {
      setSubscribeError({ status: true, message: 'email is required' })
      return
    } else if (email.indexOf('@') === -1 || email.indexOf('.') === -1) {
      setSubscribeError({ status: true, message: 'invalid email address format' })
      return
    }

    const url = `${process.env.NEXT_PUBLIC_HOST}/api/v0/subscribe`
    const req: AxiosRequestConfig = {
      method: 'post',
      url: url,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      data: {email: email}
    }

    let res: any = {} // NOTE: hack, change type to AxiosResponse and declare properly
    try {
      res = await axios(req)
    } catch (e) {
      console.log(e)
      // handle error
    }

    if (res.status == 200) {
      setSubscribed({ status: true, message: 'Thanks for subscribing!'})
    }
  }

  return (
    <div className='mx-auto'>
      {Tracker.logPageView('/')}
      <section className='flex h-96 mx-auto justify-center p-3 pt-24 bg-orange'>
        <form className="w-full max-w-md px-3 pt-4 pb-4 sm:pb-6 lg:pb-4 xl:pb-6 space-y-4">
          <div>
            <h2 className={`${remainingSessions ? 'block' : 'hidden'} pl-2 pb-2 text-sm`}>{remainingSessions} sessions remaining for today</h2>
            <div className='relative'>
              <svg width="20" height="20" fill="currentColor" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <path fillRule="evenodd" clipRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" />
              </svg>
              <input
                className='shadow-lg focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none w-full text-base text-black placeholder-gray-500 border border-gray-200 rounded-md py-3 pl-10'
                placeholder='Enter an address'
                id='pac-input' 
                type='text'
              />
            </div>
          </div>
          <button 
            className='w-full rounded-md py-3 disabled:opacity-50 bg-gray-700 hover:bg-gray-900 text-white text-base font-bold hover:shadow-xl z-0'
            onClick={handleClickButton}
            disabled={mapCenterPoint == null || (clientError.status && clientError.statusCode == 'OVER_QUERY_LIMIT')}
          >
            Next
          </button>
          <h2 className={`${clientError.status ? 'block' : 'hidden'} p-3 pl-2 text-sm`}>
            {clientError.errorMessage}
          </h2>
        </form>
      </section>

      <section className='flex p-3 py-6 justify-center'>
        <div className='max-w-4xl'>
          <div className='sm:grid sm:grid-cols-2 xl:grid xl:grid-cols-2'>
            <div>
              <h3 className='px-3 text-xl text-blue-600 font-medium'>Why hiirez</h3>
              <h1 className='p-3 text-2xl text-black font-medium'>A dedicated tool for deal hunters</h1>
            </div>
          </div>
          <h2 className='p-3 text-xl text-black'>
            Reduce the time spent searching for images of your subject property by 10x to less than a minute, especially
            if all you need is some context at the early stages of buying, selling, or leasing property.
          </h2>
        </div>
      </section>

      <section className='flex p-3 py-6 justify-center'>
        <div className='max-w-4xl'>
        <div className='sm:grid sm:grid-cols-2 xl:grid xl:grid-cols-2'>
          <div>
            <h3 className='px-3 text-xl text-blue-600 font-medium'>Designed for simplicity</h3>
            <h1 className='p-3 text-2xl text-black font-medium'>The world's most easy-to-use image factory for real assets</h1>
          </div>
        </div>

        <div className='md:grid md:grid-cols-3 lg:grid lg:grid-cols-3 xl:grid xl:grid-cols-3'>
          <div className='inline-block'>
            <div className='flex items-center p-3'>
              <div className='rounded-full h-8 w-8 flex items-center justify-center border bg-blue-600 text-white text-2xl font-bold'>1</div>
              <h2 className='pl-3 text-xl text-black font-bold'>Input the location</h2>
            </div>
            <p className='p-3 text-xl text-black'>
              Type in the address or the name of the subject property. Select a location 
              from the displayed search results.
            </p>
          </div>

          <div className='inline-block'>
            <div className='flex items-center p-3'>
              <div className='rounded-full h-8 w-8 flex items-center justify-center border bg-blue-600 text-white text-2xl font-bold'>2</div>
              <h2 className='pl-3 text-xl text-black font-bold'>Adjust the panorama</h2>
            </div>
            <p className='p-3 text-xl text-black'>
              Change the position, point of view, and field of view of the generated panoramas and maps to your liking. 
            </p>
          </div>

          <div className='inline-block'>
            <div className='flex items-center p-3'>
            <div className='rounded-full h-8 w-8 flex items-center justify-center border bg-blue-600 text-white text-2xl font-bold'>3</div>
              <h2 className='pl-3 text-xl text-black font-bold'>Download the images</h2>
            </div>
            <p className='p-3 text-xl text-black'>
              Click on the image and download it. 
            </p>
          </div>
        </div>
        </div>
      </section>

      <section className='flex p-3 py-6 justify-center'>
        <div className='max-w-4xl'>
        
        <h3 className='px-3 text-xl text-blue-600 font-medium'>Subscribe</h3>
        <h1 className='p-3 text-2xl text-black font-medium'>Stay in touch</h1>
        <h2 className='p-3 text-xl text-black'>
          Hiirez is just getting started. Features are in the works, so please subscribe 
          to stay up to date with the latest. Thanks!
        </h2>

        <div className={`p-3 space-y-3 md:space-x-2 lg:space-x-2 xl:space-x-2 ${subscribed.status ? 'hidden' : 'block'}`}>
          <input
              className={`md:w-80 ${subscribeError.status ? 'border-red-600' : 'border-gray-200'} focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none w-full text-base text-black placeholder-gray-500 border rounded-md py-3 pl-3`}
              placeholder='Email'
              onChange={setEmail} 
              value={email}
              type='text'
          />
          <button 
              className='w-full md:w-36 lg:w-36 xl:w-36 rounded-md py-3 bg-gray-700 hover:bg-gray-900 text-white text-base font-bold hover:shadow-xl'
              onClick={handleSubscribe}
          >
              Subscribe
          </button>
        </div>
        <div className={`${subscribed.status ? 'block' : 'hidden'}`}>
          <h2 className='p-3 text-xl text-green-500'>
            You're now subscribed!
          </h2> 
        </div>

        </div>
      </section>
     
    </div>
  )
}
  
export default HomePage

export const getServerSideProps: GetServerSideProps = async () => {
  const maxSessionsClient = new MaxSessionsClient()
  const result = await maxSessionsClient.checkRemainingSessions()
  
  return {
    props: {
      isExceeded: result.isExceeded,
      isAlmostExceeded: result.isAlmostExceeded,
      remainingSessions: result.remainingSessions
    }
  }
}