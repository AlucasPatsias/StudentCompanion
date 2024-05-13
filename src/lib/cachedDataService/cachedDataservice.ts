import { universisGet, elearningGet, webmailInboxRequest } from "$lib/dataService"
import { Network } from '@capacitor/network';
import Dexie from "dexie";

type cachedItem = {
    key: string;
    exists: boolean;
    cachedAt: Date;
    life: number; //Life in seconds
    value: any;
    expired: boolean;
}

type options = {
    forceFresh?: boolean | undefined;
    lifetime?: number | undefined;
}

export async function cachedWebmailInbox (options?: options): Promise<any> {
    if (!options) options = {};
    const key = `webmail_inbox`;
    const cached = await getFromCache(key);
    if (cached.exists && (!cached.expired && !options.forceFresh || !(await Network.getStatus()).connected)){
        return cached.value;
    } else {
        const response = await webmailInboxRequest();
        cacheItem(key, response, options.lifetime);
        return response;
    }
}

export async function cachedUniversisGet (endpoint: string, options?: options): Promise<any> {
    if (!options) options = {};
    const key = `universis_${endpoint}`;
    const cached = await getFromCache(key);
    if (cached.exists && (!cached.expired && !options.forceFresh || !(await Network.getStatus()).connected)){
        return cached.value;
    } else {
        const response = await universisGet(endpoint);
        cacheItem(key, response, options.lifetime);
        return response;
    }
}

export async function cachedElearningGet(data: any, options?: options): Promise<any> {
    if (!options) options = {};
    const key = `elearning_${JSON.stringify(data)}`;
    const cached = await getFromCache(key);
    if (cached.exists && (!cached.expired && !options.forceFresh || !(await Network.getStatus()).connected)){
        return cached.value;
    } else {
        const response = await elearningGet(data);
        cacheItem(key, response, options.lifetime);
        return response;
    }
    
}


function cacheItem(key: string, value: any, lifetime: number = 180) {
    const now = new Date();
    const cachedData = {
        value,
        cachedAt: now,
        life: lifetime
    };
    try {
        var db = new Dexie("cachedData");
        db.version(1).stores({
            cachedData: 'key,value'
        });

        db.cachedData.put({key: key, value: JSON.stringify(cachedData)});

        // db.close();
    }
    catch (error) {
        console.error(error);
    }

}

async function getFromCache(key: string): Promise<cachedItem> {
    var db = new Dexie("cachedData");
    db.version(1).stores({
        cachedData: 'key,value'
    });

    const cachedData = await db.cachedData.get(key);

    if (cachedData) {
        const parsedData = JSON.parse(cachedData.value);
        console.log(parsedData);
        const now = new Date();
        const cachedAt = new Date(parsedData.cachedAt);
        const life = parsedData.life;
        const expired = now.getTime() - cachedAt.getTime() > life * 1000;
        return {
            key,
            exists: true,
            cachedAt,
            life,
            value: parsedData.value,
            expired
        };
    } else {
        return {
            key,
            exists: false,
            cachedAt: new Date(),
            value: null,
            expired: false,
            life: 0
        };
    }
}