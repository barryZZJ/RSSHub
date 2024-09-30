// 导入必要的模组
import { Route } from '@/types';
import got from '@/utils/got';
import * as cheerio from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import logger from '@/utils/logger';
import { sleep, urls } from './utils';
// import { config } from '@/config';
import cache from '@/utils/cache';
// const syncedMap = require('@/utils/syncedMap');
// const get_config = require('@/utils/get_config');

export const route: Route = {
    path: '/news/:category?',
    name: 'news',
    maintainers: ['barryZZJ'],
    handler,
    example: '/news/tv',
    features: {
        antiCrawler: true,
    },
};

async function handler(ctx) {
    // 在此处编写您的逻辑
    const targetUrl = ctx.req.param('category') ? urls.newsUrl + '/' + ctx.req.param('category') : urls.newsUrl;
    const { data: response } = await got(targetUrl);
    const $ = cheerio.load(response);

    let rssTitle = $('head title').text();
    if (ctx.req.param('category')) {
        rssTitle = rssTitle.replace('NEWS', 'NEWS-' + ctx.req.param('category'));
    }
    const rssDesc = $('head meta[name="description"]').attr('content');
    const rssUrl = targetUrl;

    const channelImage = 'https://kamishiraishimone.com/assets/kamishiraishimone/ogp.png';
    // const channelImage = 'https://kamishiraishimone.com/assets/kamishiraishimone/apple-touch-icon.png';
    const channelIcon = 'https://kamishiraishimone.com/assets/kamishiraishimone/favicon-f2e174f45f0aaffcc7b8deaedc8ca989.png';
    const channelLogo = channelIcon;

    const items_ = $('.details ul.content-list>li')
        .toArray()
        .map((li) => {
            li = $(li);
            const a = li.find('a');
            const title = a.find('.title').text().trim();
            // logger.info('title: ' + title);
            const datetime = a.find('.time').attr('datetime');
            return {
                title,
                link: `${urls.baseUrl}${a.attr('href')}`,
                pubDate: datetime ? parseDate(datetime) : null,
            };
        });

    // descriptions
    // 顺序获取，防止太多请求DDOS
    // const detail_max = get_config(config.kamishiraishimone, 'detail_max_news', 1, parseInt, (ret)=> ret == -1 ? items_.length : ret);
    // const max_async_jobs_news = get_config(config.kamishiraishimone, 'max_async_jobs_news', 1, parseInt, (ret)=> ret == -1 ? items_.length : ret);
    // let items = await syncedMap(items_.slice(0, detail_max), max_async_jobs_news, async (item) => {
    //     return cache.tryGet(item.link, async () => {
    //         await sleep(100);
    //         logger.info(`Requesting ${item.link}`);
    //         const { ok, data: response } = await got(item.link);
    //         const $ = cheerio.load(response);

    //         item.description = $('.details .body').html();
    //         return item;
    //     });
    // });
    const detail_max = ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 5;
    let items = await Promise.all(
        items_.slice(0, detail_max).map((item) => cache.tryGet(item.link, async () => {
                await sleep(100);
                logger.info(`Requesting ${item.link}`);
                const { data: response } = await got(item.link);
                const $ = cheerio.load(response);

                item.description = $('.details .body').html();
                return item;
            }))
    );
    items = items.concat(items_.slice(detail_max));

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
