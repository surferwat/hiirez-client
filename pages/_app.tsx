// import App from 'next/app'
import type { AppProps /*, AppContext */ } from 'next/app'
import Head from 'next/head'
import { Fragment } from 'react'
import PageLayout from '../components/Layout/PageLayout'
import '../styles/globals.css'

function MyApp({ Component, pageProps }: AppProps) {
    return (
      <Fragment>
      <Head>
        {/* Use minimum-scale=1 to enable GPU rasterization */}
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no"
        />
        <meta name="description" content="easy way to find and download images of your property"/>
        <meta name="keywords" content="real estate, property, technology"/>
        <title>hiirez</title>
      </Head>
      <PageLayout>
        <Component {...pageProps} />
      </PageLayout>
      </Fragment>
    )
  }
  
// Only uncomment this method if you have blocking data requirements for
// every single page in your application. This disables the ability to
// perform automatic static optimization, causing every page in your app to
// be server-side rendered.
//
// MyApp.getInitialProps = async (appContext: AppContext) => {
//   // calls page's `getInitialProps` and fills `appProps.pageProps`
//   const appProps = await App.getInitialProps(appContext);

//   return { ...appProps }
// }

export default MyApp