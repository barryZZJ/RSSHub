import { Route } from '@/types';

import ofetch from '@/utils/ofetch'; // 统一使用的请求库
import { load } from 'cheerio';
import iconv from 'iconv-lite';
// import logger from '@/utils/logger';

export const route: Route = {
    path: '/misonoza',
    name: 'e-tix-misonoza',
    maintainers: ['barryZZJ'],
    handler,
    example: '/e-tix/misonoza',
};

async function handler() {
    // 在此处编写您的逻辑
    const baseUrl = 'https://www.e-tix.jp/misonoza/';

    const resp = await ofetch(baseUrl, {
        responseType: 'arrayBuffer',
    });
    const data = iconv.decode(Buffer.from(resp), 'shiftjis');
    const $ = load(data);

    const rssTitle = $('head title').html();
    const rssDesc = $('head meta[name="description"]').attr('content');
    const rssUrl = baseUrl;

    const channelImage = 'https://www.e-tix.jp/misonoza/favicon.ico';
    const channelIcon = channelImage;
    const channelLogo = channelIcon;

    const items = $('section.sec-chiket')
        .toArray()
        .map((item) => {
            item = $(item);
            const title = item.find('h2').text().trim();
            const description = item.html();
            const link = item.find('.buylist a').attr('href');
            return {
                title,
                link,
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
