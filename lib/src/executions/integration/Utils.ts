
export function getWideLength(str: string) {
    let result = 0;
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        if ((chr >= 0x00 && chr < 0x81) ||
            (chr === 0xf8f0) ||
            (chr >= 0xff61 && chr < 0xffa0) ||
            (chr >= 0xf8f1 && chr < 0xf8f4)) {
            result += 1;
        } else {
            result += 2;
        }
    }
    return result;
};

export function replaceDict(src: string, dict: { [n: string]: string }) {
    Object.keys(dict).forEach(key => {
        src = src.replace(new RegExp("\\" + key), dict[key]);
    })
    return src;
}