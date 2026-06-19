// 导入必要的模组
import { load } from 'cheerio';
import { ofetch } from 'ofetch';

import type { Route } from '@/types';
// import { config } from '@/config';
import cache from '@/utils/cache';
// import logger from '@/utils/logger';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/search/:keyword',
    name: 'search',
    maintainers: ['barryZZJ'],
    handler,
    example: '/search/上白石萌音',
    features: {
        antiCrawler: false,
    },
};

import logger from '@/utils/logger';
async function handler(ctx) {
    // 在此处编写您的逻辑
    const { keyword } = ctx.req.param();
    const baseUrl = `https://www.dimora.jp/freeword-search/${encodeURIComponent(keyword)}?chType=110&searchType=3&genre=&maxNum=&areaId=03`;

    const data = await ofetch(baseUrl);
    
    const $ = load(data);

    const rssTitle = $('title').text();
    const rssDesc = $('meta[name="description"]').attr('content');
    const rssUrl = baseUrl;
    const rssLang = $(`html`).attr('lang');

    const channelImage = 'https://www.dimora.jp/img/pc/dmrver110915/logo/pcDimoraFavicon.png';
    const channelIcon = channelImage;
    const channelLogo = channelIcon;

    let scriptHtml = $('#contMain script').text();
    scriptHtml = scriptHtml.substring(scriptHtml.indexOf("var GL_FWSEARCH_DATA = ") + 23, scriptHtml.indexOf("};") + 1);
    const jsonData = JSON.parse(scriptHtml);

    // fetch description from item's link
    let items = jsonData.record
        .map((item) => {
            // logger.info('item: ' + item.toString())
            const title = item.title;
            const link = `https://www.dimora.jp/digital-program/${item.mindsProgramId}-${item.gcn}/${item.eventId}`;
            const startDate = parseDate(item.startDate);
            const endDate = parseDate(item.endDate);
            const options = { weekday: "short" };
            const startDay = new Intl.DateTimeFormat("zh-CN", options).format(startDate);
            const description = `<p>${startDate.getMonth() + 1}/${startDate.getDate()} (${startDay}) ${startDate.getHours()}:${startDate.getMinutes()} ～ ${endDate.getHours()}:${endDate.getMinutes()}</p>
            <p>ジャンル： ${item.genre[0].majorGenre ?? ''}</p>
            <p>放送局：${item.chNo} ${item.bcsNm}</p>
            <p>${item.detail1}</p>
            <h1>番組詳細</h1>
            <p>${item.detail2}</p>`;
            // logger.info('title: ' + title);
            // logger.info('link: ' + link);
            // logger.info('date: ' + date);
            // logger.info('\n');
            return {
                title,
                link,
                pubDate: startDate,
                description,
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
    
    // items = await Promise.all(
    //     items.map((item) =>
    //         cache.tryGet(item.link, async () => {
    //             const data = await ofetch(item.link);
    //             const $ = load(data);
    //             const $desc = load($('#contMain').toString());
    //             $desc('#secBreadList').remove();
    //             $desc('#hpSnsArea').remove();
    //             $desc('#footerLink').remove();
    //             item.description = $desc.html();
    //             return item;
    //         })
    //     )
    // );

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
