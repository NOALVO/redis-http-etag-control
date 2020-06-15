const crypto = require('crypto');

module.exports = {
  getEtag,
  setEtag,
  getCache,
  setCache,
  getSetCacheIfNotExists,
};

async function getEtag(redisClient, uri) {
  return redisClient.getAsync(`etags:${uri}`);
}

async function setEtag(redisClient, uri, etag) {
  return redisClient.setAsync(`etags:${uri}`, etag);
}

async function getCache(redisClient, uri) {
  return redisClient.getAsync(`cache:${uri}`);
}

async function setCache(redisClient, uri, cache) {
  return redisClient.setAsync(`cache:${uri}`, cache);
}

async function getSetCacheIfNotExists(redisClient, uri, cacheFunction, storedEtag) {
  storedEtag = storedEtag || await getEtag(redisClient, uri);
  if (storedEtag) {
    // in all cases that an etag is stored, method returns from cache
    // its recommended to validate 
    return getCache(redisClient, uri);
  }

  let cacheToStore;
  if (cacheFunction.constructor.name == 'AsyncFunction') {
    cacheToStore = await cacheFunction();
  } else {
    cacheToStore = cacheFunction();
  }
  await setCache(redisClient, uri, cacheToStore);

  const etag = crypto.createHash('sha1').update(cacheToStore).digest('base64');
  await setEtag(redisClient, uri, etag);

  return { etag, cached: cacheToStore };
}
