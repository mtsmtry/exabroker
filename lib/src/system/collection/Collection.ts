import { Document, Element } from "../../web/WebClient";

export class Collection<T> {
    constructor(
        private extractItems: (doc: Document) => Element[],
        private extractProperties: ((elm: Element) => any)[] = []
    ) { }

    static from() {
        return new ItemCollection();
    }

    getItems() {
        
    }

    getItemCount(): number {
        return 0;
    }
}

export class ItemCollection {
    public extractItems: (doc: Document) => Element[];

    items(extractItems: (doc: Document) => Element[]) {
        this.extractItems = extractItems;
        return new PropertyCollection<{}>(this);
    }
}

export class PropertyCollection<T> {
    private extractProperties: ((elm: Element) => any)[] = [];

    constructor(private itemCollection: ItemCollection) {
    }

    property<T2 extends object>(extract: (elm: Element) => T2): PropertyCollection<T & T2> {
        this.extractProperties.push(extract);
        return this as any;
    }

    resolve() {
        return new Collection<T>(this.itemCollection.extractItems, this.extractProperties);
    }
}