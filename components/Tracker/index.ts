import ReactGA from 'react-ga';

const GoogleAnalyticsId = 'G-3RRE7C0WVL';

class AnalyticsInternal {
    constructor() {
        ReactGA.initialize(GoogleAnalyticsId);
    }

    logPageView(url: string) {
        ReactGA.pageview(url);
    }
}

export const Tracker = new AnalyticsInternal();
