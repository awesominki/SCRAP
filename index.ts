import {DnsCategory} from "./src/site/category/dns/DnsCategory";
import {DnsDetail} from "./src/site/detail/dns/DnsDetail";
import {options as chromeConfig} from "./src/config/chrome/ChromeConfig";
import {FalabellaKeywordList} from "./src/site/list/falabella/FalabellaKeywordList";
import {DnsKeywordList} from "./src/site/list/dns/DnsKeywordList";

async function launch(){
    const category = {}



    //매개 변수는 사이트 메인페이지
    /*const item = await new DnsCategory(chromeConfig,'lg.dns-shop.ru',[])
        .getCategory({})
*/

     // list용 실행
     category['categoryNameList'] = ["DNS", "ТВ и мультимедиа", "Телевизоры и аксессуары" ,"Телевизоры"]
     category['categoryUrl'] = "https://www.falabella.com/falabella-cl/search?Ntt=oled77"
     category['categoryNameList'] = category['categoryNameList'].join( " > ")
     const item = await new FalabellaKeywordList(chromeConfig,'dynamic.falabella.cl').getItemUrls(category)


    // detail용 실행
    // const item = await new DnsDetail(chromeConfig,'lg.dns-shop.ru')
    //     .extractItemDetail("https://www.dns-shop.ru/product/232ec529f8212ff2/fen-enchen-air-hair-dryer-basic-version-belyj")


    console.log(item)
}



launch();