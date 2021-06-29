import * as selenium from "selenium-webdriver";
import * as chrome from "selenium-webdriver/chrome";
import { sleep } from "../Utils";

export class WebDriver {
    driverPromise: selenium.ThenableWebDriver;
    _driver: selenium.WebDriver | null;
    
    constructor(private cookies: { [name: string]: string } = {}) {
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

        this.driverPromise = new selenium.Builder()
            .withCapabilities(cap)
            .build();
        this._driver = null;
    }

    private async getDriver(url: string = ""): Promise<selenium.WebDriver> {
        if (!this._driver) {
            if (url == "") {
                throw "Not specified domain";
            }
            
            // Get driver
            const driver = await this.driverPromise;
            this._driver = driver;

            // Delete cookies
            await driver.manage().deleteAllCookies();

            // Navigate url and set cookies
            await driver.get(url);
            const promises = Object.keys(this.cookies).map(name => {
                return driver.manage().addCookie({ name, value: this.cookies[name] });
            });
            await Promise.all(promises);
        }
        return this._driver;
    }

    async navigate(url: string) {
        console.log(`    webdriver:navigate ${url}`);
        const driver = await this.getDriver(url);
        driver.get(url);
    }

    async quit() {
        console.log(`    webdriver:quit`);
        (await this.getDriver()).quit();
    }

    async get(xpath: string) {
        const elms = await this.find(xpath);
        return elms.length > 0 ? elms[0] : null;
    }

    async getOne(xpath: string) {
        const elms = await this.find(xpath, true);
        if (elms.length == 0) {
            throw `${xpath} is not found`
        }
        return elms[0];
    }

    async find(xpath: string, wait: boolean = false) {
        const driver = await this.getDriver();
        const locator = selenium.By.xpath(xpath);
        if (wait) {
            await driver.wait(selenium.until.elementLocated(locator), 6000);
        }
        return (await driver.findElements(locator)).map(x => new WebElement(x, xpath));
    }

    async getCookies(): Promise<{ [name: string]: string }> {
        const cookies = await (await this.getDriver()).manage().getCookies();
        console.log(`    webdriver:getCookies length=${cookies.length}`);
        return cookies.reduce((m, x) => {
            m[x.name] = x.value;
            return m;
        }, {});
    }

    async getHtml() {
        const driver = await this.getDriver();
        const element = await driver.findElement(selenium.By.xpath("html"));
        return await element.getAttribute("innerHTML");
    }
}

class WebElement {
    constructor(private elm: selenium.WebElement, private xpath: string) {
    }

    async sendKeys(keys: string) {
        await this.elm.getDriver().wait(async () => {
            const displayed = await this.elm.isDisplayed();
            return displayed;
        });
        await this.elm.sendKeys(keys);
        /*await this.elm.getDriver().wait(async () => {
            const text = await this.elm.getAttribute("value");
            return text == keys;
        });*/        
    }

    async submit() {
        await this.elm.getDriver().wait(async () => {
            const displayed = await this.elm.isDisplayed();
            return displayed;
        });
        await this.elm.submit();
    }

    async click() {
        try {
            await this.elm.click();
        } catch(exp) {
            if (exp instanceof selenium.error.StaleElementReferenceError) {
                console.log(exp);
            } else {
                throw exp;
            }
        }
    }
}