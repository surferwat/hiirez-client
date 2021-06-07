const NUMBER_OF_ADJACENT_PANORAMAS = 2 // must be an even number

enum PanoramaOrientation {
    LeftOf = 'LEFTOF',
    FrontOf = 'FRONTOF',
    RightOf = 'RIGHTOF'
}

type AdjacentPanoramaLocations = {
    panosAndPoints: {pano: string, point: google.maps.LatLng}[],
    count: number
}

class AdjacentStreetViewPanoramaLocations {
    private _mapCenterPoint: google.maps.LatLng
    private _mainPanoramaPoint: google.maps.LatLng
    private _mainPanoramaOrientation: PanoramaOrientation = PanoramaOrientation.FrontOf // default is _FrontOf_
    private _adjacentPanoramaPanosAndPoints: {pano: string, point: google.maps.LatLng}[] = []

    constructor(
        initMapCenterPoint: google.maps.LatLng, 
        initMainPanoramaPoint: google.maps.LatLng, 
        initMainPanoramaOrientation: PanoramaOrientation,
    ) {
        this._mapCenterPoint = initMapCenterPoint,
        this._mainPanoramaPoint = initMainPanoramaPoint,
        this._mainPanoramaOrientation = initMainPanoramaOrientation
    }

    private heading(heading: number): number {
        let x: number = heading
        if (heading > 180) {
            if (x < 0) x = 180 - Math.abs(x)%180
            if (x > 0) x = Math.abs(x)%180 - 180
        }
        return x
    }

    private headings(referenceHeading: number): number[] {
        let startHeading: number = referenceHeading%90 
            ? referenceHeading + 45 
            : referenceHeading
        
        startHeading = this.heading(startHeading) // translate to google format [-180,180)
        
        const maxHeadings = 4
        let headings: number[] = []
        for (let i=0; i<maxHeadings; i++) {
            let heading: number
            if (i == 0) {
                heading = startHeading
            } else {
                heading = startHeading + (90*i)
            }
            const formatted = this.heading(heading) // translate to google format [-180,180)
            headings.push(formatted)
        }
        return headings // [aHeading, bHeading, cHeading, dHeading]
    }

    private points(pPoint: google.maps.LatLng, distance: number, headings: number[]): google.maps.LatLng[] {
        const maxPoints = 4 
        let points: google.maps.LatLng[] = []
        for (let i=0; i<maxPoints; i++) {
            const point: google.maps.LatLng = google.maps.geometry.spherical.computeOffset(pPoint, distance * 2, headings[i])
            points.push(point)
        }
        return points // [aPoint, bPoint, cPoint, dPoint]
    }

    private vector(startPoint: google.maps.LatLng, endPoint: google.maps.LatLng): number[] {
        return [ 
            endPoint.lng() - startPoint.lng(),
            endPoint.lat() - startPoint.lat()
        ]
    }

    private vectors(startPoint: google.maps.LatLng, endPoints: google.maps.LatLng[]): number[][] {
        let vectors: number[][] = []
        for (let i=0; i<endPoints.length; i++) {
            let vector: number[] = this.vector(startPoint, endPoints[i])
            vectors.push(vector)
        }
        return vectors // [pAVector, pBVector, pCVector, pDVector]
    }

    private dotProduct(vector1: number[], vector2: number[], size: number): number {
        let dp: number = 0
        for (let i = 0; i < size; i++) {
            dp += vector1[i] * vector2[i]
        }
        return dp
    }

    /**
     * Takes two vectors that together represent either the area right, back, left, or front of 
     * the main panoroma point and calculates the dot product of each with the vector that 
     * represents the adjacent panoroma point. The angle between the two perimeter vectors 
     * is 90 degrees, so if the dot products are positive, then the angles between the perimeter
     * vectors and the adjacent panorama vector is less than 90 degrees and thus we know that 
     * the adjacent panorama vector is in between the perimeter vectors.
     * @param vectors
     * @param newVector 
     */

    private isInArea(vectors: number[][], newVector: number[]): boolean {
        const dPOfLeftVectorAndSubjectVector = this.dotProduct(vectors[0], newVector, 2)
        const dPOfRightVectorAndSubjectVector = this.dotProduct(vectors[1], newVector, 2)
        const locatedInArea: boolean = (dPOfLeftVectorAndSubjectVector > 0 && dPOfRightVectorAndSubjectVector > 0)
        return locatedInArea
    }

    /**
     * Retrieves the _google.maps.LatLng_ for panoramas adjacent to the main panorama. 
     * Adjacent means on the left- and/or right-hand side of the main panorama depending on the orientation of the main panorama).
     */

