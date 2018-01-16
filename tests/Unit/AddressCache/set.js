'use strict';

const {assert} = require('chai');

const AddressCache = require('../../../src/AddressCache');
const addresses    = require('../../addresses');

describe('Unit: AddressCache::set', () => {
    it('must correct set addressed for particular key', () => {
        const setOfAddresses1 = [
            {address: '1.2.3.4'},
        ];

        const setOfAddresses2 = [
            {address: '5.6.7.8'}
        ];

        const addressesCache = new AddressCache();

        addressesCache.set(addresses.INET_HOST1, setOfAddresses1);
        addressesCache.set(addresses.INET_HOST2, setOfAddresses2);

        assert.deepEqual(addressesCache._cache.get(addresses.INET_HOST1), setOfAddresses1);
        assert.deepEqual(addressesCache._cache.get(addresses.INET_HOST2), setOfAddresses2);
    });
});
