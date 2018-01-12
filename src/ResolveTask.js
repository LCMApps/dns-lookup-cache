'use strict';

const dns = require('dns');
const {EventEmitter} = require('events');

class ResolveTask extends EventEmitter {
    /**
     * @returns {number}
     */
    static get IPv4() {
        return 4;
    }

    /**
     * @param {string} hostname
     * @param {number} ipVersion
     */
    constructor(hostname, ipVersion) {
        super();

        this._callbacks = [];

        this._hostname = hostname;
        this._ipVersion = ipVersion;
        this._resolver = ipVersion === ResolveTask.IPv4 ? dns.resolve4 : dns.resolve6;
    }

    /**
     * @param {Function} callback
     */
    addResolvedCallback(callback) {
        this._callbacks.push(callback);
    }

    run() {
        this._resolver(this._hostname, {ttl: true}, (error, addresses) => {
            this.emit('done');

            this._callbacks.forEach(callback => {
                setImmediate(() => callback(error, addresses));
            });

            if (addresses) {
                addresses.forEach(address => {
                    address.family = this._ipVersion;
                });

                this.emit('addresses', addresses);
            }
        });
    }
}

module.exports = ResolveTask;
