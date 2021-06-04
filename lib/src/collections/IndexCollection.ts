import { Collection } from "../system/collection/Collection";
import { amazonItemDetailCollection } from "./AmazonItemDetailCollection";
import { browseNodeCollection } from "./BrowseNodeCollection";

export const indexCollection =
    Collection.branch<string>()
        .case(browseNodeCollection, val => { 
            const [kind, name] = val.split("/");
            if (kind != "browseNodes") {
                return null;
            }
            const [nodeId, pageText] = name.split("-");
            return { nodeId, page: parseInt(pageText) };
        })
        /*.case(amazonItemDetailCollection, val => {
            const [kind, asin] = val.split("/");
            if (kind != "items") {
                return null;
            }
            return { asin };
        })*/;
