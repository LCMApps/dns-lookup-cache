'use strict';

const dns = require('dns');

const _     = require('lodash');
const async = require('async');
const rr    = require('rr');

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

        switch (options.family) {
            case Lookup.IPv4:
            case Lookup.IPv6:
                return this._resolve(hostname, options, callback);
            case undefined:
                return this._resolveBoth(hostname, options, callback);
            default:
                throw new Error('invalid family number, must be one of the {4, 6} or undefined');
        }
    }

    /**
     * @param {string} hostname
     * @param {Object} options
     * @param {number} options.family
     * @param {boolean} options.all
     * @param {Function} callback
     * @private
     */
    _resolve(hostname, options, callback) {
        this._amountOfResolveTries[hostname] = this._amountOfResolveTries[hostname] || 0;

        this._innerResolve(hostname, options.family, (error, records) => {
            if (error) {
                this._amountOfResolveTries[hostname] = 0;

                if (error.code === dns.NODATA) {
                    return callback(this._makeNotFoundError(hostname, error.syscall));
                }

                return callback(error);
            }

            // Corner case branch.
            //
            // Intensively calling `lookup` method in parallel can produce situations
            // when DNS TTL for particular IP has been exhausted,
            // but task queue within NodeJS is full of `resolved` callbacks.
            // No way to skip them or update DNS cache before them.
            //
            // So the work around is return undefined for that callbacks and client code should repeat `lookup` call.
            if (!records) {
                if (this._amountOfResolveTries[hostname] >= Lookup.MAX_AMOUNT_OF_RESOLVE_TRIES) {
                    this._amountOfResolveTries[hostname] = 0;

                    return callback(new Error(`Cannot resolve host '${hostname}'. Too deep recursion.`));
                }

                this._amountOfResolveTries[hostname] += 1;

                return this._resolve(hostname, options, callback);
            }

            this._amountOfResolveTries[hostname] = 0;

            if (options.all) {
                const result = records.map(record => {
                    return {
                        address: record.address,
                        family:  record.family
                    };
                });

                return callback(null, result);
            } else {
                const record = rr(records);

                return callback(null, record.address, record.family);
            }
        });
    }

    /**
     * @param {string} hostname
     * @param {number} ipVersion
     * @param {Function} callback
     * @private
     */
    _innerResolve(hostname, ipVersion, callback) {
        const key = `${hostname}_${ipVersion}`;

        const cachedAddresses = this._addressCache.find(key);

        if (cachedAddresses) {
            setImmediate(() => {
                callback(null, cachedAddresses);
            });

            return;
        }

        let task = this._tasksManager.find(key);

        if (task) {
            task.addResolvedCallback(callback);
        } else {
            task = new ResolveTask(hostname, ipVersion);

            this._tasksManager.add(key, task);

            task.on('addresses', addresses => {
                this._addressCache.set(key, addresses);
            });

            task.on('done', () => {
                this._tasksManager.done(key);
            });

            task.addResolvedCallback(callback);
            task.run();
        }
    }

    /**
     * @param {string} hostname
     * @param {Object} options
     * @param {number} options.family
     * @param {boolean} options.all
     * @param {Function} callback
     * @private
     */
    _resolveBoth(hostname, options, callback) {
        async.parallel(
            [
                this._resolveTaskBuilder(hostname, Object.assign({}, options, {family: Lookup.IPv4})),
                this._resolveTaskBuilder(hostname, Object.assign({}, options, {family: Lookup.IPv6}))
            ],
            (error, records) => {
                if (error) {
                    return callback(error);
                }

                const [ipv4records, ipv6records] = records;

                if (options.all) {
                    const result = ipv4records.concat(ipv6records);

                    if (_.isEmpty(result)) {
                        return callback(this._makeNotFoundError(hostname));
                    }

                    return callback(null, result);
                } else if (!_.isEmpty(ipv4records)) {
                    return callback(null, ...ipv4records);
                } else if (!_.isEmpty(ipv6records)) {
                    return callback(null, ...ipv6records);
                }

                return callback(this._makeNotFoundError(hostname));
            }
        );
    }

    /**
     * @param {string} hostname
     * @param {Object} options
     * @returns {Function}
     * @private
     */
    _resolveTaskBuilder(hostname, options) {
        return cb => {
            this._resolve(hostname, options, (error, ...records) => {
                if (error) {
                    if (error.code === dns.NOTFOUND) {
                        return cb(null, []);
                    }

                    return cb(error);
                }

                cb(null, ...records);
            });
        };
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
