import axios, { AxiosRequestConfig } from 'axios'

class GeocodingUsageLimitClient {

    private async getRemainingRequests() {
        let requests = 0

        const url = `${process.env.NEXT_PUBLIC_HOST}/api/v0/geocoding-usage`
        const req: AxiosRequestConfig = {
            method: 'get',
            url: url,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }

        let res: any = {} // NOTE: hack, change type to AxiosResponse and declare properly
        try {
            res = await axios(req)
        } catch (e) {
            console.log(e)
            // handle error
        }
        
        if (res.status == 200) {
            requests = res.data.geocoding_usage.remaining_requests
        }
        
        return requests
    }

    static async decrementRemainingRequests() {
        const url = `${process.env.NEXT_PUBLIC_HOST}/api/v0/geocoding-usage?action=decrement`
        const req: AxiosRequestConfig = {
            method: 'put',
            url: url,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        }

        let res: any = {} // NOTE: hack, change type to AxiosResponse and declare properly
        try {
            res = await axios(req)
        } catch (e) {
            console.log(e)
            // handle error
        }
    }

    async checkRemainingRequests() {
        let isExceeded = false
        let isAlmostExceeded = false

        const remainingRequests = await this.getRemainingRequests()

        if (remainingRequests == 0 || remainingRequests == undefined) {
            isExceeded = true 
        } else if (remainingRequests <= 5) {
            isAlmostExceeded = true
        }

        return {
            isExceeded: isExceeded,
            isAlmostExceeded: isAlmostExceeded,
            remainingRequests: remainingRequests
        }
    }
}

export { GeocodingUsageLimitClient }