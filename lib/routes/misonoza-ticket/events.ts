import { Route } from '@/types';

import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/events',
    name: 'events',
    maintainers: ['barryZZJ'],
    handler,
    example: '/misonoza-ticket/events',
};

async function handler() {
    // 在此处编写您的逻辑
    const baseUrl = 'https://misonoza-ticket.jp/SelectEvent_MI.aspx';

    const { data } = await got(baseUrl);
    const $ = load(data);

    const rssTitle = $('head title').text();
    const rssDesc = $('head meta[name="description"]').attr('content');
    const rssUrl = baseUrl;

    const channelImage = $('link[rel="apple-touch-icon"]').attr('href');
    const channelIcon = $('link[rel="shortcut icon"]').attr('href');
    const channelLogo = channelIcon;

    const items = $('.ticket_list_bloc')
        .toArray()
        .map((div) => {
            div = $(div);
            const title = div.find('.head_set').text().trim();
            const description = div.find('.contents_bloc').html();
            const match = div
                .find('.info_bloc')
                .text()
                .match(/発売日.+?(\d+)年(\d+)月(\d+)日/);
            const datetime = match ? `${match[1]}/${match[2]}/${match[3]}` : null;
            return {
                title,
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
        icon: channelIcon,
        logo: channelLogo,
    };
}
