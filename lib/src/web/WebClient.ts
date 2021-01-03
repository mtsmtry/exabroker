import * as libxmljs from "libxmljs";
import * as request from "superagent"
import * as fs from "fs";

function extractElements(elms: libxmljs.Node[]) {
    return elms
        .filter(x => x.type() == "element")
        .map(x => new Element(x as libxmljs.Element, ""));
}

export class WebClient {
    cookies: { [name: string]: string };

    constructor() {
        this.cookies = {};
    }

    setCookies(cookies: { [name: string]: string }) {
        this.cookies = cookies;
    }

    getCookies() {
        return Object.keys(this.cookies).map(x => `${x}=${this.cookies[x]}`).join(";");
    }
    
    async get(url: string, params: object = {}, type: "text" | "binary" = "text") {
        console.log(`    webclient:get ${url}`);
        const req = request.get(url).set("Cookie", this.getCookies()).query(params);
        if (type == "binary") {
            req.buffer(true).parse(request.parse.image);
        }
        const res = await req;
        return new Document(res);
    }

    async post(url: string, formData?: object, type: "text" | "binary" = "text") {
        console.log(`    webclient:post ${url}`);
        let error: string | null = null;
        let req = request.post(url).set("Cookie", this.getCookies()).ok(_ => true)
        if (formData) {
            req.type("form").send(formData);
        }
        if (type == "binary") {
            req.buffer(true).parse(request.parse.image);
        }
        const res = await req;
        if (res.status >= 400) {
            console.log(`    webclient:  ${res.status} ${res.text}`);
        }
        return new Document(res);
    }

    async postBinary(url: string, data: string | Buffer) {
        console.log(`    webclient:post ${url}`);
        
        let req = request.post(url).set("Cookie", this.getCookies()).ok(_ => true)
        req.write(data);
        const res = await new Promise((resolve: (res: request.Response) => void) => req.end((err, res) => resolve(res)));
        if (res.status >= 400) {
            console.log(`    webclient:  ${res.status} ${res.text}`);
        }
        return new Document(res);
    }   
}

export class Document {
    private _doc: libxmljs.Document | null;

    constructor(private _res: request.Response | string) {
    }

    private get doc() {
        if (!this._doc) {
            this._doc = libxmljs.parseHtml(this.text);
        }
        return this._doc;
    }

    get json() {
        return JSON.parse(this.text);
    }

    get text() {
        if (typeof this._res == "string") {
            return this._res;
        }
        return this._res.text;
    }

    get buffer(): Buffer {
        if (typeof this._res == "string") {
            throw "This is not buffer";
        }
        const buf = this._res.body;
        if (typeof buf == "string") {
            throw "This is string";
        }
        return buf;
    }

    get(xpath: string) {
        const elm = this.doc.get(xpath);
        return elm ? new Element(elm, xpath) : null;
    }
    
    getNeeded(xpath: string) {
        const elm = this.doc.get(xpath);
        if (!elm) {
            throw `${xpath} is not found`;
        }
        return new Element(elm, xpath);
    }

    find(xpath: string) {
        return this.doc.find(xpath).map(x => new Element(x, xpath));
    }

    getById(id: string) {
        return this.get(`//*[@id='${id}']`);
    }

    save() {
        fs.writeFileSync("debug.html", this.text);
    }
}

export class Element {
    constructor(private elm: libxmljs.Element, private xpath: string) {
    }

    get(xpath: string) {
        if (xpath.startsWith("//")) {
            throw "絶対パスです";
        }
        const elm = this.elm.get(xpath);
        return elm ? new Element(elm, this.xpath + xpath) : null;
    }

    getNeeded(xpath: string) {
        const elm = this.get(xpath);
        if (!elm) {
            throw `${xpath} is not found`;
        }
        return elm;
    }

    find(xpath: string) {
        return extractElements(this.elm.find(xpath));
    }

    get text() {
        return this.elm.text().trim();
    }

    get attrs() {
        return this.elm.attrs();;
    }

    attr(name: string) {
        return this.elm.attr(name)?.value() || null;
    }

    hasAttr(name: string) {
        return this.elm.attr(name) !== null;
    }

    attrNeeded(name: string) {
        const value = this.attr(name);
        if (!value) {
            throw `${value} is null`
        }
        return value;
    }

    get html() {
        return this.elm.toString();
    }

    extractDigits() {
        const match = this.text.match("[0-9,]+");
        const result = match ? parseInt(match[0].replace(/,/g, "")) : null;
        return result;
    }

    get parent() {
        return new Element(this.elm.parent() as libxmljs.Element, this.xpath + "/..");
    }
}