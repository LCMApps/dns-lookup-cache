'use strict';

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

    constructor() {
        this._addressCache = new AddressCache();
        this._tasksManager = new TasksManager();
    }

    /**
     * Lookup method that uses IP cache(and DNS TTL) to resolve hostname avoiding system call via thread pool.
     *
     * @param {string} hostname
     * @param {Object} options
     * @param {number} options.family
     * @param {boolean} options.all
     * @param {Function} callback
     */
    run(hostname, options, callback) {
        if (!_.isString(hostname)) {
            throw new Error('hostname must be a string');
        }

        if (_.isFunction(options)) {
            callback = options;
            options  = {};
        } else if (_.isNumber(options)) {
            options = {family: options};
        } else if (!_.isObject(options)) {
            throw new Error('options must be an object or an ip version number');
        }

        if (!_.isFunction(callback)) {
            throw new Error('callback param must be a function');
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
        this._innerResolve(hostname, options.family, (error, records) => {
            if (error) {
                if (error.code === 'ENODATA') {
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
                return this._resolve(hostname, options, callback);
            }

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

            return;
        }

        task = new ResolveTask(hostname, ipVersion);

        this._tasksManager.add(key, task);

        task.addResolvedCallback(callback);
        task.run();

        task.on('addresses', addresses => {
            this._addressCache.set(key, addresses);
        });

        task.on('done', () => {
            this._tasksManager.done(key);
        });
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
                    if (error.code === 'ENOTFOUND') {
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
        const errorMessage = (syscall ? syscall + ' ' : '') + `ENOTFOUND ${hostname}`;
        const error        = new Error(errorMessage);

        error.hostname = hostname;
        error.code     = 'ENOTFOUND';
        error.errno    = 'ENOTFOUND';

        if (syscall) {
            error.syscall = syscall;
        }

        return error;
    }
}

const lookup = new Lookup();

module.exports = lookup.run.bind(lookup);
