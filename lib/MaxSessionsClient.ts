import axios, { AxiosRequestConfig } from 'axios'

class MaxSessionsClient {

    private async getRemainingSessions() {
        let sessions = 0

        const url = `${process.env.NEXT_PUBLIC_HOST}/api/v0/max-sessions`
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
            sessions = res.data.max_sessions.remaining_sessions
        }
        
        return sessions
    }

    static async decrementRemainingSessions() {
        const url = `${process.env.NEXT_PUBLIC_HOST}/api/v0/max-sessions?action=decrement`
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

    async checkRemainingSessions() {
        let isExceeded = false
        let isAlmostExceeded = false

        const remainingSessions = await this.getRemainingSessions()

        if (remainingSessions == 0 || remainingSessions == undefined) {
            isExceeded = true 
        } else if (remainingSessions <= 5) {
            isAlmostExceeded = true
        }

        return {
            isExceeded: isExceeded,
            isAlmostExceeded: isAlmostExceeded,
            remainingSessions: remainingSessions
        }
    }
}

export { MaxSessionsClient }