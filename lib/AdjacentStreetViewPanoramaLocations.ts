/*
Determines the adjacent panoramas that are to the left and to the right 
of a given panorama.

Each panorama has a property named links, which is an array of link
objects. Links could contain 0 or up to 4 link objects with each 
representing an adjacent panorama that is in front of, to the right of,
to the back of, or to the left of the given panorama.

The link object has three properties named id, heading, and description. 
The heading property gives some clue as to whether the corresponding
adjacent panorama is located in front of, to the right of, to the back 
of, or to the left of the subject panorama location.

Using activeHeading, the heading from the main panorama point to map 
center point, we compute the parameter headings, parameterHeadings, 
such that: 
    parameterHeadings[0] == activeHeading + 45, 
    parametersHeadings[1] == parametersHeadings[0] + 90 * [1],
    parametersHeadings[2] == parametersHeadings[0] + 90 * [2],
    parametersHeadings[3] == parametersHeadings[0] + 90 * [3]

The following pairs of parameter headings represent the range of 
headings that correspond to one of four positions relative to 
the main panorama:
    parameterHeadings[0] and parameterHeadings[1] == _right of_ 
    parameterHeadings[1] and parameterHeadings[2] == _back of_ 
    parameterHeadings[0] and parameterHeadings[1] == _left of_ 
    parameterHeadings[0] and parameterHeadings[1] == _front of_

Sample return value:
    ["3baTzNhez12RsODEVyemAw", "NCuwqL9TEnxeVrH0qcezfQ"]
*/

class AdjacentStreetViewPanoramaLocations {
    private _mapCenterPoint: google.maps.LatLng 
    private _mainPanoramaPoint: google.maps.LatLng 
    private _adjacentPanoramaPanos: (string | null)[] = [] // [0] == left side panorama and [1] == right side

    constructor(
        initMapCenterPoint: google.maps.LatLng, 
        initMainPanoramaPoint: google.maps.LatLng, 
    ) {
        this._mapCenterPoint = initMapCenterPoint,
        this._mainPanoramaPoint = initMainPanoramaPoint
    }

    // Compute heading from panorama point to map center point 
    private panoramaToMapCenterHeading() {
        return google.maps.geometry.spherical.computeHeading(this._mainPanoramaPoint, this._mapCenterPoint)
    }

    // Compute parameter headings
    private parameterHeadings(activeHeading: number) {
        let parameterHeadings: number[] = []
        const maxNumHeadings = 4
        
        let parameterHeading = 0
        for (let i = 0; i < maxNumHeadings; i++) {
            if (i == 0) {
                parameterHeading = (activeHeading + 45) % 360
            } else {
                parameterHeading = (parameterHeading + 90) % 360
            }
            parameterHeadings.push(parameterHeading)
        }
        return parameterHeadings
    }

    // Convert heading to 0 to 360 degrees format
    private zeroTo360(heading: number) {
        return heading < 0 ? heading + 360 : heading
    }

    // Checks for adjacent panoramas to the left of main panoarama
    private isLeftLink(linkHeading: number, parameterHeadings: number[]) {
        const heading = this.zeroTo360(linkHeading)
        if ((parameterHeadings[2] + 90) > 360) {
            return (heading > parameterHeadings[2] && heading <= 360 
                || (heading >= 0 && heading < (parameterHeadings[2] + 90) % 360))
        }
        return (heading > parameterHeadings[2] && heading < parameterHeadings[2] + 90)
    }

    // Checks for adjacent panoramas to the right of main panoarama
    private isRightLink(linkHeading: number, parameterHeadings: number[]) {
        const heading = this.zeroTo360(linkHeading)
        if ((parameterHeadings[0] + 90) > 360) {
            return (heading > parameterHeadings[0] && heading <= 360 
                || (heading >= 0 && heading < (parameterHeadings[0] + 90) % 360))
        }
        return (heading > parameterHeadings[0] && (heading < parameterHeadings[0] + 90))
    }

    // Get panos for adjacent panoramas 
    async getLocations(): Promise<(string | null)[]> {
        let activePoint = this._mainPanoramaPoint
        let links: (google.maps.StreetViewLink | undefined)[] | undefined
    
        const streetViewService = new google.maps.StreetViewService()
        const request = {
            location: {lat: activePoint.lat(), lng: activePoint.lng()},
            radius: 100,
            source: google.maps.StreetViewSource.OUTDOOR
        }
        const result = await streetViewService.getPanorama(request)
            
        if (result == null) {
            return this._adjacentPanoramaPanos
        }
            
        links = result.data.links
            
        if (links == null) { 
            throw new Error('Street View Links not found for this panorama')
        }

        const activeHeading = this.panoramaToMapCenterHeading()
        const parameterHeadings = this.parameterHeadings(activeHeading)
        
        for (let i = 0; i < links.length; i++) {
           if (links[i] == null) {
               continue
           }

           if (links[i]!.heading == null) {
               continue
           }
        
           if (this.isLeftLink(links[i]!.heading!, parameterHeadings)) {
               this._adjacentPanoramaPanos[0] = links[i]!.pano
           } else if (this.isRightLink(links[i]!.heading!, parameterHeadings)) {
               this._adjacentPanoramaPanos[1] = links[i]!.pano
           }
        }

        return this._adjacentPanoramaPanos
    }
}

export { AdjacentStreetViewPanoramaLocations }