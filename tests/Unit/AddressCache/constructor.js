'use strict';

const {assert} = require('chai');

const AddressCache = require('../../../src/AddressCache');

describe('Unit: AddressCache::constructor', () => {
    it('must correct create an instance of AddressCache class', () => {
        const addressCache = new AddressCache();

        assert.instanceOf(addressCache._cache, Map);
    });
});
