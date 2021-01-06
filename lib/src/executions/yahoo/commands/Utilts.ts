import { WebTransaction } from "../../../system/execution/WebExecution";
import { notNull } from "../../../Utils";
import { Document } from "../../../web/WebClient";
import * as path from "path";

export function getFormHiddenInputData(doc: Document, xpath: string): object {
    const form = doc.get(xpath);
    if (!form) {
        throw "form is null";
    }

    // Hidden inputs
    const inputs = form.find(".//input[@type='hidden']");
    return inputs.map(input => {
        const name = input.attr("name") || input.attr("id");
        const value = input.attr("value");
        return name !== null ? { name, value: value ? value : "" } : null;
    }).filter(notNull).reduce((m: object, x) => {
        m[x.name] = x.value;
        return m;
    }, {});
}

export function getFormInputAndSelectData(doc: Document, xpath: string): object {
    const form = doc.getNeeded(xpath);

    // Inputs
    const inputs = form.find(".//input");
    const inputData = inputs.map(input => {
        const name = input.attr("name") || input.attr("id");
        const value = input.attr("value");
        return name ? { name, value: value ? value : "" } : null;
    }).filter(notNull).reduce((m: object, x) => {
        m[x.name] = x.value;
        return m;
    }, {} as object);

    // Selects
    const selects = form.find(".//select");
    const selectData = selects.map(select => {
        const name = select.attr("name") || select.attr("id");
        const selected = select.find("./option").filter(x => x.hasAttr("selected"));
        const value = selected.length > 0 ? selected[0].attr("value") : null;
        return name && value ? { name, value } : null;
    }).filter(notNull).reduce((m: object, x) => {
        m[x.name] = x.value;
        return m;
    }, {} as object);

    return { ...inputData, ...selectData };
}