// 导入必要的模组
import { Route } from '@/types';
import got from '@/utils/got';
import * as cheerio from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import logger from '@/utils/logger';
import { urls } from './utils';
// import { config } from '@/config';
import cache from '@/utils/cache';
// const syncedMap = require('@/utils/syncedMap');

export const route: Route = {
    path: '/radio',
    name: 'radio',
    maintainers: ['barryZZJ'],
    handler,
    example: '/radio',
};

async function handler() {
    // 在此处编写您的逻辑
    const { data: response } = await got(urls.radioUrl);
    const $ = cheerio.load(response);

    const rssTitle = $('head title').text();
    const rssDesc = $('head meta[name="description"]').attr('content');
    const rssUrl = urls.radioUrl;

    const channelImage = 'https://kamishiraishimone.com/assets/kamishiraishimone/ogp.png';
    // const channelImage = 'https://kamishiraishimone.com/assets/kamishiraishimone/apple-touch-icon.png';
    const channelIcon = 'https://kamishiraishimone.com/assets/kamishiraishimone/favicon-f2e174f45f0aaffcc7b8deaedc8ca989.png';
    const channelLogo = channelIcon;

    const items_ = $('.details li')
        .toArray()
        .map((item) => {
            item = $(item);
            const a = item.find('a');
            const href = a.attr('href');
            const link = `${urls.baseUrl}${href}`;
            const thumbStyle = a.find('.thumb').attr('style');
            const title = a.find('.title').text().trim();
            // let title = a.find('.title');
            // title = title.find('h3') ? title.find('h3').text() : title.text().trim();
            return {
                title,
                link,
                pubDate: parseDate(a.find('.time').attr('datetime')),
                thumbStyle,
            };
        });

    // let items = await syncedMap(items_, items_.length, async (item) => {
    //     return cache.tryGet(item.link, async () => {
    //         let description = item.title;
    //         logger.debug('title: ' + item.title);
    //         try {
    //             const thumbUrl = item.thumbStyle.match(/url\('(.+)'\)/)[1];
    //             description += `<br><img src="${thumbUrl}">`;
    //         } catch (error) {
    //             description += '<br>Failed to extract thumb url!';
    //             logger.error(`${description}: ${error}`);
    //         }
    //         item.description = description;
    //         return item;
    //     });
    // });

    const items = await Promise.all(
        items_.map((item) => cache.tryGet(item.link, () => {
                let description = item.title;
                logger.debug('title: ' + item.title);
                try {
                    const thumbUrl = item.thumbStyle.match(/url\('(.+)'\)/)[1];
                    description += `<br><img src="${thumbUrl}">`;
                } catch (error) {
                    description += '<br>Failed to extract thumb url!';
                    logger.error(`${description}: ${error}`);
                }
                item.description = description;
                return item;
            }))
    );

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
