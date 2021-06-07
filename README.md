# fanddly-client

fanddly is a mobile web application written in React and Nextjs on the front-end and Node on the back-end. AWS is used for the CMS and image processing. Postgresql for the RDMS. Heroku for hosting. This repository is the code base for the client.

## Motivation

Real asset professionals that buy, sell, or lease real assets spend more than a few minutes trying to find suitable images of their target assets. At the early stages of a transaction, images don't need to be of the highest quality, just good enough so that it gives some visual context. 

The resolution of the images used for Google Map's Street View continues to improve, so much so that the images are suitable for use in the evaluation of buying, selling, or leasing real assets. fanddly is a Google Maps implementation that makes it easy to find and download the images associated with a given location (i.e., address or name of place). 

The tool is built with the main goal to minimize the steps it takes to find and download images. For example, a key feature utilizes an algorithm that takes as an input an image that shows a frontal view of the location and 
outputs two images, a left-side view and right-side view of the location. 

Using the tool, a user could in theory reduce his or her time spent searching for suitable images from 10+ minutes to ~1 minute. 

## App flow 

text inputted               autofill address with Google API
address selected            get geocodes for address
geocodes obtained           get street view panorama of building at address
                            get adjacent street view panoramas 
                            get street map 
                            get satellite map
                            show panoramas and maps
                            prompt user to adjust and/or confirm maps
view confirmed              get static map images 
images displayed            allow user to click on images
image downloaded            end

## To Do

[ ] Add analytics
[ ] Improve error handling


## References
* [Maps Javascript API](https://developers.google.com/maps/documentation/javascript/overview)
* [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
* [react-hook-google-maps](https://github.com/jmarceli/react-hook-google-maps/blob/master/src/useGoogleMaps.ts)