    async getLocations(): Promise<AdjacentPanoramaLocations> {
        //// We need to determine the area that represents the right, back, left, or front area for a given 
        //// point in a 2D plane. We do this by figuring out each pair of vectors that represent the sides
        //// for a given area.
        console.log('map center point', this._mapCenterPoint.lat(), this._mapCenterPoint.lng())
        console.log('main panorama point', this._mainPanoramaPoint.lat(), this._mainPanoramaPoint.lng())

        const distanceBetweenPPointAndOPoint: number = google.maps.geometry.spherical.computeDistanceBetween(this._mainPanoramaPoint, this._mapCenterPoint)
        const pPointToMapCenterPointHeading: number = google.maps.geometry.spherical.computeHeading(this._mainPanoramaPoint, this._mapCenterPoint)
        const headings: number[] = this.headings(pPointToMapCenterPointHeading)
        console.log('headingA', headings[0])
        console.log('headingB', headings[1])
        console.log('headingC', headings[2])
        console.log('headingD', headings[3])
        const points: google.maps.LatLng[] = this.points(this._mainPanoramaPoint, distanceBetweenPPointAndOPoint, headings)
        const vectors: number[][] = this.vectors(this._mainPanoramaPoint, points)

        const areaVectors = {
            right: [vectors[0], vectors[1]],
            back: [vectors[1], vectors[2]],
            left: [vectors[2], vectors[3]],
            front: [vectors[3], vectors[0]]
        }

        let activePoint = this._mainPanoramaPoint
        let links: (google.maps.StreetViewLink | undefined)[] | undefined
        let count: number = 0 // keep track of number of links to relevant adjacent panoramas found
        const streetViewService = new google.maps.StreetViewService()

        for(let i=0; i<NUMBER_OF_ADJACENT_PANORAMAS; i++) {
            const request = {
                location: {lat: activePoint.lat(), lng: activePoint.lng()},
                radius: 100,
                source: google.maps.StreetViewSource.OUTDOOR
            }
            
            const result = await streetViewService.getPanorama(request)
            
            if (result == null) {
                continue
            }
            
            links = result.data.links
            
            if (links == null) { 
                throw new Error('Street View Links not found for this panorama')
            }

            //// We then loop through each of the links (i.e., the adjacent panoramas) searching for the link 
            //// for the panorama that is located in the target area (e.g., if the orientation of the subject panorama 
            //// is on the left-hand side of a map center point, then our target area would be represented by the area 
            //// to the right of the subject panorama). Each panorama may have up to four links (this is an assumption) for
            //// each of the possible directions that one can move from a given panorama (i.e., right, backward, left, forward).

            let targetLinkFound: boolean = false
            for (let j=0; j< links.length; j++) {
                // Set position (i.e., geocodes) of link 
                const link: google.maps.StreetViewLink | undefined = links![j]
        
                if (link == null) {
                    continue
                }
                
                const streetViewPanoRequest: google.maps.StreetViewPanoRequest = { pano: link.pano }
                const result = await streetViewService.getPanorama(streetViewPanoRequest)            
                
                if (result == null) {
                    continue
                }
                
                if (result.data.location == null) {
                    continue
                }
                
                const panoramaLink = {
                    pano: result.data.location.pano, 
                    point: result.data.location.latLng || {lat: () => 0, lng: () => 0} as google.maps.LatLng
                }

                
                if (panoramaLink.pano == null) {
                    continue
                }

                // Set vector for panorama point and link point
                const pLVector: number[] = this.vector(this._mainPanoramaPoint, panoramaLink.point)
                
                // Check whether link point is located in the target area
                switch (true) { 
                    case this._mainPanoramaOrientation == 'LEFTOF':
                        if (this.isInArea(areaVectors.right, pLVector)) {
                            this._adjacentPanoramaPanosAndPoints[i] = panoramaLink
                            count++
                            targetLinkFound = true
                        }
                        break 
                    case this._mainPanoramaOrientation == 'RIGHTOF':
                        if (this.isInArea(areaVectors.left, pLVector)) {
                            this._adjacentPanoramaPanosAndPoints[i] = panoramaLink
                            count++
                            targetLinkFound = true 
                        }
                        break
                    case this._mainPanoramaOrientation == 'FRONTOF':
                        // Check left area for first, then check right area second
                        if (i < NUMBER_OF_ADJACENT_PANORAMAS/2) {
                            if (this.isInArea(areaVectors.left, pLVector)) {
                                this._adjacentPanoramaPanosAndPoints[i] = panoramaLink
                                count++
                                targetLinkFound = true
                            } else {
                                break
                            }
                        } else {
                            if (this.isInArea(areaVectors.right, pLVector)) {
                                this._adjacentPanoramaPanosAndPoints[i] = panoramaLink
                                count++
                                targetLinkFound = true
                            } else {
                                break
                            }
                        }
                        break
                    default:
                        throw new Error('invalid orientation')
                }

                // We can exit the inner loop because we no longer have to check the other 
                // links as we have already found one in the target area
                if (targetLinkFound) break
            }

            // If the main panorama orientation is _LEFTOF_ or _RIGHTOF_, then when no link in 
            // the target area is found, we should exit the main loop. However, if the main panorama
            // orientation is _FRONTOF_, then if no link is found going left, we still should
            // check whether we can find a link going right.
            if (!targetLinkFound) {
                if (this._mainPanoramaOrientation !== 'FRONTOF') {
                    break
                } else if (i >= NUMBER_OF_ADJACENT_PANORAMAS/2) {
                    // Going right, so exit the main loop if no link found
                    break
                } else {
                    // Going left, so just continue with the next iteration of the main loop
                    // If next iteration is still going left, then _activePoint_ won't change,
                    // so we'll end up here again, until next iteration is going right
                    continue
                }
            } 
            
            // Assign the the link point as the active point. If the main panorama orientation is 
            // _FRONTOF_, then we look for links to the left of the main panorama for half of the 
            // value assigned to _NUMBER_OF_ADJACENT_PANORAMAS, so once we reach that half way point
            // we need to assign the active point as the main panorama point. That way, we can look 
            // for links to the right of the main panorama.
            if (this._mainPanoramaOrientation == 'FRONTOF' && i == (NUMBER_OF_ADJACENT_PANORAMAS/2 - 1)) {
                activePoint = this._mainPanoramaPoint
            } else {
                activePoint = this._adjacentPanoramaPanosAndPoints[i].point
            }
        }
        
        return {
            panosAndPoints: this._adjacentPanoramaPanosAndPoints,
            count: count
        }
    }
}

export { AdjacentStreetViewPanoramaLocations }