const service = require("../config/service.json");
const request = require('request');


export async function pushProxy(global) {
    let ip = 'zproxy.lum-superproxy.io:22225'

    if (!global.args[global.args.length - 1].includes('--proxy-server='))
        global.args.push('--proxy-server=' + ip);
}


export async function popProxy(global) {
    if (global.args[global.args.length - 1].includes('--proxy-server=')) {
        global.args.pop()
    }
}


export async function pageSet(page, global) {
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false
        });
    });
    // 기본값은 서비스  그렇지 않으면 매개변수로 사용
    let credential = await getPageCredential(global)

    await page.authenticate(credential);
    await page.setDefaultTimeout(500000);
    await page.setDefaultNavigationTimeout(30000);
    await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36");
};

async function getPageCredential(global) {
    return {
        username: global.proxyConfig.username,
        password: global.proxyConfig.password,
    }
}