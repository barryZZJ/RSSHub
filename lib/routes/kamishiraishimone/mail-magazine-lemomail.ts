// 导入必要的模组
import { Route } from '@/types';
import * as cheerio from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import logger from '@/utils/logger';
import { sleep, urls, KamishiraishimoneBrowser } from './utils';
// import { config } from '@/config';
import cache from '@/utils/cache';
// const syncedMap = require('@/utils/syncedMap');
// const get_config = require('@/utils/get_config');

export const route: Route = {
    path: '/mail_magazine/lemomail',
    name: 'mail_magazine_lemomail',
    maintainers: ['barryZZJ'],
    handler,
    example: '/mail_magazine/lemomail',
    features: {
        requireConfig: [
            {
                name: 'KAMISHIRAISHIMONE_USERNAME',
                description: 'username',
            },
            {
                name: 'KAMISHIRAISHIMONE_PASSWORD',
                description: 'password',
            },
        ],
        requirePuppeteer: true,
        antiCrawler: true,
    },
};

async function handler(ctx) {
    // 在此处编写您的逻辑
    const browser = new KamishiraishimoneBrowser();
    await browser.init(cache);
    await browser.login();

    const body = await browser.fetchLemoMailBody();
    // logger.info('fetched body:\n'+body);
    const $ = cheerio.load(body);

    const rssTitle = 'れもめーる | 上白石萌音 オフィシャルホームページ';
    const rssDesc = $('head meta[name="description"]').attr('content');
    const rssUrl = urls.officialMailUrl;

    const channelImage = 'https://kamishiraishimone.com/assets/kamishiraishimone/ogp.png';
    // const channelImage = 'https://kamishiraishimone.com/assets/kamishiraishimone/apple-touch-icon.png';
    const channelIcon = 'https://kamishiraishimone.com/assets/kamishiraishimone/favicon-f2e174f45f0aaffcc7b8deaedc8ca989.png';
    const channelLogo = channelIcon;

    const items_ = $('table.magazine-table>tbody>tr')
        .toArray()
        .map((tr) => {
            tr = $(tr);
            const tds = tr.find('td');
            const datetime = $(tds.get(0)).text().trim();
            const a = $(tds.get(1)).find('a');
            const href = a.attr('href');
            const title = a.text().trim();
            logger.info('title: ' + title);

            return {
                title,
                link: `${urls.baseUrl}${href}`,
                pubDate: parseDate(datetime),
            };
        });

    // descriptions
    // 顺序获取，防止太多请求DDOS
    // const detail_max = get_config(config.kamishiraishimone, 'detail_max_magazine', 5, parseInt, (ret)=> ret == -1 ? items_.length : ret);
    // const max_async_jobs_magazine = get_config(config.kamishiraishimone, 'max_async_jobs_magazine', 1, parseInt, (ret)=> ret == -1 ? items_.length : ret);
    // let items = await syncedMap(items_.slice(0, detail_max), max_async_jobs_magazine, async (item) => {
    //     return cache.tryGet(item.link, async () => {
    //         await sleep(100);
    //         const desc_body = await browser.fetchBody(item.link);
    //         const desc$ = cheerio.load(desc_body);
    //         item.description = desc$('table.magazine-table>tbody>tr:last-child>td').html();
    //         return item;
    //     });
    // });
    const detail_max = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 5;
    let items = await Promise.all(
        items_.slice(0, detail_max).map((item) => cache.tryGet(item.link, async () => {
                await sleep(100);
                const desc_body = await browser.fetchBody(item.link);
                const desc$ = cheerio.load(desc_body);
                item.description = desc$('table.magazine-table>tbody>tr:last-child>td').html();
                return item;
            }))
    );
    items = items.concat(items_.slice(detail_max));

    browser.close();

    return {
        // 在此处输出您的 RSS
        title: rssTitle,
        link: rssUrl,
        description: rssDesc,
        item: items,
        image: channelImage,
        icon: channelIcon,
        logo: channelLogo,
    };
}
