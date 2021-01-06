import { bool } from "aws-sdk/clients/signer"
import fetch from "node-fetch";
import { mapBy } from "../Utils";

interface Package {
    name: string,
    bandwidth: number,
    price: number,
    howmany_ips: number,
    price_per_gig: number,
    package_type: string,
    howmany_authips: number,
    price_user_formatted: string
}

interface UserPackage {
    id: number;
    custom_name: null,
    login: string,
    password: string,
    expires: string,
    bandwidth: number,
    last_ip_change: string,
    low_banwidth_notification_percent: number,
    package: Package,
    bandwidth_gb: number,
    additional_bandwidth_gb: number,
    bandwidth_percent_left_human: string,
    expiration_date_human: string,
    name: string
};

interface AuthIP {
    id: number;
    ip: string;
    userpackage_id: number;
}

interface ProxyPonanzaResponse<Data> {
    success: boolean;
    data: Data;
    pagination?: {
        page_count: number,
        current_page: number,
        has_next_page: boolean,
        has_prev_page: boolean,
        count: number,
        limit: number | null
    }
}

interface IPPack {
    id: string,
    ip: string,
    port_http: number,
    port_socks: number,
    active: boolean,
    ip_internal: number | null,
    proxyserver: {
        georegion_id: number,
        georegion: {
            name: string,
            country: {
                id: number,
                isocode: string,
                name: string,
                continent: string,
                eunion: boolean
            }
        },
        bandwidth_percent: number | null
    },
    visible: true
}

interface UserPackageDetail {
    id: number,
    custom_name: string | null,
    login: string,
    password: string,
    expires: string,
    bandwidth: number,
    last_ip_change: string,
    low_banwidth_notification_percent: number,
    ippacks: IPPack[],
    authips: AuthIP[],
    package: Package
    bandwidth_gb: number,
    additional_bandwidth_gb: number,
    bandwidth_percent_left_human: string,
    expiration_date_human: string,
    name: string
}
 
export interface Proxy {
    ip: string;
    login: string;
    password: string;
    portHttp: number;
    detail: IPPack | null;
}

export class ProxyBonanzaClient {
    private get headers() {
        return {
            Authorization: "e44239932f3a415001e61bb0bca438b71a98601e0d2c173343!52010"
        };
    }

    private async getUserPackages(): Promise<UserPackage[]> {
        const url = "https://proxybonanza.com/api/v1/userpackages.json";
        const response = await fetch(url, { headers: this.headers });
        const result: ProxyPonanzaResponse<UserPackage[]> = await response.json();
        return result.data;
    }

    private async getUserPackageDetail(id: number): Promise<UserPackageDetail> {
        const url = `https://proxybonanza.com/api/v1/userpackages/${id}.json`;
        const response = await fetch(url, { headers: this.headers });
        const result: ProxyPonanzaResponse<UserPackageDetail> = await response.json();
        return result.data;
    }

    private async getAuthIPs(): Promise<AuthIP[]> {
        const url = "https://proxybonanza.com/api/v1/authips.json";
        const response = await fetch(url, { headers: this.headers });
        const result: ProxyPonanzaResponse<AuthIP[]> = await response.json();
        return result.data;
    }

    async getProxies(): Promise<Proxy[]> {
        const packages = await this.getUserPackages();
        const promises = packages.map(x => this.getUserPackageDetail(x.id));
        const details = await Promise.all(promises);
        return details.map(x => x.ippacks.map(ippack => {
            return {
                ip: ippack.ip,
                login: x.login,
                password: x.password,
                portHttp: ippack.port_http,
                portSocks: ippack.port_socks,
                detail: ippack
            }
        })).reduce((xs, x) => {
            xs.push(...x);
            return xs;
        }, []);
    }
}