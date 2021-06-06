import * as aws from "aws-sdk";
import { Connection, createConnection } from "typeorm";
import { AmazonRepository } from "../repositories/AmazonRepository";
import { CollectionRepository } from "../repositories/CollectionRepository";
import { CrawlingRepository } from "../repositories/CrawlingRepository";
import { ExceptionRepository } from "../repositories/ExceptionRepository";
import { ExecutionRepository } from "../repositories/ExecutionRepository";
import { YahooRepository } from "../repositories/YahooRepository";
import * as admin from "firebase-admin";
import { IntegrationRepository } from "../repositories/IntegrationRepository";
import { sleep } from "../Utils";
import { AmazonItem } from "../entities/website/AmazonItem";
import { ArbYahooAmazon } from "../entities/integration/ArbYahooAmazon";

export async function createDatabaseConnection(options: object={}) {
    aws.config.httpOptions = { timeout: 60 * 1000 };

    let connectOption: any = null;
    console.log(__dirname);
    try {
        connectOption = require(`../../../ormconfig.json`);
        connectOption.entities = [__dirname + "/../entities/**/*.js"];
    } catch(ex) {
        connectOption = require(`../../ormconfig.json`);
        connectOption.entities = [__dirname + "/../../dist/entities/**/*.js"];
    }
    Object.assign(connectOption, options);
    console.log(connectOption);
    const conn = await createConnection(connectOption);
    while(true) {
        console.log("connecting...");
        const connected = await conn.manager
            .getRepository("execution_record")
            .findOne(0)
            .then(_ => true)
            .catch(err => {
                console.log(err);
                return false
            });
        if (connected) {
            break;
        }
        await sleep(1000);
    }
    return conn;
}

export function initFirestore() {
    let firestoreConfig: any = {
        type: "service_account",
        project_id: "exabroker-c8fed",
        private_key_id: "dfd9679a66b8bf458eec6d3731b2c923ba1b8925",
        private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC0znZ4N+w9RAsL\n0jMbDIKArdyIJUMrRM5z5Fc94ji3L+bskc2/m3aMKvbyKdx1Yrrofr5RryADqjy1\ndpNoQR6XX1lMtQsMMvjj4O9qAVB8gDrMlNna4LGvpgLPglb8x5uLrz0n02qgnot7\nRb+UcWqi9U0lCAPw2Pv7IKNgvukMKN7/UNw/YuTY4l16Fz4kwob4961XXkA4dEVY\nQbwwcSKsLw0qRY2hWlpGeFnAzFcLhRAdnhK2KRGICaOMWjYKX1H4l3uI3U1D3q5Z\nKuxgVfmH5GbdFH9TQqLVJoLPFnCXX8TgjefoiGfQ+AIWMTgfTWInVIfEnzteRrrI\n4ihj6GqHAgMBAAECggEAFWIjoGUwwzApxEdNtFcUP3Fl1xOHxaAYxfENS6wru/07\nfjgM5tUqkzo+RCFPnvHDHDMSgX5I4YC/4aWOmnJf0qmRWfaWwhBsiiWJ+yCrqwXO\nrm+znOTHxE0fIPk6c3aMqVuwy7sqbajtOHI6eFe6M7VM3zfQS4BGEOBpIiHXVbtz\n63AnndfUHsl7SHShrnYcdXAowDYcUSbktammH0pJOHI1Eju68+IEMmu5At1lcDw0\nDfFmO444QCG+wt40X+vKENJoM7Yfs8QNLUTa5loOm4GEbnbxBiuODTAVJPFZkctn\nvh84llLWYIkVa5Vi4G7fpPpU+k45BYdUuBJCnLEOuQKBgQDswwCOQrYbt7hMNbJU\nD1yuZSKE2YsnK4j4uj/YpxXyhLLl6GsX48wrep2BPfLWqfr90NfMOrY0z6CCtqln\nrf6gDgeC3mvU/nzzUOdurVQaD6hBz/EpTINVeVwDamKrd/4sfPCfmA5wnVyO5epP\n6+kD9LexQ42P1vGSn2zPdlIxHwKBgQDDf4IVJQmvhHkIATM6q6nMuVrYvKkpVgE1\nF+peVAo2XfI5ktinWfEctaxZXT510Yj2AYf4zNl45sh5g1iAV8gDxMuCo6leRSL9\nLDV1kT4NdcaTW1Zyxi8+47SImLYs2ZeoEkQQpgSMJhPoOGRU1/iqDvyI1/jQ7kyL\ncxBEmboRmQKBgQCu36FLci677kjr0UV0HRyhmwWSBnRnbBpxTG/YACGPzT+t3Kst\nLA4jlx861JzGvSorytN5f2wROcIeifg6IiPN6E7X9JzE52s29GzcLJ3P2fy3D3Xa\nwS7INSknRK64Y5qTFX1NA6y2tSQmT99vRJoJV/lNrs2ijmpDmAlwer5elQKBgFb4\nS4Nilbt6YGl6NzMbmQ9VSh/vVgXol+Lpv760/lIPWynXtQBGF+hgvcqHm7jIPXjL\nV5UMdJa/fGHqV53I71cV3j9A1aD1espMN4AU3Bka0vtM/9lRZ0VAAVlfLnQnXLtN\nXPBXGuDKM8L0C1ZfOeVVg2zRP4Sa7nx+9La/+LHJAoGAAQLlWeX9qeGkKTstOu0a\nace/YpIs6bq8jPQevO/m51XJcRSTm5SJc4npk1hsdzIhzYWxeZgiauVz7u/TO5mE\nXDuAxNKyRid8LJTIoazWmQHCviK1XEUkC7FTPZoW/E8AQLgXpjrnogaeHUim0TEG\nunOl6/+g0DRCsi6VICz71BA=\n-----END PRIVATE KEY-----\n",
        client_email: "firebase-adminsdk-b5hjs@exabroker-c8fed.iam.gserviceaccount.com",
        client_id: "113410729805888371960",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-b5hjs%40exabroker-c8fed.iam.gserviceaccount.com"
    };     
    /* 
    try {
        config = require(`../../../firestore-config.json`);
    } catch(ex) {
        config = require(`../../firestore-config.json`);
    }*/
    admin.initializeApp({ credential: admin.credential.cert(firestoreConfig) });
}

let repositories: null |  {
    amazon: AmazonRepository,
    yahoo: YahooRepository,
    crawling: CrawlingRepository,
    execution: ExecutionRepository,
    collection: CollectionRepository,
    exception: ExceptionRepository,
    integration: IntegrationRepository,
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
            integration: new IntegrationRepository(conn.manager),
            connection: conn,
            firestore,
            s3
        }
    }
    return repositories;
}