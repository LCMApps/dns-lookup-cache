'use strict';

const _ = require('lodash');

class AddressCache {
    constructor() {
        this._cache = new Map();
    }

    /**
     * @param {string} key
     * @returns {Address[]|undefined}
     */
    find(key) {
        if (!this._cache.has(key)) {
            return;
        }

        const addresses = this._cache.get(key);

        if (this._isExpired(addresses)) {
            return;
        }

        return addresses;
    }

    /**
     * @param {string} key
     * @param {Address[]} addresses
     */
    set(key, addresses) {
        this._cache.set(key, addresses);
    }

    /**
     * @param {Address[]} addresses
     * @returns {boolean}
     * @private
     */
    _isExpired(addresses) {
        if (_.isEmpty(addresses)) {
            return true;
        }

        return addresses.some(address => address.expiredTime <= Date.now());
    }
}

module.exports = AddressCache;
