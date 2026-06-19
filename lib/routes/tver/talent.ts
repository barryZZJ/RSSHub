import type { Context } from 'hono';

import type { Data, DataItem, Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

export const route: Route = {
    path: '/talents/:id',
    categories: ['traditional-media'],
    example: '/tver/talents/t03736e',
    parameters: {
        id: 'talents ID (as it appears in URLs). For example, in https://tver.jp/talents/t03736e, the ID is "t03736e".',
    },
    radar: [
        {
            source: ['tver.jp/talents/:id'],
            target: '/talents/:id',
        },
    ],
    name: 'Talents',
    maintainers: ['barryZZJ'],
    handler,
};

const commonHeaders = {
    'Accept': '*/*',
    'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-GPC': '1',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"'
};

async function handler(ctx: Context): Promise<Data> {
    const { id } = ctx.req.param();
    
    const { result: browser } = await ofetch('https://platform-api.tver.jp/v2/api/platform_users/browser/create', {
        method: 'POST',
        body: 'device_type=pc',
        headers: {
            ...commonHeaders,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        referrer: 'https://s.tver.jp/',
        credentials: 'omit',
        mode: 'cors',
    });

    const { platform_uid, platform_token } = browser;

    const { name } = await ofetch(`https://contents-api.tver.jp/contents/api/v1/talents/${id}`, {
        method: 'GET',
        headers: {
            ...commonHeaders,
            'x-tver-platform-type': 'web',
        },
        referrer: 'https://tver.jp/',
        credentials: 'omit',
        mode: 'cors',
    });

    const { result } = await ofetch(`https://platform-api.tver.jp/service/api/v1/callTalentEpisode/${id}?platform_uid=${platform_uid}&platform_token=${platform_token}&require_data=later`, {
        method: 'GET',
        headers: {
            ...commonHeaders,
            'x-tver-platform-type': 'web',
        },
        referrer: 'https://tver.jp/',
        credentials: 'omit',
        mode: 'cors',
    });

    const items: DataItem[] = (result.contents ?? [])
        .filter((i) => i.type === 'episode')
        .map((i) => {
            const rawPubDate = i.content.broadcastDateLabel;
            const cleanedPubDate = rawPubDate.replaceAll(/\(.*?\)|放送分/g, '').trim();
            const parsedPubDate = timezone(parseDate(cleanedPubDate, 'M月D日'), +9).toDateString();

            return {
                title: i.content.seriesTitle,
                description: i.content.title,
                link: `https://tver.jp/episodes/${i.content.id}`,
                image: `https://statics.tver.jp/images/content/thumbnail/episode/xlarge/${i.content.id}.jpg`,
                pubDate: parsedPubDate,
            };
        });

    return {
        title: 'TVer - ' + name,
        link: `https://tver.jp/talents/${id}`,
        image: `https://statics.tver.jp/images/content/thumbnail/talent/large/${id}.jpg`,
        language: 'ja',
        item: items,
    };
}
