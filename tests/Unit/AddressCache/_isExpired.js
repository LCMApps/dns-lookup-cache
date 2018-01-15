'use strict';

const {assert} = require('chai');

const AddressCache = require('../../../src/AddressCache');

describe('Unit: AddressCache::_isExpired', () => {
    const addressCache = new AddressCache();

    it('must return false, cuz addresses array is empty', () => {
        const addresses = [];

        const isExpired = addressCache._isExpired(addresses);

        assert.isTrue(isExpired);
    });

    it('must return true, cuz all addresses within an array is expired', () => {
        const addresses = [
            {expiredTime: Date.now() - 1}
        ];

        const isExpired = addressCache._isExpired(addresses);

        assert.isTrue(isExpired);
    });

    it('must return false, cuz array does not have expired elements', () => {
        const addresses = [
            {expiredTime: 2 * Date.now()}
        ];

        const isExpired = addressCache._isExpired(addresses);

        assert.isFalse(isExpired);
    });
});
