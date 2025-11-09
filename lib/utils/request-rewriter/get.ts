import http from 'node:http';
import https from 'node:https';
import logger from '@/utils/logger';
import { config } from '@/config';
import proxy from '@/utils/proxy';

type Get = typeof http.get | typeof https.get | typeof http.request | typeof https.request;

const getWrappedGet: <T extends Get>(origin: T) => T = (origin) =>
    function (this: any, ...args: Parameters<typeof origin>) {
        let url: URL | null;
        let options: http.RequestOptions = {};
        let callback: ((res: http.IncomingMessage) => void) | undefined;
        if (typeof args[0] === 'string' || args[0] instanceof URL) {
            url = new URL(args[0]);
            if (typeof args[1] === 'object') {
                options = args[1];
                callback = args[2];
            } else if (typeof args[1] === 'function') {
                options = {};
                callback = args[1];
            }
        } else {
            options = args[0];
            try {
                // options: {"host":"127.0.0.1","port":10809,"proxyAuth":null,"headers":{"User-Agent":"Instagram 222.0.0.13.114 Android (26/8.0.0; 480dpi; 1080x1920; samsung; SM-G935F; hero2lte; samsungexynos8890; en_US; 350696709)","Accept-Language":"en-US","Accept-Encoding":"gzip","Connection":"close","host":"i.instagram.com:443"},"method":"CONNECT","path":"i.instagram.com:443","agent":false}
                url = options.method === 'CONNECT' ? new URL(options.href || `${options.protocol || 'http:'}//${options.hostname || options.host}:${options.port}`) : new URL(options.href || `${options.protocol || 'http:'}//${options.hostname || options.host}:${options.port}${options.path}${options.search || (options.query ? `?${options.query}` : '')}`);
            } catch {
                url = null;
            }
            if (typeof args[1] === 'function') {
                callback = args[1];
            }
            // logger.error(`url: ${url}`);  // url: http://127.0.0.1i.instagram.com:443/
            // logger.error(`options.href: ${options.href}`);  // options.href: undefined
            // logger.error(`options.protocol: ${options.protocol}`);  // options.protocol: undefined
            // logger.error(`options.hostname: ${options.hostname}`);  // options.hostname: undefined
            // logger.error(`options.host: ${options.host}`);  // options.host: undefined
            // logger.error(`options.port: ${options.port}`);  // options.port: undefined
            // logger.error(`options.path: ${options.path}`);  // options.path: /undefined
            // logger.error(`options.search: ${options.search}`);  // options.search: undefined
            // logger.error(`options.query: ${options.query}`);  // options.query: undefined
        }
        if (!url) {
            return Reflect.apply(origin, this, args) as ReturnType<typeof origin>;
        }

        logger.debug(`Outgoing request: ${options.method || 'GET'} ${url}`);

        options.headers = options.headers || {};
        const headersLowerCaseKeys = new Set(Object.keys(options.headers).map((key) => key.toLowerCase()));

        // ua
        if (!headersLowerCaseKeys.has('user-agent')) {
            options.headers['user-agent'] = config.ua;
        }

        // Accept
        if (!headersLowerCaseKeys.has('accept')) {
            options.headers.accept = '*/*';
        }

        // referer
        if (!headersLowerCaseKeys.has('referer')) {
            options.headers.referer = url.origin;
        }

        // proxy
        if (!options.agent && proxy.agent) {
            const proxyRegex = new RegExp(proxy.proxyObj.url_regex);

            if (
                proxyRegex.test(url.toString()) &&
                url.protocol.startsWith('http') &&
                url.host !== proxy.proxyUrlHandler?.host &&
                url.host !== 'localhost' &&
                !url.host.startsWith('127.') &&
                !(config.puppeteerWSEndpoint?.includes(url.host) ?? false)
            ) {
                options.agent = proxy.agent;
            }
        }

        return Reflect.apply(origin, this, [url, options, callback]) as ReturnType<typeof origin>;
    };

export default getWrappedGet;
