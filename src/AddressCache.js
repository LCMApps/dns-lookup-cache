'use strict';

/**
 * Object returned by `dns.resolve4/dns.resolve6`
 *
 * @typedef {Object} Address
 * @property {string} address - IPv4 or IPv6 address
 * @property {number} ttl - IP DNS TTL
 */

/**
 * @typedef {Object} ExtendedAddress
 * @augments Address
 * @property {number} family - IP family
 */

class AddressCache {
    constructor() {
        this._cache = new Map();
    }

    /**
     * @param {string} key
     * @returns {[ExtendedAddress]|undefined}
     */
    find(key) {
        if (!this._cache.has(key)) {
            return;
        }

        const addresses = this._cache.get(key);

        if (AddressCache._isExpired(addresses)) {
            return;
        }

        return addresses;
    }

    /**
     * @param {string} key
     * @param {[Address]} addresses
     */
    set(key, addresses) {
        const adjustedAddresses = addresses.map(address => {
            address.expiredTime = Date.now() + address.ttl * 1000;

            return address;
        });

        this._cache.set(key, adjustedAddresses);
    }

    /**
     * @param {[ExtendedAddress]} addresses
     * @returns {boolean}
     * @private
     */
    static _isExpired(addresses) {
        return addresses.some(address => address.expiredTime <= Date.now());
    }
}

module.exports = AddressCache;
