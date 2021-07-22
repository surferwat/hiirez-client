import { useState, useEffect, useCallback } from 'react'

type ClientError = {
    endpoint: string,
    statusCode: string,
    status: boolean,
    errorTitle?: string,
    errorMessage?: string,
    options?: {
        remainingSessions: number
    }
}

type Callback = (error: ClientError) => void






function useClientError(initial: ClientError | undefined | null): [ClientError, Callback] {
    const [error, setError] = useState(initial || {
        endpoint: '', 
        statusCode: 'OK', 
        status: false,
        errorTitle: '', 
        errorMessage: ''
    })

    const handleChange = useCallback((error: ClientError) => {
            setError(error)
        },[error])
    
    useEffect(() => {
        generateFallback()
    }, [error.status])

    function generateFallback() {
        let newErrorTitle = ''
        let newErrorMessage = ''
        switch(error.endpoint) {
            case 'STREETVIEW_GET_PANORAMA':
                switch(error.statusCode) {
                    case 'ZERO_RESULTS': 
                        newErrorTitle = 'Found zero results'
                        newErrorMessage = "Sorry, it looks like we couldn't find any results for that location. Please try another one. Thanks!"
                        setError(prevState => ({
                            ...prevState,
                            errorTitle: newErrorTitle, 
                            errorMessage: newErrorMessage
                        }))
                        break
                    default: 
                        newErrorTitle = 'Error code not handled yet'
                        newErrorMessage = "Sorry, something went wrong. Please send us an email describing what happened. Thanks!"
                        setError(prevState => ({
                            ...prevState,
                            errorTitle: newErrorTitle, 
                            errorMessage: newErrorMessage
                        }))
                }
                break
            case 'GEOCODER_GEOCODE':
                switch(error.statusCode) {
                    case 'ZERO_RESULTS': 
                        newErrorTitle = 'Found zero results'
                        newErrorMessage = "Sorry, it looks like we couldn't find any results for that location. Please try another one. Thanks!"
                        setError(prevState => ({
                            ...prevState,
                            errorTitle: newErrorTitle, 
                            errorMessage: newErrorMessage
                        }))
                        break
                    case 'OVER_QUERY_LIMIT':
                        newErrorTitle = 'Query limit reached'
                        newErrorMessage = "Sorry, it looks like we've reached the query limit for today. Please try again anytime after 5 minutes past midnight Pacific Time. Thanks!"
                        setError(prevState => ({
                            ...prevState,
                            errorTitle: newErrorTitle, 
                            errorMessage: newErrorMessage
                        }))
                        break
                    default: 
                        newErrorTitle = 'Error code not handled yet'
                        newErrorMessage = "Sorry, something went wrong. Please send us an email describing what happened. Thanks!"
                        setError(prevState => ({
                            ...prevState,
                            errorTitle: newErrorTitle, 
                            errorMessage: newErrorMessage
                        }))
                }
                break
            case 'MAX_SESSIONS':
                switch(error.statusCode) {
                    case 'OVER_SESSIONS_LIMIT':
                        newErrorTitle = 'Sessions limit reached'
                        newErrorMessage = "Sorry, it looks like we've reached the sessions limit for today. Please try again anytime after 5 minutes past midnight Pacific Time. Thanks!"
                        setError(prevState => ({
                            ...prevState,
                            errorTitle: newErrorTitle, 
                            errorMessage: newErrorMessage
                        }))
                        break
                    case 'ALMOST_OVER_SESSIONS_LIMIT': // This is not an actuall Google Maps Status Code. We defined it for our purposes.
                        newErrorTitle = 'Sessions limit almost reached'
                        newErrorMessage = `We are close to reaching the sessions limit for today. ${error.options ? error.options.remainingSessions : 'a few'} sessions currently remaining.`
                        break
                    default: 
                        newErrorTitle = 'Error code not handled yet'
                        newErrorMessage = "Sorry, something went wrong. Please send us an email describing what happened. Thanks!"
                        setError(prevState => ({
                            ...prevState,
                            errorTitle: newErrorTitle, 
                            errorMessage: newErrorMessage
                        }))
                }
                break
            default: 
                console.log('Endpoint not handled yet', error.endpoint)
        }
    }

    return [error, handleChange]
}

export default useClientError