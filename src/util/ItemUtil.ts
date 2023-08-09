import type {ColtItem} from "../dto/ColtItem";
import type {ColtBaseUrlItem} from "../dto/ColtBaseUrlItem";
import type {ColtBaseUrlCate} from "../dto/ColtBaseUrlCate";
import type {ColtBaseUrlRank} from "../dto/ColtBaseUrlRank";
import type {ColtItemDiscount} from "../dto/ColtItemDiscount";

import {ColtImage} from "../dto/ColtImage";
import {ColtItemIvt} from "../dto/ColtItemIvt";

import * as dateUtil from "./DateUtil";
import * as hash from "./HashUtil";

import {logger} from "../config/logger/Logger";


export async function makeColtItem(cItem: ColtItem, url, collectSite, siteName, priceStdCd, goodsName, itemNum, category,
                                   brandName, fivePoint, totalEvalutCnt, addInfo, price, sitePrice) {
    cItem.collectSite = collectSite;
    cItem.collectUrl = url;
    cItem.siteName = siteName;
    cItem.priceStdCd = priceStdCd;
    cItem.itemNum = itemNum;
    cItem.goodsName = goodsName;
    cItem.goodsCate = category;
    cItem.brandName = brandName;
    cItem.price = price;
    cItem.sitePrice = sitePrice;
    cItem.totalEvalCnt = totalEvalutCnt;
    cItem.fivePoint = fivePoint;
    cItem.addInfo = addInfo;
}

export async function makeColtItemIvt(cIvt: ColtItemIvt, stockId, addPrice, colorOption, sizeOption, styleOption,
                                      giftOption, stockOption, stockAmount) {
    cIvt.stockId = stockId;
    cIvt.addPrice = addPrice;
    cIvt.colorOption = colorOption;
    cIvt.sizeOption = sizeOption;
    cIvt.styleOption = styleOption;
    cIvt.giftOption = giftOption;
    cIvt.stockOption = stockOption;
    cIvt.stockAmount = stockAmount;
}

export async function makeColtItemDisCount(cDis: ColtItemDiscount, discountPrice, discountRate) {
    cDis.discountPrice = discountPrice
    cDis.discountRate = discountRate
}

export async function makeNotFoundColtItem(cItem: ColtItem, url, collectSite, siteName, priceStdCd, itemNum) {
    cItem.collectSite = collectSite;
    cItem.collectUrl = url;
    cItem.siteName = siteName;
    cItem.priceStdCd = priceStdCd;

    cItem.itemNum = itemNum;
    cItem.goodsName = 'Page Not Found';
    cItem.goodsCate = 'NO_CATEGORY';
    cItem.brandName = 'NO_BRANDNAME';
    cItem.price = '0';
    cItem.sitePrice = '0';
    cItem.totalEvalCnt = 0;
    cItem.fivePoint = 0.0;
    cItem.addInfo = '';

    const coltImage = new ColtImage();
    coltImage.goodsImage = 'no image';
    coltImage.hash = Number(hash.toHash('no image'));
    cItem.coltImageList.push(coltImage);

    const ivt = new ColtItemIvt();
    ivt.stockId = itemNum;
    ivt.addPrice = 0;
    ivt.stockOption = 'Not Found';
    ivt.stockAmount = -999;
    cItem.coltItemIvtList.push(ivt);

    logger.info('Not Found Page! , ITEM_NUM: ' + itemNum);
}

export async function makeColtBaseUrlItem(bsItem: ColtBaseUrlItem, url, collectSite, itemNum) {
    bsItem.itemNum = itemNum;
    bsItem.url = url;
    bsItem.type = 'M';
    bsItem.newYn = 0;
    bsItem.collectSite = collectSite;
    bsItem.uptDt = dateUtil.currentDate();
    bsItem.collectDate = dateUtil.currentDay();
}

export async function makeColtBaseCateItem(bsCate: ColtBaseUrlCate, category) {
    bsCate.cate = category.categoryNameList;
    bsCate.cateUrl = category.categoryUrl;
    bsCate.regDt = dateUtil.currentDate();
}

export async function makeColtBaseRankItem(bsRank: ColtBaseUrlRank, rank) {
    bsRank.rank = rank;
    bsRank.regDt = dateUtil.currentDate();
}

export async function makeColtShelfItem(bsItem: ColtBaseUrlItem, url, collectSite, siteName, goodsName, orgPrice, disPrice,
                                        totalEvalutCnt, avgPoint, thumbnail, addInfo) {
    bsItem.coltShelfItem.goodsName = goodsName;
    bsItem.coltShelfItem.collectSite = collectSite;
    bsItem.coltShelfItem.collectUrl = url;
    bsItem.coltShelfItem.siteName = siteName;
    bsItem.coltShelfItem.price = orgPrice;
    bsItem.coltShelfItem.discountPrice = disPrice;
    bsItem.coltShelfItem.totalEvalut = totalEvalutCnt;
    bsItem.coltShelfItem.avgPoint = avgPoint;
    bsItem.coltShelfItem.seller = '';
    bsItem.coltShelfItem.thumbnail = thumbnail;
    bsItem.coltShelfItem.addInfo = addInfo;
    bsItem.coltShelfItem.regDt = dateUtil.currentDate();
    bsItem.coltShelfItem.uptDt = dateUtil.currentDate();
}