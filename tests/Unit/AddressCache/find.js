'use strict';

const {assert} = require('chai');

const AddressCache = require('../../../src/AddressCache');
const addresses    = require('../../addresses');

describe('Unit: AddressCache::find', () => {
    let addressCache;

    beforeEach(() => {
        addressCache = new AddressCache();
    });

    it('must return undefined, cuz there are no addresses for this hostname key', () => {
        const notExistedKey = addresses.INET_HOST1;

        const result = addressCache.find(notExistedKey);

        assert.isUndefined(result);
    });

    it('must return undefined, cuz there are only expired addresses within cache for particular host', () => {
        const cachedAddresses = [{
            expiredTime: Date.now() - 1
        }];

        addressCache._cache.set(addresses.INET_HOST1, cachedAddresses);

        const result = addressCache.find(addresses.INET_HOST1);

        assert.isUndefined(result);
    });

    it('must return addresses array, cuz there are only not-expired addresses within cache for particular host', () => {
        const cachedAddress = {
            expiredTime: Date.now() * 2
        };

        const cachedAddresses = [cachedAddress];

        addressCache._cache.set(addresses.INET_HOST1, cachedAddresses);

        const result = addressCache.find(addresses.INET_HOST1);

        assert.deepEqual(result, cachedAddresses);
    });
});
