import * as selenium from "selenium-webdriver";
import * as chrome from "selenium-webdriver/chrome";
import { getRepositories } from "../system/Database";

async function main() {
    if (process.argv.length < 2) {
        return;
    }
    
    const reps = await getRepositories();
    console.log(process.argv);
    const account = await reps.yahoo.getAccount(process.argv[2]);
    if (!account || !account.cookies) {
        return;
    }

    const opt = new chrome.Options();
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36";
    opt.addArguments(`--user-agent="${userAgent}"`);

    const cap = selenium.Capabilities.chrome();

    cap.setPageLoadStrategy("normal");
    cap.set("chromeOptions", {
        w3c: false,
        args: [
        //   "--headless",
            "--window-size=1920,1080"
        ]
    });

    const driver = await new selenium.Builder()
        .withCapabilities(cap)
        .build();
    const cookies = account.cookies;
    await driver.manage().deleteAllCookies();
    await driver.get("https://auctions.yahoo.co.jp");
    const promises = Object.keys(cookies).map(name => {
        return driver.manage().addCookie({ name, value: cookies[name] });
    });
    await Promise.all(promises);
    await driver.get("https://auctions.yahoo.co.jp/user/jp/show/mystatus");
}

main();