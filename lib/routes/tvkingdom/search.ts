// 导入必要的模组
import { Route } from '@/types';

import { ofetch } from 'ofetch';
import { load } from 'cheerio';
// import logger from '@/utils/logger';
import { parseDate } from '@/utils/parse-date';
// import { config } from '@/config';
import cache from '@/utils/cache';

export const route: Route = {
    path: '/search/:keyword',
    name: 'search',
    maintainers: ['barryZZJ'],
    handler,
    example: '/search/上白石萌音',
    features: {
        antiCrawler: true,
    },
};

async function handler(ctx) {
    // 在此处编写您的逻辑
    const { keyword } = ctx.req.param();
    const baseUrl = `https://www.tvkingdom.jp/rss/schedulesBySearch.action?stationPlatformId=0&condition.keyword=${keyword}&submit=%E6%A4%9C%E7%B4%A2&stationAreaId=23&submit.x=&submit.y=`;

    const data = await ofetch(baseUrl);
    const $ = load(data, { xmlMode: true });

    const rssTitle = $('channel>title').html();
    const rssDesc = $('channel>description').text();
    const rssUrl = baseUrl;
    const rssLang = $(String.raw`channel>dc\:language`).text();

    const channelImage = 'https://www.tvkingdom.jp/favicon.ico';
    const channelIcon = channelImage;
    const channelLogo = channelIcon;

    // fetch description from item's link
    let items = $('item')
        .toArray()
        .map((item) => {
            item = $(item);
            // logger.info('item: ' + item.toString())
            const title = item.find('title').text();
            const link = item.find('link').text();
            const date = parseDate(item.find(String.raw`dc\:date`).text());
            // logger.info('title: ' + title);
            // logger.info('link: ' + link);
            // logger.info('date: ' + date);
            // logger.info('\n');
            return {
                title,
                link,
                date,
            };
        });
    // const max_async_jobs = get_config(config.tvkingdom, 'max_async_jobs', 5, parseInt, (ret)=> ret == -1 ? items_.length : ret);
    // items = await syncedMap(items, max_async_jobs, async (item) => {
    //     return cache.tryGet(item.link, async () => {
    //         const { data: data } = await got(item.link);
    //         const $ = load(data);
    //         const $desc = load($('.mainColumn').toString());
    //         $desc('.basicContTitle').remove();
    //         $desc('.shareList').remove();
    //         $desc('.iepgBtn').remove();
    //         item.description = $desc.html();
    //         return item;
    //     });
    // });
    items = await Promise.all(
        items.map((item) => cache.tryGet(item.link, async () => {
                const data = await ofetch(item.link);
                const $ = load(data);
                const $desc = load($('.mainColumn').toString());
                $desc('.basicContTitle').remove();
                $desc('.shareList').remove();
                $desc('.iepgBtn').remove();
                item.description = $desc.html();
                return item;
            }))
    );

    return {
        // 在此处输出您的 RSS
        title: rssTitle,
        link: rssUrl,
        description: rssDesc,
        language: rssLang,
        item: items,
        image: channelImage,
        icon: channelIcon,
        logo: channelLogo,
    };
}
