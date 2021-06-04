import * as crypto from 'crypto';
import * as path from 'path';

export function notNull<T>(item: T | null | undefined): item is T {
    return item !== null && item !== undefined;
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

export type ObjectNotNullable<T> = { [P in keyof T]: Exclude<T[P], null | undefined> };
export type ObjectUndefinedToNull<T> = { [P in keyof T]: undefined extends T[P] ? Exclude<T[P], undefined> | null : Exclude<T[P], undefined> };

export function toNotNull<T>(src: T): ObjectNotNullable<T> {
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

export function getCurrentFilename() {
    const stack = new Error().stack as string;
    const filename = path.basename(stack.split('at ')[2].trim()).split(':')[0];
    return filename.split(".")[0];
}

export function parseFloatOrNull(str: string | undefined | null) {
    return str ? parseFloat(str) : null;
}

export function parseIntOrNull(str: string | undefined | null) {
    return str ? parseInt(str) : null;
}

// Names of properties in T with types that include undefined
type OptionalPropertyNames<T> =
  { [K in keyof T]: undefined extends T[K] ? K : never }[keyof T];

// Common properties from L and R with undefined in R[K] replaced by type in L[K]
type SpreadProperties<L, R, K extends keyof L & keyof R> =
  { [P in K]: L[P] | Exclude<R[P], undefined> };

type Id<T> = {[K in keyof T]: T[K]} // see note at bottom*

// Type of { ...L, ...R }
export type Spread<L, R> = Id<
  // Properties in L that don't exist in R
  & Pick<L, Exclude<keyof L, keyof R>>
  // Properties in R with types that exclude undefined
  & Pick<R, Exclude<keyof R, OptionalPropertyNames<R>>>
  // Properties in R, with types that include undefined, that don't exist in L
  & Pick<R, Exclude<OptionalPropertyNames<R>, keyof L>>
  // Properties in R, with types that include undefined, that exist in L
  & SpreadProperties<L, R, OptionalPropertyNames<R> & keyof L>
  >;

export function random(min: number, max: number) {
    return Math.floor( Math.random() * (max + 1 - min) ) + min;
}

export function randomPositiveInteger() {
    return random(0, 100000000);
}