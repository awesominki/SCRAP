import {DnsCategory} from "./src/site/category/dns/DnsCategory";
import {DnsDetail} from "./src/site/detail/dns/DnsDetail";
import {options as chromeConfig} from "./src/config/chrome/ChromeConfig";
import {FalabellaDetail} from "./src/site/detail/falabella/FalabellaDetail";
import {FalabellaKeywordList} from "./src/site/list/falabella/FalabellaKeywordList";
import {FalabellaLGKeywordList} from "./src/site/list/falabella/FalabellaLGKeywordList";

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
    // const item = await new FalabellaDetail(chromeConfig,'dynamic.falabella.cl')
    //     .extractItemDetail("https://www.falabella.com/falabella-cl/product/117661717/ESTABILIZADOR-ZHIYUN-CRANE-2S/117661718")


    console.log(item)
}



launch();