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

class FalabellaDetail implements AcqDetail {
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
                    await wait.sleep(5);
                } catch (e) {
                    logger.error(e.message);
                    await wait.sleep(2);
                }
                await wait.sleep(5);


                let cItem :ColtItem = new ColtItem();
                const detailPage :any = cheerio.load(await page.content());

                const goodsName :string = detailPage('h1.jsx-1267102499.product-name.fa--product-name.false').text();
                const itemNum :string = await this.getItemNum(url);
                if (!await validator.isNotUndefinedOrEmpty(goodsName)) {
                    await makeItem.makeNotFoundColtItem(cItem, url, this.collectSite, itemNum, detailPage, '17');
                    return cItem;
                }
                logger.info('itemNum: ' + itemNum + ' TITLE:' + goodsName);

                let goodsCate :string = await this.getCateInfo(detailPage);
                if (await validator.isNotUndefinedOrEmpty(goodsCate)) {
                    goodsCate = '(#M)' + goodsCate;
                } else {
                    goodsCate = 'NO_CATEGORY';
                }

                // product_code -> 제품의 모델넘머로 addInfo에 추가해주면 좋음
                const product_code :string = detailPage('div.product-card-top__code').text().replaceAll(/\D+/gm, '');
                let brand_name :string = detailPage('a.product-card-top__brand > img').attr('alt');
                let avgPoint :number = detailPage('div.product-card-top__stat > a.product-card-top__rating').attr('data-rating') //as unknown as number;
                if (!await validator.isNotUndefinedOrEmpty(avgPoint)) avgPoint = 0;
                let totalEvalutCnt :number= await this.getTotalEvalutCnt(detailPage) // as unknown as number;
                let addInfo :string = await this.getAddInfo(detailPage, product_code);


                //--price--
                let priceDiv :any = detailPage('div.product-card-top.product-card-top_full > div.product-card-top__buy > div.product-buy.product-buy_one-line > div >div.product-buy__price').text().replaceAll(/\s/gm, '');
                let priceInfo :Array<number> = priceDiv.split('₽');
                let orgPrice :number = Math.max(priceInfo[0], priceInfo[1]);
                let disPrice :number = Math.min(priceInfo[0], priceInfo[1]);
                if (Object.is(orgPrice, NaN)) orgPrice = 0;
                if (Object.is(disPrice, NaN)) disPrice = 0;
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
                await makeItem.makeColtItem(cItem, url, this.collectSite, 'Dns', '017', goodsName, itemNum, goodsCate,
                    brand_name, avgPoint, totalEvalutCnt, addInfo, orgPrice, disPrice);

                //--option--
                // item이 해당하는 옵션들을 가져옴
                let optionList :Array<string> = await this.getOptionInfo(detailPage);

                //--image and video--
                // 비디오와 이미지 url을 가져옴
                let imageList :Array<string> = [];
                try {
                    imageList = await this.getImageAndVideoInfo(detailPage, context);
                } catch (error) {
                    console.log('getImageAndVideoInfo Fail');
                }
                // 가져온 미디어 url들을 coltImage 데이터로 만들어서 cItem에 추가한다
                imageList.map((image) => {
                    const coltImage :ColtImage = new ColtImage();
                    coltImage.goodsImage = image;
                    coltImage.hash = hash.toHash(image);
                    cItem.coltImageList.push(coltImage);
                });

                // 재고 정보 추가
                await this.getStockInfo(cItem, page, detailPage, url, optionList, product_code, ivtAddPrice);
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
    async getStockInfo(cItem :ColtItem, page :any, detailPage :any, url :string, optionList :Array<string>, product_code :string, ivtAddPrice:number) {
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
                        cItem.colorOption = option1;
                        break;
                    case 1:
                        option2 = optionList[i];
                        cItem.sizeOption = option2;
                        break;
                    case 2:
                        option3 = optionList[i];
                        cItem.styleOption = option3;
                        break;
                    case 3:
                        option4 = optionList[i];
                        cItem.giftOption = option4;
                        break;
                }
            }
        }

        // stockOption 은 재고있음과 재고없음 둘로 나뉜다(In stock, Out of stock)
        let stockOption :string = '';
        let stockAmout :number = -999;

        let avail :string = detailPage('div.product-card-top.product-card-top_full > div.product-card-top__buy > div.product-buy.product-buy_one-line > div').text();
        let avail1 :string = detailPage('div.order-avail-wrap.order-avail-wrap_not-avail').text();
        let avail2 :string = detailPage('div.product-card-top__buy > div.product-buy > button.button-ui.notify-btn').text();
        let voidChk :any = detailPage('div.product-card-top__buy > div.product-buy > button.button-ui.buy-btn');


        // 품절 확인
        if (avail.includes('Товара нет в наличии')) {
            stockOption = 'Out of stock';
            logger.info('The product is out of stock , ' + avail);
        } else if (avail.includes('Скоро будет доступен')) {
            stockOption = '';
            logger.info('Coming Soon , ' + avail + ",  product_code: " + product_code);
        } else if (avail.includes('Продажи прекращены')) {
            stockOption = 'Out of stock';
            logger.info('Sales discontinued , ' + avail);
        } else if (avail1.includes('Товара нет в наличии')) {
            stockOption = 'Out of stock';
            logger.info('The product is out of stock , ' + avail1.replaceAll(/\n/gm, ''));
        } else if (avail2.includes('Уведомить')) {
            stockOption = 'Out of stock';
            logger.info('The product is notify , ' + avail2.replaceAll(/\n/gm, ''));
        } else if (voidChk.length == 0) {
            stockOption = '';
            logger.info('The product is Void , product_code: ' + product_code);
        } else {
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

    async getOptionInfo(detailPage :any) :Promise<string[]> {
        let optionList :Array<string> = [];
        detailPage('div.multicard.product-card-top__multi >div.multicard__param').each((index : number, el : any) => {
            let optionDiv :any = detailPage(el);
            let title :string = optionDiv.find('> div.multicard__param-title').text().replaceAll(/\s+/gm, '');  // ex) 색상, size
            let label :string = '';     // ex) 파란색, L
            let input = optionDiv.find('> div.multicard__values > input');
            input.each((index : number, el : any) => {
                if (el.attribs.checked !== undefined) {     // 선택된 옵션을 찾음
                    label = optionDiv.find('> div.multicard__values > label').eq(index).text();
                }
            });
            optionList.push(title + label);
        });
        return optionList;
    }

    async getTotalEvalutCnt(detailPage :any) :Promise<number> {
        let totalEvalutCnt :string = detailPage('div.product-card-top__stat > a.product-card-top__rating').text();
        if (totalEvalutCnt.includes('k')) {
            totalEvalutCnt = totalEvalutCnt.replaceAll(/\D+/gm, '');
            totalEvalutCnt = totalEvalutCnt + '000';
        } else if (totalEvalutCnt.includes('нет отзывов')) {
            totalEvalutCnt = totalEvalutCnt.replaceAll(/\D+/gm, '0');
        }
        return totalEvalutCnt as unknown as number;
    }

    async getAddInfo(detailPage :any, product_code :string) {
        var addinfoObj :Object = new Object();
        addinfoObj['Product code'] = product_code;
        let service_rating :string = detailPage('div.product-card-top__stat > a.product-card-top__service-rating').text().replaceAll(/,/gm, '.');
        let service_comment :string = detailPage('div.product-card-top__stat > a.product-card-top__comments').text().trim();
        if (await validator.isNotUndefinedOrEmpty(service_comment)) addinfoObj['Communicator'] = service_comment;
        if (await validator.isNotUndefinedOrEmpty(service_rating)) addinfoObj['Reliability assessment'] = service_rating;


        detailPage('div.product-characteristics div.product-characteristics__group > div.product-characteristics__spec').each((index :number, el :any) => {
            let addInfo :any = detailPage(el);
            let key :string = addInfo.find('> div.product-characteristics__spec-title').text();
            key = key.replaceAll(/^\s+|\s+$/gm, "");
            let value :string = addInfo.find('> div.product-characteristics__spec-value').text();
            value = value.replaceAll(/^\s+|\s+$/gm, "");
            if (validator.isNotUndefinedOrEmpty(key) && validator.isNotUndefinedOrEmpty(value)) {
                if (key.includes('Модель')) addinfoObj[key] = value;
            }
        });

        delete addinfoObj["Режимы и функции съемки"];
        delete addinfoObj["Режимы и функции фотосъемки"];
        delete addinfoObj["Особенности, дополнительно"];
        delete addinfoObj["Особенности и функции видеосъемки"];

        return jsonToStr(addinfoObj);

    }

    async getCateInfo(detailPage :any) :Promise<string> {
        let cateList :Array<string> = [];
        let catelength :number = detailPage('ol.breadcrumb-list > li ').length - 1;
        detailPage('ol.breadcrumb-list > li ').each((index, el) => {
            let cateName :string = '';
            if (index == catelength - 1) {
                return;
            } else if (index == catelength) {
                cateName = detailPage(el).find(' > span').text();
                cateList.push(cateName);
            } else {
                cateName = detailPage(el).find(' > a').text();
                cateList.push(cateName);
            }
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


export {FalabellaDetail};
