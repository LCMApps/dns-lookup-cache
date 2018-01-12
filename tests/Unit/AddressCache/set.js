'use strict';

const {assert} = require('chai');

const AddressCache = require('../../../src/AddressCache');
const addresses    = require('../../addresses');

describe('Unit: AddressCache::set', () => {
    it('must correct set addressed for particular key', () => {
        const setOfAddresses = [{}];
        const addressesCache = new AddressCache();

        addressesCache.set(addresses.INET_HOST1, setOfAddresses);

        assert.strictEqual(addressesCache._cache.get(addresses.INET_HOST1), setOfAddresses);
    });
});
