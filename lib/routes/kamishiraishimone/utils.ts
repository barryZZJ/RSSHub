// const got = require('@/utils/got'); // 自订的 got
// const cheerio = require('cheerio'); // 可以使用类似 jQuery 的 API HTML 解析器
import { config } from '@/config';
import logger from '@/utils/logger';
import puppeteer from '@/utils/puppeteer';

const baseUrl = 'https://kamishiraishimone.com';
const loginUrl = baseUrl + '/signin';
const galleryUrl = baseUrl + '/pages/gallery';
const radioUrl = baseUrl + '/movies/categories/radio';
const scheduleUrl = baseUrl + '/contents/schedule';
const videoUrl = baseUrl + '/movies/categories/video';
const newsUrl = baseUrl + '/contents/news';
const lemoMailUrl = baseUrl + '/dashboard/mail_magazine_archives/833';
const officialMailUrl = baseUrl + '/dashboard/mail_magazine_archives/815';

const urls = { baseUrl, loginUrl, galleryUrl, radioUrl, scheduleUrl, videoUrl, newsUrl, lemoMailUrl, officialMailUrl };

const MediaType = {
    group: 'group',
    movies: 'movies',
    radio: 'radio',
    unknown: 'unknown',
};

class KamishiraishimoneBrowser {
    LOGIN_CACHE_KEY = 'kamishiraishimone:cookie';
    browser: any;
    cache: any;
    async init(cache) {
        // 导入 puppeteer 工具类并初始化浏览器实例
        this.browser = await puppeteer();
        this.cache = cache;
    }

    close() {
        this.browser.close();
    }

