import { Route } from '@/types';

import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/lineup',
    name: 'lineup',
    maintainers: ['barryZZJ'],
    handler,
    example: '/misonoza/lineup',
};

async function handler() {
    // 在此处编写您的逻辑
    const baseUrl = 'https://www.misonoza.co.jp/lineup/';
    const { data } = await got(baseUrl);
    const $ = load(data);

    const rssTitle = $('head title').text();
    const rssDesc = $('head meta[name="Description"]').attr('content');
    const rssUrl = baseUrl;
    const channelImage = 'https://www.misonoza.co.jp/common/img/hdr_logo.png';

    const items = $('#tab-cont2023 section')
        .toArray()
        .map((item) => {
            item = $(item);
            const title = item.find('.set-lineup-tit').text().trim();
            const description = item.find('.set-lineup-box').html();
            const matchymd = item
                .find('.set-lineup-day')
                .text()
                .match(/公演期間：(\d+)年(\d+)月(\d+)日/);
            const matchym = item
                .find('.set-lineup-day')
                .text()
                .match(/公演期間：(\d+)年(\d+)月/);
            const datetime = matchymd ? `${matchymd[1]}/${matchymd[2]}/${matchymd[3]}` : matchym ? `${matchym[1]}/${matchym[2]}/1` : null;
            const link = item.find('.set-lineup-tit a').attr('href');
            return {
                title,
                link,
                pubDate: datetime ? parseDate(datetime) : null,
                description,
            };
        });

    return {
        // 在此处输出您的 RSS
        title: rssTitle,
        link: rssUrl,
        description: rssDesc,
        item: items,
        image: channelImage,
    };
}
