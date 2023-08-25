import {ColtItem} from "../../../dto/ColtItem";
import {ColtImage} from "../../../dto/ColtImage";
import {ColtItemDiscount} from "../../../dto/ColtItemDiscount";
import {ColtItemIvt} from "../../../dto/ColtItemIvt";
import type {AcqDetail} from "../AcqDetail";
import {logger} from "../../../config/logger/Logger";


const cheerio = require('cheerio');
const hash = require('../../../util/HashUtil');
const {jsonToStr, strToJson} = require('../../../util/Jsonutil');
const service = require('../../../config/service.json');
const wait = require('../../../util/WaitUtil')
const makeItem = require('../../../util/ItemUtil')
const puppeteer = require('../../../util/PuppeteerUtil')
const validator = require('../../../util/ValidatorUtil')

class DatartDetail implements AcqDetail {
    _glbConfig: { [key: string]: any; };
    collectSite: string;

    constructor(config: { [key: string]: any; }, collectSite: string) {
        this._glbConfig = config;
        this._glbConfig.userDataDir = service.DETAIL_PUPPET_PROFILE;
        this.collectSite = collectSite;

    }

    async extractItemDetail(url:string): Promise<ColtItem> {
        try {

            const [browser, context, page] = await puppeteer.getPage(this._glbConfig)

            try {
                try {
                    await page.goto(url, {waitUntil: "networkidle2"}, {timeout: 30000});
                    //await page.click('button.jsx-3459521287.mkp-swatchButton.mkp-swatchButton-collapseButton');
                    await wait.sleep(5);
                } catch (e) {
                    logger.error(e.message);
                    await wait.sleep(2);
                }
                await wait.sleep(5);


                let cItem :ColtItem = new ColtItem();
                const detailPage :any = cheerio.load(await page.content());

                const goodsName :string = detailPage('h1.product-detail-title').text();
                const itemNum :string = detailPage('div.code-widget > span:nth-child(2)').text().split(":")[1].trim();
                if (!await validator.isNotUndefinedOrEmpty(goodsName)) {
                    await makeItem.makeNotFoundColtItem(cItem, url, this.collectSite, 'Datart', detailPage, itemNum);
                    return null;
                }
                logger.info('itemNum: ' + itemNum + ' TITLE:' + goodsName);

                let goodsCate :string = await this.getCateInfo(detailPage);
                if (await validator.isNotUndefinedOrEmpty(goodsCate)) {
                    goodsCate = 'LGDP > DATART_CZ > ' + goodsCate;
                } else {
                    goodsCate = 'NO_CATEGORY';
                }

                // product_code -> 제품의 모델넘머로 addInfo에 추가해주면 좋음
                let product_code :string = detailPage('div.code-widget > span:nth-child(1)').text().split(":")[1].trim();
                // detailPage('table.jsx-428502957.specification-table > tbody.jsx-428502957 > tr.jsx-428502957').each((index :number, el :any) => {
                //     let addInfo :any = detailPage(el);
                //     if(addInfo.find('td.jsx-428502957.property-name').text() === "Modelo") {
                //         product_code = addInfo.find('td.jsx-428502957.property-value').text();
                //     }
                // });
                let brand_name :string = detailPage('div.brand-logo > a > img').attr('alt');
                let avgPoint :number = detailPage('div.rating-wrap > a > span:nth-child(2)').text(); //as unknown as number;
                if (!await validator.isNotUndefinedOrEmpty(avgPoint)) avgPoint = 0;
                let totalEvalutCnt :number= await this.getTotalEvalutCnt(detailPage) // as unknown as number;
                let addInfo :string = await this.getAddInfo(product_code,brand_name);


                //--price--
                let orgPrice :any = '';
                let disPrice :any = 0;
                if (detailPage('span.cut-price > del').first().text() !== ''){
                    orgPrice = detailPage('span.cut-price > del').first().text().replaceAll(/\s+/gm, "").replaceAll("Kč","");
                    disPrice = detailPage('div.product-price-main > div.price-wrap').text().replace(/\D/g, '');
                }
                else {
                    orgPrice = detailPage('div.product-price-main > div.price-wrap').text().replace(/\D/g, '');
                    disPrice = orgPrice;
                }
                let ivtAddPrice :number = orgPrice;

                // 할인가가 따로 존재할 때
                // ColtItemDiscount에 할인가와 할인 비율을 저장
                if (disPrice > 0) {
                    const coltDis :any = new ColtItemDiscount();
                    ivtAddPrice = disPrice;
                    let discountRate :number = Math.round((orgPrice - disPrice) / orgPrice * 100);
                    await makeItem.makeColtItemDisCount(coltDis, disPrice, discountRate)
                    cItem.coltItemDiscountList.push(coltDis);
                }


                // makeColtItem생성
                await makeItem.makeColtItem(cItem, url, this.collectSite, 'Datart', 'CZK', goodsName, itemNum, goodsCate,
                    brand_name, avgPoint, totalEvalutCnt, addInfo, orgPrice, disPrice);

                //--option--
                // item이 해당하는 옵션들을 가져옴
                let optionList :Array<string> = [];
                await this.getStockInfo(cItem, page, detailPage, url, optionList, product_code, ivtAddPrice, 1);
                let colorTitle: string = detailPage('div.jsx-560488783.color-swatch-container.fa--color-swatches__desktop > span.copy3.primary.jsx-1164622985.bold').text().replace(":", "").trim();
                cItem.colorOption = colorTitle;
                let sizeTitle: string = detailPage('span.jsx-2470060866.size-title').text();
                cItem.sizeOption = sizeTitle;
                let size : any = '';
                let colorName: string = '';
                let avail :number = 1;
                const buttonElements = await page.$$('button.jsx-911471698.colorSwatch-medium'); // 해당 클래스의 모든 버튼 요소 선택
                for (const buttonElement of buttonElements){
                    await buttonElement.click();
                    await page.waitForTimeout(1000);  // 클릭 후 잠시 기다림
                    const detailPage2 :any = cheerio.load(await page.content());
                    colorName = detailPage2('span.copy3.primary.jsx-1164622985.normal').text().trim();
                    optionList[0] = colorName;
                    let optionDiv :any = detailPage2('div.jsx-2470060866.size-options');
                    optionDiv.find('button').each(async (index: number, el: any) => {
                        avail = 1;
                        size = detailPage2(el).text().trim();
                        optionList[1] = size;
                        if(detailPage2(el).attr("disabled") !== undefined){
                            avail = 0;
                        }
                        // 재고 정보 추가
                        await this.getStockInfo(cItem, page, detailPage2, url, optionList, product_code, ivtAddPrice, avail);
                    });
                }



                return cItem;
            } catch (error) {
                logger.error(error.stack);
            } finally {
                await puppeteer.close(browser, page, this._glbConfig)
            }
        } catch (e) {
            logger.error(e.stack);
        }
    }


