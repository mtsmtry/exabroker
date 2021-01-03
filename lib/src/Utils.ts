import * as crypto from 'crypto';

export function notNull<T>(item: T | null | undefined): item is T {
    return item != null;
}

export function groupBy<T>(array: T[], getKey: (obj: T) => number | null): { [key: number]: T[] } {
    return array.reduce((map: { [key: number]: T[] }, x) => {
        const key = getKey(x);
        if (key) {
            (map[key] || (map[key] = [])).push(x);
        }
        return map;
    }, {});
}

export function groupByString<T>(array: T[], getKey: (obj: T) => string | null): { [key: string]: T[] } {
    return array.reduce((map: { [key: number]: T[] }, x) => {
        const key = getKey(x);
        if (key) {
            (map[key] || (map[key] = [])).push(x);
        }
        return map;
    }, {});
}

export function mapBy<T>(array: T[], getKey: (obj: T) => number | null): { [key: number]: T } {
    return array.reduce((map, x) => {
        const key = getKey(x);
        if (key) {
            map[key] = x;
        }
        return map;
    }, {});
}

export function mapByString<T>(array: T[], getKey: (obj: T) => string | null): { [key: string]: T } {
    return array.reduce((map, x) => {
        const key = getKey(x);
        if (key) {
            map[key] = x;
        }
        return map;
    }, {});
}

export type Dto<T> = { 
    [K in keyof T]: T[K];
}

export function sleep(msec: number) {
    return new Promise(resolve => setTimeout(resolve, msec));
}

export function randomString(N: number) {
    const S = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from(crypto.randomFillSync(new Uint8Array(N))).map((n) => S[n % S.length]).join('');
}

export function toTimestamp(date: Date) {
    const milliseconds = date.getTime();
    return Math.floor(milliseconds / 1000);
}

export function toNotNull<T>(src: T): { [P in keyof T]: Exclude<T[P], null | undefined> } {
    return Object.keys(src).reduce((m, x) => {
        const value = src[x];
        if (value === null || value === undefined) {
            throw `${x} is null or undefined`;
        } else {
            m[x] = value;
        }
        return m;
    }, {}) as any;
}