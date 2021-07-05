import { CollectionException } from "../../entities/system/CollectionException";
import { CollectionExceptionDto, CollectionRepository } from "../../repositories/CollectionRepository";
import { notNull, ObjectNotNullable, ObjectUndefinedToNull } from "../../Utils";
import { getRepositories } from "../Database";
import { Document, Element } from "../Document";
import { Execution } from "../execution/Execution";

interface CollectionResult {
    itemCount: number;
    successCount: number;
    propertyCounts: { [prop: string]: number };
    result: any;
}

export class Collection<T> {
    static document<T>() {
        return new CollectionPreprocess<T>();
    }

    static branch<T>() {
        return new CollectionBranch<T>();
    }

    async collectItems(doc: Document, val: T, url: string) {
        const reps = await getRepositories();
        return await this.collectItemsImpl(doc, val, url, reps.collection);
    }

    collectItemsImpl(doc: Document, val: T, url: string, rep: CollectionRepository): Promise<CollectionResult> {
        throw "";
    }

    getItemCount(doc: Document, val: T): number {
        throw "";
    }
}

export class CollectionBranch<T> extends Collection<T> {
    cases: { get: (val: T) => any | null, coll: Collection<any> }[] = [];

    case<T2>(coll: Collection<T2>, get: (val: T) => T2 | null) {
        this.cases.push({ get, coll });
        return this;
    }

    collectItemsImpl(doc: Document, val: T, url: string, rep: CollectionRepository): Promise<CollectionResult> {
        for (let i = 0; i < this.cases.length; i++) {
            const x = this.cases[i];
            const obj = x.get(val);
            if (obj) {
                return x.coll.collectItemsImpl(doc, obj, url, rep);
            }
        }
        throw "Not matched";
    }

    getItemCount(doc: Document, val: T): number {
        for (let i = 0; i < this.cases.length; i++) {
            const x = this.cases[i];
            const obj = x.get(val);
            if (obj) {
                return x.coll.getItemCount(doc, obj);
            }
        }
        throw "Not matched";
    }
}

class CollectionDocumentBase<T> {
    public extractProperties: ((elm: Element | Document) => any)[] = [];
    public extractRequiredProperties: ((elm: Element | Document) => any)[] = [];
    public extractConstant?: (val: T) => any;
    public extractItems?: (doc: Document) => Element[];
    public saveMultipleItems?: (val: any[]) => Execution<any>;
    public saveSingleItem?: (val: any) => Execution<any>;

    constructor(coll?: CollectionDocumentBase<T>) {
        if (coll) {
            this.extractProperties = coll.extractProperties;
            this.extractRequiredProperties = coll.extractRequiredProperties;
            this.extractConstant = coll.extractConstant;
            this.extractItems = coll.extractItems;
            this.saveMultipleItems = coll.saveMultipleItems;
            this.saveSingleItem = coll.saveSingleItem;
        }
    }
}

class CollectionDocument<T> extends Collection<T> {

    constructor(private base: CollectionDocumentBase<T>) {
        super();
    }

    getItemCount(doc: Document, val: T): number {
        if (this.base.extractItems) {
            return this.base.extractItems(doc).length;
        } else {
            if (this.base.extractRequiredProperties.length == 0) {
                return 1;
            }
            
            let itemCount = 0;
            this.base.extractRequiredProperties.forEach(extract => {
                const props = extract(doc);
                Object.keys(props).forEach(prop => {
                    if (prop) {
                        itemCount = 1;
                    }
                });
            });

            return itemCount;
        }
    }

    private extractItem(propertyCounts: { [prop: string]: number }, elm: Element | Document) {
        function countProperty(key: string) {
            if (!propertyCounts[key]) {
                propertyCounts[key] = 1;
            } else {
                propertyCounts[key]++;
            }
        }

        const result = {};
        let successful = true;
        const exceptions: CollectionExceptionDto[] = [];

        this.base.extractProperties.forEach(extract => {
            let props = {};
            try {
                props = extract(elm);
            } catch(ex) {
                exceptions.push({
                    function: extract.toString(),
                    message: ex.toString()
                });
            }
            Object.keys(props).forEach(key => {
                const prop = props[key];
                if (prop !== null && prop !== undefined) {
                    result[key] = prop;
                    countProperty(key);
                }
            });
        });

        this.base.extractRequiredProperties.forEach(extract => {
            let props = {};
            try {
                props = extract(elm);
            } catch(ex) {
                exceptions.push({
                    function: extract.toString(),
                    message: ex.toString()
                });
                successful = false;
            }
            Object.keys(props).forEach(key => {
                const prop = props[key];
                if (prop !== null && prop !== undefined) {
                    result[key] = prop;
                    countProperty(key);
                } else {
                    successful = false;
                }
            });
        });

        return { successful, item: result, exceptions };
    }

