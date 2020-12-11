


export function parseFloatOrNull(str: string | undefined | null) {
    return str ? parseFloat(str) : null;
}

export function parseIntOrNull(str: string | undefined | null) {
    return str ? parseInt(str) : null;
}