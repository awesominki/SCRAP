import {DnsCategory} from "./src/site/category/dns/DnsCategory";
import {DnsDetail} from "./src/site/detail/dns/DnsDetail";
import {options as chromeConfig} from "./src/config/chrome/ChromeConfig";
import {FalabellaDetail} from "./src/site/detail/falabella/FalabellaDetail";
import {FalabellaKeywordList} from "./src/site/list/falabella/FalabellaKeywordList";
import {FalabellaLGKeywordList} from "./src/site/list/falabella/FalabellaLGKeywordList";
import {DatartKeywordList} from "./src/site/list/datart/DatartKeywordList";
import {DatartLGKeywordList} from "./src/site/list/datart/DatartLGKeywordList";
import {DatartDetail} from "./src/site/detail/datart/DatartDetail";

async function launch(){
    const category = {}



    //매개 변수는 사이트 메인페이지
    /*const item = await new DnsCategory(chromeConfig,'lg.dns-shop.ru',[])
        .getCategory({})
*/

     // list용 실행
     // category['categoryNameList'] = ["DNS", "ТВ и мультимедиа", "Телевизоры и аксессуары" ,"Телевизоры"]
     // category['categoryUrl'] = "https://www.datart.cz/vyhledavani/filter/x:lb.parametricFilter.brand:LG?q=lg&"
     // category['categoryNameList'] = category['categoryNameList'].join( " > ")
     // const item = await new DatartLGKeywordList(chromeConfig,'dynamic.datart.cz').getItemUrls(category)


    // detail용 실행
    const item = await new DatartDetail(chromeConfig,'dynamic.datart.cz')
        .extractItemDetail("https://www.datart.cz/chladnicka-s-mraznickou-lg-gbp62mcnbc-cerna.html")


    console.log(item)
}



launch();