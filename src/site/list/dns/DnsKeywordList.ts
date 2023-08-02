import {ColtBaseUrlItem} from "../../../dto/ColtBaseUrlItem";
import {ColtBaseUrlCate} from "../../../dto/ColtBaseUrlCate";
import {ColtBaseUrlRank} from "../../../dto/ColtBaseUrlRank";
import {ColtShelfItem} from "../../../dto/ColtShelfItem";
import type {AcqList} from "../AcqList";
import {logger} from "../../../config/logger/Logger";

const service = require('../../../config/service.json');
const makeItem = require('../../../util/ItemUtil')
const puppeteer = require('../../../util/PuppeteerUtil');
const cheerio = require('cheerio');
let dateUtils = require('../../../util/DateUtil');
const wait = require('../../../util/WaitUtil')
const validate = require('../../../util/ValidatorUtil')

const COLLECT_SITE: string = 'lg.dns-shop.ru'
const SITE_NAME: string = 'DNS'

class DnsKeywordList implements AcqList {

    _glbConfig: { [key: string]: any; };
    collectSite: string;

    constructor(config: { [key: string]: any; }, collectSite: string) {
        this._glbConfig = config;
        this._glbConfig.userDataDir = service.LIST_PUPPET_PROFILE;
        this.collectSite = collectSite;
    }

    /**
     * "category" : {"name":"DNS > ТВ и мультимедиа > Телевизоры и аксессуары > Телевизоры", "url":"https://www.dns-shop.ru/catalog/17a8ae4916404e77/televizory/"}
     *  요청 body
     * @param category
     */

    async getItemUrls(category: any): Promise<Array<ColtBaseUrlItem>> {

        const [browser, context, page] = await puppeteer.getPage(this._glbConfig)

        let coltBaseUrlList: Array<ColtBaseUrlItem> = new Array();
        let detailPage: any
        let currentUrl: string = '';
        let param: string = '?p=';
        let totalCnt: number;
        try {
            let url: string = category.categoryUrl;
            try {
                await page.goto(url, {waitUntil: ["networkidle2"], timeout: 80000});
                await page.waitForSelector('body > div.container.category-child > div > div.products-page__content > div.products-page__list > div.products-list > div > div > div > div.catalog-product__image > a > picture > img', {visible: true});
                await page.waitForSelector('div.product-buy__price', {timeout: 80000});
                await page.mouse.wheel({deltaY: 1000});
                await page.mouse.wheel({deltaY: 1000});
                await page.mouse.wheel({deltaY: 1000});
                await page.mouse.wheel({deltaY: 1000});
            } catch (error) {
                if (error instanceof puppeteer.errors.TimeoutError) {
                    logger.error('TimeOut Error!')
                } else {
                    logger.error(error.stack);
                }
            }
            detailPage = cheerio.load(await page.content());

            //검색어 진입시 redirect되므로 현재 url로 요청보내야함
            if (category.categoryNameList.includes('LGEG')) {
                currentUrl = await page.url();
                if (currentUrl.includes('?')) param = '&p=';
                totalCnt = detailPage('span.products-count')//.text().replaceAll(/\d+ категориях/gm, '').replaceAll(/\d+ категории/gm, '').replaceAll(/\D+/gm, '');
            } else {
                totalCnt = detailPage('div.products-page__title').text().replaceAll(/\d+ категориях/gm, '').replaceAll(/\d+ категории/gm, '').replaceAll(/\D+/gm, '');
                currentUrl = category.categoryUrl;
            }

            totalCnt = totalCnt > 2000 ? 2000 : totalCnt;
            logger.info('#Category: ' + category.categoryNameList + ', List Total Count: ' + totalCnt);
            if (totalCnt == 0) {
                logger.info('#Empty Result!, cate -> ' + category.categoryNameList + ' , url -> ' + url)
                return coltBaseUrlList;
            }

            let pageSize: number = 18;
            let pageCnt: number = Math.floor((totalCnt / pageSize));
            let mod: number = (totalCnt % pageSize);
            if (mod > 0) pageCnt = pageCnt + 1;

            for (let pageNum = 1; pageNum <= 1; pageNum++) {
                if (pageNum > 1) {
                    try {
                        let urlUpdate = currentUrl + param + pageNum;
                        await page.goto(urlUpdate, {waitUntil: "networkidle2"}, {timeout: 30000})
                        await page.waitForSelector('body > div.container.category-child > div > div.products-page__content > div.products-page__list > div.products-list > div > div > div > div.catalog-product__image > a > picture > img', {visible: true}, {timeout: 15000})
                        await page.waitForSelector('div.product-buy__price', {timeout: 15000});

                        await page.mouse.wheel({deltaY: 1000});
                        await page.mouse.wheel({deltaY: 1000});
                        await page.mouse.wheel({deltaY: 1000});
                        await page.mouse.wheel({deltaY: 1000});
                    } catch (error) {
                        if (error instanceof puppeteer.errors.TimeoutError) {
                            logger.error('TimeOut Error!')
                        } else {
                            logger.error(error.stack);
                        }
                    }

                    let detailPageUpdate: any = cheerio.load(await page.content());
                    await parsingItemList(category, detailPageUpdate, pageNum, coltBaseUrlList);

                } else {
                    await parsingItemList(category, detailPage, pageNum, coltBaseUrlList);
                }
                await wait.sleep(2);
                logger.info("pageNum: " + pageNum + " , totalList:" + coltBaseUrlList.length);
            }
        } catch (error) {
            logger.error(error.stack);

        } finally {
            await puppeteer.close(browser, page, this._glbConfig)
        }

        return coltBaseUrlList;
    }

}


