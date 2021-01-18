
export function getException(ex: any): string | null {
    if (typeof ex == "string") {
        return ex;
    }
    if (ex) {
        return ex.stack ? ex.stack : ex.toString();
    }
    return null;
}