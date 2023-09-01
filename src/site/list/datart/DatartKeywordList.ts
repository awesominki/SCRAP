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

const COLLECT_SITE: string = 'dynamic.datart.cz'
const SITE_NAME: string = 'DATART_CZ_DP'

class DatartKeywordList implements AcqList {

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
        let currentUrl: string = category.categoryUrl;
        let param: string = '&page=';
        let totalCnt: number;
        try {
            let url: string = category.categoryUrl;
            try {
                await page.goto(url, {waitUntil: ["networkidle2"], timeout: 80000});
                await page.waitForSelector('div.row.row-no-padding > div > div > div > a', {timeout: 80000});
                await page.mouse.wheel({deltaY: 1000});
                await page.mouse.wheel({deltaY: 1000});
                await page.mouse.wheel({deltaY: 1000});
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
            // if (category.categoryNameList.includes('LGEG')) {
            //     currentUrl = await page.url();
            //     if (currentUrl.includes('?')) param = '&p=';
            //     totalCnt = detailPage('span.products-count')//.text().replaceAll(/\d+ категориях/gm, '').replaceAll(/\d+ категории/gm, '').replaceAll(/\D+/gm, '');
            // } else {
            //     totalCnt = detailPage('div.products-page__title').text().replaceAll(/\d+ категориях/gm, '').replaceAll(/\d+ категории/gm, '').replaceAll(/\D+/gm, '');
            //     currentUrl = category.categoryUrl;
            // }

            totalCnt = totalCnt > 2000 ? 2000 : totalCnt;
            logger.info('#Category: ' + category.categoryNameList + ', List Total Count: ' + totalCnt);
            if (totalCnt == 0) {
                logger.info('#Empty Result!, cate -> ' + category.categoryNameList + ' , url -> ' + url)
                return coltBaseUrlList;
            }

            let pageSize: number = 48;
            let pageCnt: number = detailPage('#snippet--searchPaginationBottom > div > div.pagination-wrapper > ul > li:nth-child(6) > a').text();
            let mod: number = (totalCnt % pageSize);
            if (mod > 0) pageCnt = pageCnt + 1;

            for (let pageNum = 1; pageNum <= pageCnt; pageNum++) {
                if (pageNum > 1) {
                    try {
                        let urlUpdate = currentUrl + param + pageNum;
                        console.log("urlUpdate : " + urlUpdate)
                        await page.goto(urlUpdate, {waitUntil: "networkidle2"}, {timeout: 30000})
                        //await page.waitForSelector('body > div > div > div > div.jsx-310365115 pod-group--container container > selection.jsx-310365115 pod-group--products > div > div.jsx-1221811815 search-results--products > div > div > div > div > a > picture > img', {visible: true}, {timeout: 15000})
                        await page.waitForSelector('div.row.row-no-padding > div > div > div > a', {timeout: 15000});

                        await page.mouse.wheel({deltaY: 1000});
                        await page.mouse.wheel({deltaY: 1000});
                        await page.mouse.wheel({deltaY: 1000});
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

    detailPage('div.row.row-no-padding > div > div > div').each((index: number, content: any) => {
        let bsItem: ColtBaseUrlItem = new ColtBaseUrlItem(new ColtShelfItem());
        let bsCate: ColtBaseUrlCate = new ColtBaseUrlCate();
        let bsRank: ColtBaseUrlRank = new ColtBaseUrlRank();
        let parentDiv: any = detailPage(content);
        let url: string = 'https://www.datart.cz' + parentDiv.find('a.product-box-link-box').attr('href');
        let goodsName: string = parentDiv.find('div > a > span > b.jsx-1833870204.copy2.primary.jsx-2889528833.normal').text();
        let thumbnail: string = parentDiv.find('div.jsx-1833870204.jsx-3831830274.pod-head > div > a > picture > img').attr('src');
        // if (validate.isNotUndefinedOrEmpty(thumbnail)) {
        //     thumbnail = '';
        // }
        let itemNum: number = parentDiv.find('div > div > div > div > div > div > button.btn.btn-link.btn-compare').attr('id').replaceAll(/[^0-9]/g, '');

        // let disPrice: any = parentDiv.find('span.copy10.primary.medium.jsx-2889528833.normal').text().replaceAll(/\s+/gm, "").replaceAll("$","").replaceAll(".","");
        // let orgPrice: any = "";
        // if (parentDiv.find('span.copy3.septenary.medium.jsx-2889528833.normal').text() !== '') {
        //     orgPrice = parentDiv.find('span.copy3.septenary.medium.jsx-2889528833.normal').text().replaceAll(/\s+/gm, "").replaceAll("$", "").replaceAll(".","");
        // }
        // else if(parentDiv.find('span.copy3.primary.medium.jsx-2889528833.normal').text() !== ''){
        //     orgPrice = parentDiv.find('span.copy3.primary.medium.jsx-2889528833.normal').text().replaceAll(/\s+/gm, "").replaceAll("$", "").replaceAll(".","");
        // }
        // else{
        //     orgPrice = parentDiv.find('span.copy10.primary.medium.jsx-2889528833.normal').text().replaceAll(/\s+/gm, "").replaceAll("$", "").replaceAll(".","");
        // }
        // if (Object.is(orgPrice, NaN)) orgPrice = '';
        // if (Object.is(disPrice, NaN)) disPrice = '';

        // let avgPoint: string = parentDiv.find('div.jsx-1833870204.jsx-3831830274.pod-rating.rating-rebranding.pod-rating-4_GRID > div.jsx-1900341405.ratings').attr('data-rating');
        // let totalEvalutCnt: string = parentDiv.find('div.jsx-1833870204.jsx-3831830274.pod-rating.rating-rebranding.pod-rating-4_GRID > span.jsx-2146889120.reviewCount.reviewCount-4_GRID').text().replaceAll("(","").replaceAll(")","");
        // if (totalEvalutCnt.includes('k')) {
        //     totalEvalutCnt = totalEvalutCnt.replaceAll(/\D+/gm, '');
        //     totalEvalutCnt = totalEvalutCnt + '000';
        // } else if (totalEvalutCnt.includes('нет отзывов')) {
        //     totalEvalutCnt = totalEvalutCnt.replaceAll(/\D+/gm, '0');
        // }

        makeItem.makeColtBaseUrlItem(bsItem, url, COLLECT_SITE, itemNum)
        makeItem.makeColtBaseCateItem(bsCate, categoryList)
        makeItem.makeColtBaseRankItem(bsRank, rank)
        //makeItem.makeColtShelfItem(bsItem, url, COLLECT_SITE, SITE_NAME, goodsName, orgPrice, disPrice, totalEvalutCnt,
        //    avgPoint, thumbnail, '')

        bsItem.coltBaseUrlCateList.push(bsCate)
        bsItem.coltBaseUrlRank = bsRank;
        coltBaseUrlList.push(bsItem); //

        rank++;
    });
}

export {DatartKeywordList};