    // 옵션 및 재고를 추가하는 함수
    async getStockInfo(cItem :ColtItem, page :any, detailPage :any, url :string, optionList :Array<string>, product_code :string, ivtAddPrice:number,avail:number) {
        //옵션설정
        let option1 :string = '';
        let option2 :string = '';
        let option3 :string = '';
        let option4 :string = '';
        // ColtItem의 옵션 이름들에 상관없이 가져온 순서대로 넣어둔다
        if (optionList) {
            for (let i = 0; i < optionList.length; i++) {
                switch (i) {
                    case 0:
                        option1 = optionList[i];
                        break;
                    case 1:
                        option2 = optionList[i];
                        break;
                    case 2:
                        option3 = optionList[i];
                        break;
                    case 3:
                        option4 = optionList[i];
                        break;
                }
            }
        }

        // stockOption 은 재고있음과 재고없음 둘로 나뉜다(In stock, Out of stock)
        let stockOption :string = 'In stock';
        let stockAmout :number = -999;


        // 품절 확인
        if (avail == 0) {
            stockOption = 'Out of stock';
            logger.info('The product is out of stock');
        }else {
            stockOption = 'In stock';
        }

        const ivt :ColtItemIvt = new ColtItemIvt();
        await makeItem.makeColtItemIvt(ivt, product_code, ivtAddPrice, option1, option2, option3, option4, stockOption, stockAmout)
        cItem.coltItemIvtList.push(ivt);
    }

