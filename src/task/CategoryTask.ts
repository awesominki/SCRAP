import type {AcqCategory} from "../site/category/AcqCategory";
import type {Category} from "../data/Category";

export class CategoryTask {
    private readonly _collectSite: string;
    private readonly _classPath: string;
    private readonly _config: { [key: string]: any; };

    constructor(collectSite, dirName, chromeConfig) {
        this._collectSite = collectSite;
        this._classPath = dirName;
        this._config = chromeConfig;
    }

    async execute(url : string, filterList : string) : Promise<Array<Category>> {

        const cateClassModule = require(this._classPath);
        const cateClass = Object.values(cateClassModule)[0] as
            new (config: { [key: string]: any; }, collectSite: string, cnt: number) => AcqCategory;
        const category = new cateClass(this._config, this._collectSite, 0);
        const item = await category.getCategory(url ,filterList);
        return item;
    }
}