import * as libxmljs from "libxmljs";
import * as request from "superagent"
import * as fs from "fs";

function extractElements(elms: libxmljs.Node[]) {
    return elms
        .filter(x => x.type() == "element")
        .map(x => new Element(x as libxmljs.Element, ""));
}

export class Document {
    // libxmljs.Document.get is invaild
    private _doc: libxmljs.Document | null;

    constructor(private _res: request.Response | string) {
    }

    private get doc() {
        if (!this._doc) {
            this._doc = libxmljs.parseHtml(this.text);
            /*if (this._doc.errors.length > 0) {
                throw new Error(this._doc.errors.toString());
            }*/
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
        const elm = this.doc.find(xpath)[0];
        return elm ? new Element(elm, xpath) : null;
    }
    
    getNeeded(xpath: string) {
        const elm = this.doc.find(xpath)[0];
        if (!elm) {
            throw `${xpath} is not found`;
        }
        return new Element(elm, xpath);
    }

    find(xpath: string) {
        return this.doc.find(xpath).map(x => new Element(x, xpath));
    }

    getById(id: string) {
        return this.find(`//*[@id='${id}']`)[0];
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