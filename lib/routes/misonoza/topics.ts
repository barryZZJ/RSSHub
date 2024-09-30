import { Route } from '@/types';

import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import { JapaneseDateConverter } from 'japanese-date-converter';

export const route: Route = {
    path: '/new/topics',
    name: 'topics',
    maintainers: ['barryZZJ'],
    handler,
    example: '/misonoza/new/topics',
};

const convertTable = {
    明治: 'M',
    大正: 'T',
    昭和: 'S',
    平成: 'H',
    令和: 'R',
};

function myJapaneseDateConverter(jpdate) {
    const match = jpdate.match(/^(\D+)(\d{1,2})年(\d{1,2})月(\d{1,2})日$/);
    if (!match) {
        return '';
    }

    const [, ggg, e, M, dd] = match;
    const g = convertTable[ggg];
    const ee = e.padStart(2, '0');
    const mm = M.padStart(2, '0');

    const inputValue = `${g}${ee}/${mm}/${dd}`;
    const settings = { format: 'yyyy/MM/dd' };
    const converter = new JapaneseDateConverter({ inputValue, settings });
    const datetime = converter.execute();
    return datetime;
}

async function handler() {
    // 在此处编写您的逻辑
    const baseUrl = 'https://www.misonoza.co.jp/new/topics/';
    const { data } = await got(baseUrl);
    const $ = load(data);

    const rssTitle = $('head title').text();
    const rssDesc = $('head meta[name="Description"]').attr('content');
    const rssUrl = baseUrl;
    const channelImage = 'https://www.misonoza.co.jp/common/img/hdr_logo.png';

    const section = $('div.main_cont section');
    const div_main = section.find('div.tab_contents').first();
    let items = [];
    items = div_main
        .find('dl')
        .toArray()
        .map((dl) => {
            dl = $(dl);
            const jpdate = dl.find('.topics_day').text().trim();
            const datetime = myJapaneseDateConverter(jpdate);
            const title = dl.find('dt').text();
            const description = dl.find('.topics_text').html();
            return {
                title,
                link: baseUrl,
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
        // icon: channelIcon,
        // logo: channelLogo,
    };
}
