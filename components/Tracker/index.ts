import ReactGA from 'react-ga';

const GoogleAnalyticsId = 'UA-199001599-1';

class AnalyticsInternal {
    constructor() {
        ReactGA.initialize(GoogleAnalyticsId);
    }

    logPageView(url: string) {
        ReactGA.pageview(url);
    }
}

export const Tracker = new AnalyticsInternal();
