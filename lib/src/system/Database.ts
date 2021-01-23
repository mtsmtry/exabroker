import * as aws from "aws-sdk";
import { Connection, createConnection } from "typeorm";
import { ExecutionTask } from "../entities/ExecutionTask";
import { AmazonRepository } from "../repositories/AmazonRepository";
import { CollectionRepository } from "../repositories/CollectionRepository";
import { CrawlingRepository } from "../repositories/CrawlingRepository";
import { ExceptionRepository } from "../repositories/ExceptionRepository";
import { ExecutionRepository } from "../repositories/ExecutionRepository";
import { YahooRepository } from "../repositories/YahooRepository";
import * as admin from "firebase-admin";

export async function createDatabaseConnection(options: object={}) {
    aws.config.httpOptions = { timeout: 60 * 1000 };

    let connectOption: any = null;
    console.log(__dirname);
    try {
        connectOption = require(`../../../ormconfig.json`);
        connectOption.entities = [__dirname + "/../entities/**/*.js"];
    } catch(ex) {
        connectOption = require(`../../ormconfig.json`);
        connectOption.entities = [__dirname + "/../../dist/src/entities/**/*.js"];
    }
    Object.assign(connectOption, options);
    console.log(connectOption.entities);
    const conn = await createConnection(connectOption);
    while(true) {
        console.log("connecting...");
        const connected = await conn.manager
            .getRepository(ExecutionTask)
            .findOne(0)
            .then(_ => true)
            .catch(_ => false);
        if (connected) {
            break;
        }
    }
    return conn;
}

export async function initFirestore() {
    let config: any = null;
    try {
        config = require(`../../../firestore-config.json`);
    } catch(ex) {
        config = require(`../../../firestore-config.json`);
    }
    admin.initializeApp({ credential: admin.credential.cert(config) });
}

let repositories: null |  {
    amazon: AmazonRepository,
    yahoo: YahooRepository,
    crawling: CrawlingRepository,
    execution: ExecutionRepository,
    collection: CollectionRepository,
    exception: ExceptionRepository,
    connection: Connection,
    firestore: FirebaseFirestore.Firestore,
    s3: aws.S3
} = null;

export async function getRepositories() {
    if (!repositories) {
        const config = aws.config.loadFromPath('./aws-config.json');
        const conn = await createDatabaseConnection();
        const s3 = new aws.S3(config);
        initFirestore();
        const firestore = admin.firestore();
        repositories = {
            amazon: new AmazonRepository(conn.manager, s3),
            yahoo: new YahooRepository(conn.manager),
            crawling: new CrawlingRepository(conn.manager),
            execution: new ExecutionRepository(conn.manager, firestore),
            collection: new CollectionRepository(conn.manager),
            exception: new ExceptionRepository(conn.manager),
            connection: conn,
            firestore,
            s3
        }
    }
    return repositories;
}