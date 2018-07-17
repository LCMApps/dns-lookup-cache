'use strict';

/**
 * @typedef {Object} Address
 * @property {string} address - IPv4 or IPv6 address
 * @property {number} ttl - IP DNS TTL
 * @property {number} family - IP family
 * @property {number} expiredTime - DNS TTL expiration timestamp
 */

const assert         = require('assert');
const dns            = require('dns');
const {EventEmitter} = require('events');

const _ = require('lodash');

class ResolveTask extends EventEmitter {
    /**
     * @returns {number}
     */
    static get IPv4() {
        return 4;
    }

    /**
     * @returns {number}
     */
    static get IPv6() {
        return 6;
    }

    /**
     * @param {string} hostname
     * @param {number} ipVersion
     */
    constructor(hostname, ipVersion) {
        super();

        assert(
            _.isString(hostname) && hostname.length > 0,
            `hostname must be not empty string, '${hostname}' has been provided.`
        );

        assert(
            ipVersion === ResolveTask.IPv4 || ipVersion === ResolveTask.IPv6,
            `ipVersion must be 4 or 6. '${ipVersion}' has been provided.`
        );

        this._hostname  = hostname;
        this._ipVersion = ipVersion;
        this._resolver  = ipVersion === ResolveTask.IPv4 ? dns.resolve4 : dns.resolve6;

        this._resolved = this._resolved.bind(this);

        this.setMaxListeners(Infinity);
    }

    run() {
        this._resolver(this._hostname, {ttl: true}, this._resolved);
    }

    /**
     * @param {Error} error
     * @param {Address[]} addresses
     * @emits ResolveTask#error
     * @emits ResolveTask#addresses array of addresses
     * @private
     */
    _resolved(error, addresses) {
        if (error) {
            return this.emit('error', error);
        }

        assert(Array.isArray(addresses), 'addresses must be an array.');

        addresses.forEach(address => {
            address.family      = this._ipVersion;
            address.expiredTime = Date.now() + address.ttl * 1000;
        });

        this.emit('addresses', addresses);
    }
}

module.exports = ResolveTask;