    async getImageAndVideoInfo(detailPage :any, context :any) :Promise<string[]> {
        let imageList :Array<string> = [];
        let imageJson :any;
        let videoUrl :string;

        let script = detailPage('script');
        script.each((i :number, el :any) => {
            let html :any = detailPage(el);
            let text :string = html.toString();
            if (text.includes('viewerConfig')) {
                //video Url
                let regex :RegExp= /"viewerConfig":((.*?));/gm;
                let match :string= regex.exec(text)[1];
                match = match.replaceAll(/}\)/gm, '');
                let obj :any = JSON.parse(match);
                videoUrl = obj.url;

                //image
                let regexImg :RegExp = /"images":((.*?))]/gm;
                let imgList :any = regexImg.exec(text)[1];
                imageJson = JSON.parse(imgList + ']');
            }
        });

        for (let obj of imageJson) {
            let imageUrl :string = obj.desktop.orig;
            imageList.push(imageUrl);
        }

        let videoCheck :boolean = false;
        let reqUrl :string = 'https://www.dns-shop.ru' + videoUrl;
        let videoDiv :any = detailPage('div.product-images-slider__item.product-images-slider__item_add.product-images-slider__item_video');
        if (videoDiv.length > 0) videoCheck = true;
        if (videoCheck) {
            const videoPage :any = await context.newPage();
            try {
                let videoJson :any;

                let response :any = await videoPage.goto(reqUrl, {timeout: 30000});
                await wait.sleep(3);
                let jsonArr :any = JSON.parse(await response.text());
                let tabs :any = jsonArr.data.tabs;

                for (let json of tabs) {
                    let type :string = json.type;
                    if (type == 'video') {
                        videoJson = json.objects;
                    }
                }

                for (let obj of videoJson) {
                    let youtubeUrl :string = obj.url;
                    imageList.push(youtubeUrl);
                }

            } catch (error) {
                logger.error('VideoPage Request Error!');
            } finally {
                await videoPage.close();
                return imageList;
            }

        }

        return imageList;
    }

    async getOptionInfo(detailPage :any, page) :Promise<string[]> {
        let optionList :Array<string> = [];
        let colorTitle: string = detailPage('div.jsx-560488783.color-swatch-container.fa--color-swatches__desktop > span.copy3.primary.jsx-1164622985.bold').text();
        let colorNameList:Array<string> = [];
        let size : any = '';
        let sizeList:Array<string> = [];
        let colorName: string = '';
        // colorName = detailPage('span.copy3.primary.jsx-1164622985.normal').text().trim();
        // colorNameList.push(colorName);
        const buttonElements = await page.$$('button.jsx-911471698.colorSwatch-medium'); // 해당 클래스의 모든 버튼 요소 선택
        for (const buttonElement of buttonElements){
            await buttonElement.click();
            await page.waitForTimeout(1000);  // 클릭 후 잠시 기다림
            const detailPage2 :any = cheerio.load(await page.content());
            colorName = detailPage2('span.copy3.primary.jsx-1164622985.normal').text().trim();
            colorNameList.push(colorName);
            let optionDiv :any = detailPage2('div.jsx-2470060866.size-options');
            optionDiv.find('button').each((index : number, el : any) => {
                if (el.attribs.disabled !== undefined) {     // 선택된 옵션을 찾음
                    size = detailPage2(el).text().trim();
                    sizeList.push(size);
                }
            });
        }
        console.log("sizeList : " + sizeList);
        console.log("colorName : " + colorNameList);
        optionList.push(colorTitle + colorNameList);
        return optionList;
    }

    async getTotalEvalutCnt(detailPage :any) :Promise<number> {
        let totalEvalutCnt :string = detailPage('span.text-underline').text();
        // const regex = /\((\d+)\)/; // (숫자) 패턴을 찾는 정규식
        // const match = regex.exec(totalEvalutCnt); // 정규식을 문자열에 적용하여 매치 찾기
        // let extractedNumber :any = "";
        // if (match && match[1]) {
        //     extractedNumber = match[1]; // 첫 번째 그룹에서 추출한 숫자
        // }
        return totalEvalutCnt as unknown as number;
    }

    async getAddInfo(product_code :string,brand_name :string) {
        var addinfoObj :Object = new Object();
        addinfoObj['MPC'] = product_code;
        addinfoObj['country'] = 'Czech';
        addinfoObj['brand'] = brand_name;
        return jsonToStr(addinfoObj);

    }

    async getCateInfo(detailPage :any) :Promise<string> {
        let cateList :Array<string> = [];
        detailPage('ol.breadcrumb.swiper-wrapper > li:not(:first-child)').each((index, el) => {
            let cateName :string = '';
            cateName = detailPage(el).find(' > a').text();
            cateList.push(cateName);
        });

        let goodsCate :string = cateList.join(" > ") + "";
        return goodsCate;
    }

    async getItemNum(url:string):Promise<string>{
        let regex :RegExp = /product\/(\w+)/gm;
        let itemNum :string = regex.exec(url)[1];
        return itemNum;
    }
}


export {DatartDetail};