async function parsingItemList(categoryList: Array<string>, detailPage: any, pageNum: number, coltBaseUrlList: Array<ColtBaseUrlItem>): Promise<void> {
    let rank: number = coltBaseUrlList.length + 1;

    detailPage('div.products-page__content > div.products-page__list  div.catalog-product.ui-button-widget').each((index: number, content: any) => {
        let bsItem: ColtBaseUrlItem = new ColtBaseUrlItem(new ColtShelfItem());
        let bsCate: ColtBaseUrlCate = new ColtBaseUrlCate();
        let bsRank: ColtBaseUrlRank = new ColtBaseUrlRank();
        let parentDiv: any = detailPage(content);
        let url: string = 'https://www.dns-shop.ru' + parentDiv.find('div > a ').attr('href');
        let goodsName: string = parentDiv.find('div > a > span').text();
        let thumbnail: string = parentDiv.find('div.catalog-product__image > a > picture > img').attr('src');
        if (validate.isNotUndefinedOrEmpty(thumbnail)) {
            thumbnail = '';
        }
        let priceDiv: any = parentDiv.find('div.product-buy__price').text().replaceAll(/\s+/gm, '');
        let priceInfo: Array<any> = priceDiv.split('₽')
        let orgPrice: number = Math.max(priceInfo[0], priceInfo[1]);
        let disPrice: number = Math.min(priceInfo[0], priceInfo[1]);
        if (Object.is(orgPrice, NaN)) orgPrice = 0;
        if (Object.is(disPrice, NaN)) disPrice = 0;

        let avgPoint: string = parentDiv.find('div.catalog-product__stat > a.catalog-product__rating').attr('data-rating');
        let totalEvalutCnt: string = parentDiv.find('div.catalog-product__stat > a.catalog-product__rating').text();
        if (totalEvalutCnt.includes('k')) {
            totalEvalutCnt = totalEvalutCnt.replaceAll(/\D+/gm, '');
            totalEvalutCnt = totalEvalutCnt + '000';
        } else if (totalEvalutCnt.includes('нет отзывов')) {
            totalEvalutCnt = totalEvalutCnt.replaceAll(/\D+/gm, '0');
        }
        let regex: RegExp = /product\/(\w+)/gm;
        let itemNum: string = regex.exec(url)[1];

        makeItem.makeColtBaseUrlItem(bsItem, url, COLLECT_SITE, itemNum)
        makeItem.makeColtBaseCateItem(bsCate, categoryList)
        makeItem.makeColtBaseRankItem(bsRank, rank)
        makeItem.makeColtShelfItem(bsItem, url, COLLECT_SITE, SITE_NAME, goodsName, orgPrice, disPrice, totalEvalutCnt,
            avgPoint, thumbnail, '')

        bsItem.coltBaseUrlCateList.push(bsCate)
        bsItem.coltBaseUrlRank = bsRank;
        coltBaseUrlList.push(bsItem); //

        rank++;
    });
}

export {DnsKeywordList};
