// 导入必要的模组
import { Route } from '@/types';
import * as cheerio from 'cheerio';
import { parseDate } from '@/utils/parse-date';
// import { config } from '@/config';
import logger from '@/utils/logger';
import { urls, KamishiraishimoneBrowser, MediaType } from './utils';
import cache from '@/utils/cache';

export const route: Route = {
    path: '/detail_gallery',
    name: 'detailed gallery contents',
    maintainers: ['barryZZJ'],
    handler,
    example: '/detail_gallery',
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

async function handler() {
    // 在此处编写您的逻辑
    const b = new KamishiraishimoneBrowser();
    await b.init(cache);
    await b.login();

    const body = await b.fetchGalleryThumbBody();

    const $ = cheerio.load(body);

    const rssTitle = $('head title').text();
    const rssDesc = $('head meta[name="description"]').attr('content');
    const rssUrl = urls.galleryUrl;

    const channelImage = 'https://kamishiraishimone.com/assets/kamishiraishimone/ogp.png';
    // const channelImage = 'https://kamishiraishimone.com/assets/kamishiraishimone/apple-touch-icon.png';
    const channelIcon = 'https://kamishiraishimone.com/assets/kamishiraishimone/favicon-f2e174f45f0aaffcc7b8deaedc8ca989.png';
    const channelLogo = channelIcon;

    // ! NOTE: 做不了原图，获取的直链有时间限制，必须下载下来本地提供或上传到图床(最好别公布到网上)
    // 做预览又感觉很麻烦，还要处理先后顺序，先放着吧

    const list = $('.details li')
        .toArray()
        .map((li) => {
            li = $(li);
            const a = li.find('a');
            const href = a.attr('href');
            const thumbStyle = a.find('.thumb').attr('style');
            const title = a.find('.title').text().trim();
            // let title = a.find('.title');
            // title = title.find('h3') ? title.find('h3').text() : title.text().trim();
            let mediaType = MediaType.unknown;
            if (href.startsWith('/group')) {
                mediaType = MediaType.group;
            } else if (href.startsWith('/movies')) {
                mediaType = MediaType.movies;
            }
            let description = '';
            logger.info('title: ' + title);
            try {
                const thumbUrl = thumbStyle.match(/url\('(.+)'\)/)[1];
                description += `<br><img src="${thumbUrl}">`;
            } catch (error) {
                description += '<br>Failed to extract thumb url!';
                logger.error(`${description}: ${error}`);
            }
            return {
                title,
                link: `${urls.baseUrl}${href}`,
                pubDate: parseDate(a.find('.time').attr('datetime')),
                description,
                mediaType,
            };
        });

    // TODO 改成顺序执行就可以避免DDOS了
    const items = await Promise.all(list.map(async (item) => await b.fetchGalleryContent(item)));

    b.close();

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
