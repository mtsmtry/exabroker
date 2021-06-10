import { FSx } from "aws-sdk";
import * as fs from "fs";
import { EntityManager } from "typeorm";
import { BrowseNode } from "../entities/BrowseNode";
import { notNull } from "../Utils";

export interface Node {
    level: number;
    nodeId: string;
    name: string;
    children: Node[];
}

export function loadBrowseNode() {
    const text = fs.readFileSync("./browse-node.txt", "utf-8");
    const lines = text.split("\n");
    const nodes = lines.map(line => {
        const match = line.match(/^(\s*)([0-9]+):(.+)$/);
        if (!match) {
            return null;
        }
        const node: Node = { level: match[1].length / 2, nodeId: match[2], name: match[3], children: [] };
        return node;
    }).filter(notNull);

    const nodeStack: (Node | null)[] = [null, null, null, null, null, null, null, null, null, null, null, null, null];
    nodes.forEach(node => {
        if (node.level > 0) {
            const parent = nodeStack[node.level - 1];
            if (parent) {
                parent.children.push(node);
            }
        }
        nodeStack[node.level] = node;
    });
    return nodes;
}

function arrayChunk<T>(array: T[], size: number): T[][] {
    return array.reduce((acc, value, index) => index % size ? acc : [...acc, array.slice(index, index + size)], []);
}

export async function insertBrowseNodes(mng: EntityManager, nodes: Node[]) {
    const itemDict = {};
    let items = nodes.map(node => {
        return mng.create(BrowseNode, {
            nodeId: node.nodeId,
            level: node.level,
            name: node.name
        });
    }).filter(x => {
        const flag = itemDict[x.nodeId];
        itemDict[x.nodeId] = true;
        return !flag;
    });
    const sets = arrayChunk(items, 1000);
    await sets.map((x, i) => {
        console.log(i);
        return mng.transaction(trx => trx.createQueryBuilder()
            .insert()
            .into(BrowseNode)
            .orUpdate({ overwrite: ["updatedAt"] })
            .values(x)
            .execute());
    }).reduce((x, promise) => promise.then(_ => x), Promise.resolve(null));
}