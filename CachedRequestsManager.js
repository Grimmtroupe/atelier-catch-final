import * as utilities from "./utilities.js";
import * as serverVariables from "./serverVariables.js";
import HttpContext from "./httpContext.js";

let requestCachesExpirationTime = serverVariables.get("main.repository.requestCachesExpirationTime");

global.requestCaches = [];
global.cachedRequestCleanerStarted = false;


export default class CachedRequestsManager {
    
    static startCachedRequestCleaner() {
        setInterval(CachedRequestsManager.flushExpired, requestCachesExpirationTime * 1000);
        console.log(BgWhite + FgBlack, "[Periodic repositories data caches cleaning process started...]");

    }
    
    static add(url, content, ETag= "") {
        if (!cachedRequestCleanerStarted) {
            cachedRequestCleanerStarted = true;
            CachedRequestsManager.startCachedRequestCleaner();
        }
        if (url != "") {
            CachedRequestsManager.clear(url);
            requestCaches.push({
                url,
                content,
                ETag,
                Expire_Time: utilities.nowInSeconds() + requestCachesExpirationTime
            });
            console.log(BgWhite + FgBlack, `[Data of ${url} request has been cached]`);
        }
    }

    static clear(url) {
        if (url != "") {
            let indexToDelete = [];
            let index = 0;
            for (let cache of requestCaches) {
                if (cache.url == url) indexToDelete.push(index);
                index++;
            }
            utilities.deleteByIndex(requestCaches, indexToDelete);
        }
    }
    static find(url) {
        try {
            if (url != "") {
                for (let cache of requestCaches) {
                    if (cache.url == url) {
                        
                        cache.Expire_Time = utilities.nowInSeconds() + requestCachesExpirationTime;
                        console.log(BgWhite + FgBlack, `[${cache.url} data retrieved from cache]`);
                        return cache.data;
                    }
                }
            }
        } catch (error) {
            console.log(BgWhite + FgRed, "[request cache error!]", error);
        }
        return null;
    }
    static flushExpired() {
        let now = utilities.nowInSeconds();
        for (let cache of requestCaches) {
            if (cache.Expire_Time <= now) {
                console.log(BgWhite + FgBlack, "Cached file data of " + cache.url + ".json expired");
            }
        }
        requestCaches = requestCaches.filter( cache => cache.Expire_Time > now);
    }
    static get(httpContext){
        let Data = CachedRequestsManager.find(httpContext.req.url)
        if (Data != null) {
            httpContext.response.JSON(Data.content, Data.ETag, true)
        }
        else{
            CachedRequestsManager.add(httpContext.req.url,httpContext.payload,httpContext.req.ETag);
        }
    }
}