    async fetchBody(url, isRelative = false) {
        const page = await this._newPage();
        if (isRelative) {
            url = this.fullUrl(url);
        }
        logger.info(`Requesting ${url}`);
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
        });
        const content = await page.content();
        page.close();
        return content;
    }

    async fetchGalleryThumbBody() {
        return await this.fetchBody(galleryUrl);
    }

    // async fetchGalleryContent (item) {
    //     if (item.mediatype === MediaType.movies) {
    //         return item;
    //     } else if (item.mediatype === MediaType.group) {
    //         await page.goto(item.link, {
    //             waitUntil: 'domcontentloaded',
    //         });
    //         const imgs = await page.$$('main.container img');
    //         const description = '';
    //         // TODO 图片下载下来用图床
    //         // TODO 改版了不用翻页了
    //         // for (const img of imgs) {

    //         // }

    //     }
    // }

    // async fetchGalleryPicGroup (url) {

    // }

    // async fetchGalleryVideo (url) {

    // }
    async fetchOfficialMailBody() {
        return await this.fetchBody(officialMailUrl);
    }

    async fetchLemoMailBody() {
        return await this.fetchBody(lemoMailUrl);
    }

    fullUrl(relUrl) {
        return `${urls.baseUrl}${relUrl}`;
    }

    // genImgTag (src, title) {

    // }

    async _isLoggedin(page) {
        // check if has cookie `remember_user_token`
        const cookies = await page.cookies();
        // logger.info(JSON.stringify(cookies));
        // example:
        // [
        //     {
        //         "name": "remember_user_token",
        //         "value": "BAhbB1sGaQOyeWFJIiIkMmEkMTAkblpwZEUvMzgucnBveHdod1BvaXJxdQY6BkVU--87e1ec890f6a1351e96e5ec09e5e08357da87972",
        //         "domain": "kamishiraishimone.com",
        //         "path": "/",
        //         "expires": 1686732604.501624,
        //         "size": 125,
        //         "httpOnly": true,
        //         "secure": true,
        //         "session": false,
        //         "sameParty": false,
        //         "sourceScheme": "Secure",
        //         "sourcePort": 443
        //     },
        // ]
        for (const cookie of cookies) {
            if (cookie.name === 'remember_user_token') {
                return true;
            }
        }
        return false;
    }

    async _isLoggedinLegacy(page) {
        // check if /dashboard page has "MY PAGE" element
        if (page.url().replace(/\/$/, '') !== baseUrl) {
            logger.info(`Requesting ${baseUrl}`);
            await page.goto(baseUrl);
        }

        const firstEl = await page.waitForSelector('.fc-entrance .auth-menu-list a');

        // logger.info(await firstEl.evaluate(el => el.href) === baseUrl + '/dashboard');
        // logger.info((await firstEl.evaluate(el => el.textContent)).trim() === 'MY PAGE');

        if ((await firstEl.evaluate((el) => el.href)) === baseUrl + '/dashboard' || (await firstEl.evaluate((el) => el.textContent)).trim() === 'MY PAGE') {
            return true;
        }
        return false;
    }

    async login() {
        if (!config.kamishiraishimone || !config.kamishiraishimone.username || !config.kamishiraishimone.password) {
            throw new Error('KamishiraishiMone Fanclub RSS is disabled due to the lack of relevant config: KAMISHIRAISHIMONE_USERNAME, KAMISHIRAISHIMONE_PASSWORD');
        }

        // logger.error('using temp cookie for debug!');
        // let cookiestr = '[{"name":"remember_user_token","value":"BAhbB1sGaQOyeWFJIiIkMmEkMTAkblpwZEUvMzgucnBveHdod1BvaXJxdQY6BkVU--87e1ec890f6a1351e96e5ec09e5e08357da87972","domain":"kamishiraishimone.com","path":"/","expires":1687942399.215908,"size":125,"httpOnly":true,"secure":true,"session":false,"sameParty":false,"sourceScheme":"Secure","sourcePort":443}]';
        // ! cache存在redis的话获取的结果是个Promise，在内存中则获取对象本身
        const cacheRes = this.cache.get(this.LOGIN_CACHE_KEY, false);
        // logger.info('cached result type: ' + typeof cacheRes + ', value: ' + cacheRes);
        let cookiestr = await cacheRes;
        logger.info('cached cookie: ' + cookiestr);

        const page = await this._newPage();

        if (cookiestr) {
            // cache hit
            const cookies = JSON.parse(cookiestr);
            await page.setCookie(...cookies);
            if (await this._isLoggedinLegacy(page)) {
                // and valid
                logger.info('KamishiraishiMone Fanclub login from cache successful!');
                return;
            }
        }

        // cache miss or cookie invalid
        logger.info('cache miss or cookie invalid');
        const { username, password } = config.kamishiraishimone;

        logger.info(`Requesting ${loginUrl}`);
        await page.goto(loginUrl);

        const usernameEl = await page.waitForSelector('#user_login');
        await usernameEl.type(username);

        const passwordEl = await page.waitForSelector('#user_password');
        await passwordEl.type(password);

        const submitEl = await page.waitForSelector('input[type="submit"]');
        await submitEl.click();

        await page.waitForNavigation();
        // jump to https://kamishiraishimone.com/

        if (!(await this._isLoggedinLegacy(page))) {
            this.close();
            throw new Error('KamishiraishiMone Fanclub login failed!');
        }

        logger.info('KamishiraishiMone Fanclub fresh login successful!');

        cookiestr = JSON.stringify(await page.cookies());
        logger.info('fresh cookie: ' + cookiestr);
        // maxAge is 13 days
        this.cache.set(this.LOGIN_CACHE_KEY, cookiestr, 1_123_200);
        page.close();
    }

    async _newPage() {
        const page = await this.browser.newPage();
        // 拦截所有请求
        await page.setRequestInterception(true);
        // 仅允许某些类型的请求
        page.on('request', (request) => {
            // 在这次例子，我们只允许 HTML 请求
            request.resourceType() === 'document' ? request.continue() : request.abort();
        });
        return page;
    }
}

async function sleep(ms) {
    await new Promise((r) => setTimeout(r, ms));
}

export { sleep, urls, KamishiraishimoneBrowser, MediaType };
