import { load } from 'cheerio';

import type { DataItem } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

interface idNameMap {
    type: string;
    name: string;
    nodeId: string;
    suffix?: string;
}
interface ArticleList {
    status: string;
    totalPages: number;
    body: string;
}

export const getArticleList = async (nodeId, page=1) => {
    const response = await ofetch<ArticleList>(
        `https://db2.gamersky.com/LabelJsonpAjax.aspx?${new URLSearchParams({
            jsondata: JSON.stringify({
                type: 'updatenodelabel',
                isCache: true,
                cacheTime: 60,
                nodeId,
                isNodeId: 'true',
                page: page,
            }),
        })}`,
        {
            parseResponse: (txt) => JSON.parse(txt.match(/\((.+)\);/)?.[1] ?? '{}'),
        }
    );
    return response.body;
};

function link2Mobile(url) {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/(\d+)\.s?html?$/i);
    if (!m) return url;
    const id = m[1];
    return `https://m.gamersky.com/news/index.html?contentId=${id}&contentType=tieZi/xinWen`;
  } catch (e) {
    return url;
  }
}

export const parseArticleList = (response: string, filter: string="") => {
    const $ = load(response);
    return $('li')
        .toArray()
        .map((item) => {
            const ele = $(item);
            const a = ele.find('.tt').length ? ele.find('.tt') : ele.find('a');
            const title = a.text();
            const link = link2Mobile(a.attr('href'));
            const pubDate = timezone(parseDate(ele.find('.time').text()), 8);
            const description = ele.find('.txt').text();
            if (!link) {
                return;
            }
            if (filter && filter !== "" && !title.includes(filter)) {
                return;
            }
            return {
                title,
                link,
                pubDate,
                description,
            };
        })
        .filter((item) => item !== undefined) satisfies DataItem[];
};

export const getArticle = (item) =>
    cache.tryGet(item.link, async () => {
        const response = await ofetch(item.link);
        const $ = load(response);
        const content = $('.Mid2L_con, .MidLcon');
        content.find('.appGameBuyCardIframe, .GSAppButton, .Mid2L_down').remove();
        content.find('a').each((_, item) => {
            if (item.attribs.href?.startsWith('https://www.gamersky.com/showimage/id_gamersky.shtml?')) {
                item.attribs.href = item.attribs.href.replace('https://www.gamersky.com/showimage/id_gamersky.shtml?', '');
            }
        });
        content.find('img').each((_, item) => {
            if (item.attribs.src === 'http://image.gamersky.com/webimg13/zhuanti/common/blank.png') {
                item.attribs.src = item.attribs['data-origin'];
            } else if (item.attribs.src.endsWith('_S.jpg')) {
                item.attribs.src = item.attribs.src.replace('_S.jpg', '.jpg');
            }
        });
        content.find('.Slides li').each((_, item) => {
            if (item.attribs.style === 'display: none;') {
                item.attribs.style = 'display: list-item;';
            }
        });
        item.description = content.html() || item.description;
        return item satisfies DataItem;
    }) as Promise<DataItem>;

export function mdTableBuilder(data: idNameMap[]) {
    const table = '|' + data.map((item) => `${item.type}|`).join('') + '\n|' + Array.from({ length: data.length }).fill('---|').join('') + '\n|' + data.map((item) => `${item.name}|`).join('') + '\n';
    return table;
}