    async collectItemsImpl(doc: Document, val: T, url: string, rep: CollectionRepository): Promise<CollectionResult> {
        let propertyCounts: { [prop: string]: number } = {};
        let itemCount = 0, successCount = 0;
        let error: object | null = null;
        let exceptions: CollectionExceptionDto[] = [];
        const constant = this.base.extractConstant ? this.base.extractConstant(val) : {};
    
        if (this.base.extractItems) {
            let items: T[] = [];
            try {
                // Extract items
                const elms = this.base.extractItems(doc);
                const extractResults = elms.map(elm => this.extractItem(propertyCounts, elm));

                // Set items
                items = extractResults
                    .filter(x => x.successful)
                    .map(x => x.item)
                    .map(x => Object.assign(x, constant));

                // Save items
                if (!this.base.saveMultipleItems) throw "";
                await this.base.saveMultipleItems(items).execute();

                // Set
                exceptions = extractResults.map(x => x.exceptions).reduce((x, xs) => xs.concat(x), []);
                itemCount = elms.length;
                successCount = items.length;
            } catch (ex) {
                error = ex;
            }

            // Create a record
            const recordId = await rep.createRecord({ url, itemCount, successCount, propertyCounts, error });

            // Create exceptions
            await rep.createExceptions(recordId, url, exceptions);

            return { itemCount, successCount, propertyCounts, result: items };
        } else {
            let item: T | null = null;
            try {
                // Extract a item
                const extractResult = this.extractItem(propertyCounts, doc);
                if (!this.base.saveSingleItem) throw "";

                // Save the item
                item = extractResult.item as T;
                if (extractResult.successful) {
                    Object.assign(item, constant);
                    await this.base.saveSingleItem(item).execute();
                    itemCount = 1;
                    successCount = 1;
                } else {
                    itemCount = 1;
                    successCount = 0;
                }

                exceptions = extractResult.exceptions;
            } catch (ex) {
                error = ex;
            }

            // Create a record
          //  const recordId = await rep.createRecord({ url, itemCount, successCount, propertyCounts, error });

            // Create exceptions
          //  await rep.createExceptions(recordId, url, exceptions);

            return { itemCount, successCount, propertyCounts, result: item };
        }
    }
}

export class CollectionInDocument<T1, T2> extends CollectionDocumentBase<T1> {

    multiple(extractItems: (doc: Document) => Element[]) {
        this.extractItems = extractItems;
        return new CollectionMultiple<T1, T2>(this);
    }

    single() {
        return new CollectionSingle<T1, T2>(this);
    }
}

export class CollectionPreprocess<T> extends CollectionInDocument<T, {}> {

    constant<T2>(extractConstant: (doc: T) => T2) {
        this.extractConstant = extractConstant;
        return new CollectionInDocument<T, T2>(this);
    }
}

export class CollectionMultiple<T1, T2> extends CollectionDocumentBase<T1> {

    default<T3 extends object>(val: T3): CollectionMultiple<T1, T2 & T3> {
        this.extractProperties.push(_ => val);
        return this as any;
    }

    propertyRequired<T3 extends object>(extract: (elm: Element) => T3): CollectionMultiple<T1, T2 & ObjectNotNullable<T3>> {
        this.extractRequiredProperties.push(extract);
        return this as any;
    }

    property<T3 extends object>(extract: (elm: Element) => T3): CollectionMultiple<T1, T2 & ObjectUndefinedToNull<T3>> {
        this.extractProperties.push(extract);
        return this as any;
    }

    saveMany(save: (val: T2[]) => Execution<any>): Collection<T1> {
        this.saveMultipleItems = save;
        return new CollectionDocument(this);
    }
}

export class CollectionSingle<T1, T2> extends CollectionDocumentBase<T1> {

    default<T3 extends object>(val: T3): CollectionSingle<T1, T2 & T3> {
        this.extractProperties.push(_ => val);
        return this as any;
    }

    propertyRequired<T3 extends object>(extract: (doc: Document) => T3): CollectionSingle<T1, T2 & ObjectNotNullable<T3>> {
        this.extractRequiredProperties.push(extract);
        return this as any;
    }

    property<T3 extends object>(extract: (doc: Document) => T3): CollectionSingle<T1, T2 & ObjectUndefinedToNull<T3>> {
        this.extractProperties.push(extract);
        return this as any;
    }

    saveOne(save: (val: T2) => Execution<any>): Collection<T1> {
        this.saveSingleItem = save;
        return new CollectionDocument(this);
    }
}