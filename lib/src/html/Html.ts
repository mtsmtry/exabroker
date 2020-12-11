import * as libxmljs from "libxmljs";

function extractElements(elms: libxmljs.Node[]) {
    return elms
        .filter(x => x.type() == "element")
        .map(x => new Element(x as libxmljs.Element));
}

export class Document {
    private doc: libxmljs.Document;

    constructor(private _text: string) {
        this.doc = libxmljs.parseHtml(_text);
    }

    get(xpath: string) {
        const elm = this.doc.get(xpath);
        return elm ? new Element(elm) : null;
    }

    find(xpath: string) {
        return this.doc.find(xpath).map(x => new Element(x));
    }

    getById(id: string) {
        return this.get(`//*[@id='${id}']`);
    }

    get html() {
        return this._text;
    }
}

export class Element {
    constructor(private elm: libxmljs.Element) {
    }

    get(xpath: string) {
        if (xpath.startsWith("//")) {
            throw "絶対パスです";
        }
        const elm = this.elm.get(xpath);
        return elm ? new Element(elm) : null;
    }

    find(xpath: string) {
        return extractElements(this.elm.find(xpath));
    }

    get text() {
        return this.elm.text().trim();
    }

    get attrs() {
        return this.elm.attrs();
    }

    attr(name: string) {
        return this.elm.attr(name);
    }

    get html() {
        return this.elm.toString();
    }

    extractDigits() {
        const match = this.text.match("[0-9,]+");
        return match ? parseInt(match[0].replace(",", "")) : null;
    }

    get parent() {
        return new Element(this.elm.parent() as libxmljs.Element);
    }
}