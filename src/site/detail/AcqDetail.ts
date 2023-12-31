import type {ColtItem} from "../../dto/ColtItem";

export interface AcqDetail {
    _glbConfig: { [key: string]: any; };
    collectSite: string;

    // extractFromItemList(url) :Promise<ColtItem>
    extractItemDetail: (url: string) => Promise<ColtItem>;
}