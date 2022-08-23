import "/node_modules/is-in-subnet/browser/isInSubnet.js";
/* globals isInSubnet */

const googleServiceIpApi = 'https://www.gstatic.com/ipranges/goog.json';
const googleCloudIpApi = 'https://www.gstatic.com/ipranges/cloud.json'; // TODO: use too

let ipv4Checker = null;
let ipv6Checker = null;

/**
 * Fetch the latest Google IP ranges.
 */
async function fetchIpRanges() {
    await fetch(googleServiceIpApi).then(response => {
        if (!response.ok) {
            console.error(`Error when fetching "${googleServiceIpApi}":`, response);
            return;
        }

        return response.json();
    }).then(jsonResponse => {
        const ipv4Prefixes = jsonResponse.prefixes
            .filter(x => x.ipv4Prefix)
            .map(x => x.ipv4Prefix);

        const ipv6Prefixes = jsonResponse.prefixes
            .filter(x => x.ipv6Prefix)
            .flatMap(x => x.ipv6Prefix);

        console.info("IPv4 addresses found:", ipv4Prefixes);
        console.info("IPv6 addresses found:", ipv6Prefixes);

        ipv4Checker = isInSubnet.createChecker(ipv4Prefixes);
        ipv6Checker = isInSubnet.createChecker(ipv6Prefixes);
    });
}

async function listener(details) {
    const requestUrl = new URL(details.url);
    var dnsResult = await browser.dns.resolve(requestUrl.host);

    if (!ipv4Checker || !ipv6Checker) {
        console.warn('IPv4/IPv6 subnet checker not yet initialized, please wait.');
        return;
    }

    dnsResult.addresses.forEach(requestIp => {
        if (ipv4Checker(requestIp)) {
            console.count('found requests, IPv4');
        } else if (ipv6Checker(requestIp)) {
            console.count('found requests, IPv6');
        };
    });
}


/**
 * Initialize the module.
 */
export function init() {
    fetchIpRanges();

    browser.webRequest.onBeforeRequest.addListener(
        listener,
        { urls: ["<all_urls>"] }
    );
}
