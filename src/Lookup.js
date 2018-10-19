'use strict';

const dns = require('dns');

const _  = require('lodash');
const rr = require('rr');

const AddressCache = require('./AddressCache');
const TasksManager = require('./TasksManager');
const ResolveTask  = require('./ResolveTask');

class Lookup {
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
     * @returns {number}
     */
    static get MAX_AMOUNT_OF_RESOLVE_TRIES() {
        return 100;
    }

    constructor() {
        this._addressCache = new AddressCache();
        this._tasksManager = new TasksManager();

        this._amountOfResolveTries = {};
    }

    /**
     * Lookup method that uses IP cache(and DNS TTL) to resolve hostname avoiding system call via thread pool.
     *
     * @param {string} hostname
     * @param {Object} options
     * @param {number} options.family
     * @param {boolean} options.all
     * @param {Function} callback
     * @throws {Error}
     * @returns {{}|undefined}
     */
    run(hostname, options, callback) {
        if (_.isFunction(options)) {
            callback = options;
            options  = {};
        } else if (_.isNumber(options)) {
            options = {family: options};
        } else if (!_.isPlainObject(options)) {
            throw new Error('options must be an object or an ip version number');
        }

        if (!_.isFunction(callback)) {
            throw new Error('callback param must be a function');
        }

        if (!hostname) {
            if (options.all) {
                process.nextTick(callback, null, []);
            } else {
                process.nextTick(
                    callback,
                    null,
                    null,
                    options.family === Lookup.IPv6 ? Lookup.IPv6 : Lookup.IPv4
                );
            }

            return {};
        }

        if (!_.isString(hostname)) {
            throw new Error('hostname must be a string');
        }

        const resultCb = result => options.all ? callback(null, result) : callback(null, result.address, result.family);

        switch (options.family) {
            case Lookup.IPv4:
            case Lookup.IPv6:
                this._resolve(hostname, options).then(resultCb, callback);

                break;
            case undefined:
                this._resolveBoth(hostname, options).then(resultCb, callback);

                break;
            default:
                throw new Error('invalid family number, must be one of the {4, 6} or undefined');
        }
    }

    /**
     * @param {string} hostname
     * @param {Object} options
     * @param {number} options.family
     * @param {boolean} options.all
     * @returns {Promise}
     * @private
     */
    _resolve(hostname, options) {
        this._amountOfResolveTries[hostname] = this._amountOfResolveTries[hostname] || 0;

        return this._innerResolve(hostname, options.family)
            .then(records => {
                // Corner case branch.
                //
                // Intensively calling `lookup` method in parallel can produce situations
                // when DNS TTL for particular IP has been exhausted,
                // but task queue within NodeJS is full of `resolved` callbacks.
                // No way to skip them or update DNS cache before them.
                //
                // The work around is return undefined for that callbacks and client code should repeat `lookup` call.
                if (!records) {
                    if (this._amountOfResolveTries[hostname] >= Lookup.MAX_AMOUNT_OF_RESOLVE_TRIES) {
                        this._amountOfResolveTries[hostname] = 0;

                        throw new Error(`Cannot resolve host '${hostname}'. Too deep recursion.`);
                    }

                    this._amountOfResolveTries[hostname] += 1;

                    return this._resolve(hostname, options);
                }

                this._amountOfResolveTries[hostname] = 0;

                if (options.all) {
                    return records.map(record => {
                        return {
                            address: record.address,
                            family:  record.family
                        };
                    });
                } else {
                    if (_.isEmpty(records)) {
                        const errorMessage = `Empty "${options.family === 4 ? 'A' : 'AAAA'}" records list for ` +
                            hostname;

                        const error = new Error(errorMessage);
                        error.hostname = hostname;

                        throw error;
                    }

                    const record = rr(records);

                    return {
                        address: record.address,
                        family:  record.family
                    };
                }
            })
            .catch(error => {
                if (error.code === dns.NODATA) {
                    throw this._makeNotFoundError(hostname, error.syscall);
                }

                throw error;
            });
    }

    /**
     * @param {string} hostname
     * @param {number} ipVersion
     * @returns {Promise}
     * @private
     */
    _innerResolve(hostname, ipVersion) {
        const key = `${hostname}_${ipVersion}`;

        return new Promise((resolve, reject) => {
            const cachedAddresses = this._addressCache.find(key);

            if (cachedAddresses) {
                return resolve(cachedAddresses);
            }

            let task = this._tasksManager.find(key);

            if (!task) {
                task = new ResolveTask(hostname, ipVersion);

                this._tasksManager.add(key, task);

                task.on('addresses', addresses => {
                    this._addressCache.set(key, addresses);

                    this._tasksManager.done(key);
                });

                task.once('error', () => this._tasksManager.done(key));

                task.run();
            }

            task.on('error', error => reject(error));
            task.on('addresses', addresses => resolve(addresses));
        });
    }

    /**
     * @param {string} hostname
     * @param {Object} options
     * @param {number} options.family
     * @param {boolean} options.all
     * @private
     */
    _resolveBoth(hostname, options) {
        const resolve = (hostname, options) => {
            return this._resolve(hostname, options).catch(error => {
                if (error.code === dns.NOTFOUND) {
                    return [];
                }

                throw error;
            });
        };

        return Promise.all([
            resolve(hostname, Object.assign({}, options, {family: Lookup.IPv4})),
            resolve(hostname, Object.assign({}, options, {family: Lookup.IPv6}))
        ]).then(records => {
            const [ipv4records, ipv6records] = records;

            if (options.all) {
                const result = ipv4records.concat(ipv6records);

                if (_.isEmpty(result)) {
                    throw this._makeNotFoundError(hostname);
                }

                return result;
            } else if (!_.isEmpty(ipv4records)) {
                return ipv4records;
            } else if (!_.isEmpty(ipv6records)) {
                return ipv6records;
            }

            throw this._makeNotFoundError(hostname);
        });
    }

    // noinspection JSMethodCanBeStatic
    /**
     * @param {string} hostname
     * @param {string} [syscall]
     * @returns {Error}
     */
    _makeNotFoundError(hostname, syscall) {
        const errorMessage = (syscall ? syscall + ' ' : '') + `${dns.NOTFOUND} ${hostname}`;
        const error        = new Error(errorMessage);

        error.hostname = hostname;
        error.code     = dns.NOTFOUND;
        error.errno    = dns.NOTFOUND;

        if (syscall) {
            error.syscall = syscall;
        }

        return error;
    }
}

module.exports = Lookup;
