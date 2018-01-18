'use strict';

const dns = require('dns');

const {assert} = require('chai');
const sinon    = require('sinon');

const Lookup    = require('../../../src/Lookup');
const addresses = require('../../addresses');

describe('Unit: Lookup::_resolveBoth', () => {
    let lookup;

    const hostname = addresses.INET_HOST1;

    beforeEach(() => {
        lookup = new Lookup();
    });

    it('must run callback with error in case we got error during resolve on first call', done => {
        const expectedError = new Error('some error');
        const options       = {};

        const resolveStub = sinon.stub(lookup, '_resolve');
        resolveStub.onCall(0).callsFake(() => {
            return new Promise((resolve, reject) => {
                reject(expectedError);
            });
        });
        resolveStub.onCall(1).callsFake(() => {
            return new Promise(resolve => resolve());
        });

        const makeNotFoundErrorSpy = sinon.spy(lookup, '_makeNotFoundError');

        lookup._resolveBoth(hostname, options)
            .catch(error => {
                assert.isTrue(resolveStub.calledTwice);

                assert.strictEqual(resolveStub.getCall(0).args[0], hostname);
                assert.strictEqual(resolveStub.getCall(1).args[0], hostname);

                assert.deepEqual(
                    resolveStub.getCall(0).args[1],
                    Object.assign({}, options, {family: Lookup.IPv4})
                );
                assert.deepEqual(
                    resolveStub.getCall(1).args[1],
                    Object.assign({}, options, {family: Lookup.IPv6})
                );

                assert.instanceOf(error, Error);
                assert.strictEqual(error.message, expectedError.message);

                assert.isTrue(makeNotFoundErrorSpy.notCalled);

                done();
            });
    });

    it('must run callback with error in case we got error during resolve on second call', done => {
        const expectedError = new Error('some error');
        const options       = {};

        const resolveStub = sinon.stub(lookup, '_resolve');
        resolveStub.onCall(0).callsFake(() => {
            return new Promise(resolve => resolve());
        });
        resolveStub.onCall(1).callsFake(() => {
            return new Promise((resolve, reject) => {
                reject(expectedError);
            });
        });

        const makeNotFoundErrorSpy = sinon.spy(lookup, '_makeNotFoundError');

        lookup._resolveBoth(hostname, options).catch(error => {
            assert.isTrue(resolveStub.calledTwice);

            assert.strictEqual(resolveStub.getCall(0).args[0], hostname);
            assert.strictEqual(resolveStub.getCall(1).args[0], hostname);

            assert.deepEqual(
                resolveStub.getCall(0).args[1],
                Object.assign({}, options, {family: Lookup.IPv4})
            );
            assert.deepEqual(
                resolveStub.getCall(1).args[1],
                Object.assign({}, options, {family: Lookup.IPv6})
            );

            assert.instanceOf(error, Error);
            assert.strictEqual(error.message, expectedError.message);

            assert.isTrue(makeNotFoundErrorSpy.notCalled);

            done();
        });
    });

    const setOfOptions = [
        {all: false},
        {all: true}
    ];

    setOfOptions.forEach(options => {
        it(`must return error, cuz no data were found with ${JSON.stringify(options)} options`, done => {
            const expectedError    = new Error(`${dns.NOTFOUND} ${hostname}`);
            expectedError.hostname = hostname;
            expectedError.code     = dns.NOTFOUND;
            expectedError.errno    = dns.NOTFOUND;

            const resolveStub = sinon.stub(lookup, '_resolve').callsFake(() => {
                return new Promise(resolve => {
                    if (options.all) {
                        resolve([]);
                    } else {
                        resolve({});
                    }
                });
            });

            const makeNotFoundErrorSpy = sinon.spy(lookup, '_makeNotFoundError');

            lookup._resolveBoth(hostname, options).catch(error => {
                assert.isTrue(resolveStub.calledTwice);

                assert.strictEqual(resolveStub.getCall(0).args[0], hostname);
                assert.strictEqual(resolveStub.getCall(1).args[0], hostname);

                assert.deepEqual(
                    resolveStub.getCall(0).args[1],
                    Object.assign({}, options, {family: Lookup.IPv4})
                );

                assert.deepEqual(
                    resolveStub.getCall(1).args[1],
                    Object.assign({}, options, {family: Lookup.IPv6})
                );

                assert.isTrue(makeNotFoundErrorSpy.calledOnce);
                assert.isTrue(makeNotFoundErrorSpy.calledWithExactly(hostname));

                assert.instanceOf(error, Error);
                assert.strictEqual(error.message, expectedError.message);
                assert.strictEqual(error.hostname, expectedError.hostname);
                assert.strictEqual(error.code, expectedError.code);
                assert.strictEqual(error.errno, expectedError.errno);

                done();
            });
        });
    });

    it('must return addresses that was found with {all: true} option. IPv4 should be listed first', () => {
        const options = {all: true};

        const ipv4records = [
            {address: '1.2.3.4'},
            {address: '5.6.7.8'}
        ];

        const ipv6records = [
            {address: '2001:0db8:85a3:0000:0000:8a2e:0370:7334'},
            {address: '2001:0db8:85a3:0000:0000:8a2e:0370:7335'}
        ];

        const expectedRecords = ipv4records.concat(ipv6records);

        const resolveStub = sinon.stub(lookup, '_resolve');
        resolveStub.onCall(0).callsFake(() => {
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve(ipv4records);
                }, 20);
            });
        });

        resolveStub.onCall(1).callsFake(() => {
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve(ipv6records);
                }, 10);
            });
        });

        const makeNotFoundErrorSpy = sinon.spy(lookup, '_makeNotFoundError');

        return lookup._resolveBoth(hostname, options).then(records => {
            assert.isTrue(resolveStub.calledTwice);

            assert.strictEqual(resolveStub.getCall(0).args[0], hostname);
            assert.strictEqual(resolveStub.getCall(1).args[0], hostname);

            assert.deepEqual(
                resolveStub.getCall(0).args[1],
                Object.assign({}, options, {family: Lookup.IPv4})
            );

            assert.deepEqual(
                resolveStub.getCall(1).args[1],
                Object.assign({}, options, {family: Lookup.IPv6})
            );

            assert.deepEqual(records, expectedRecords);

            assert.isTrue(makeNotFoundErrorSpy.notCalled);
        });
    });

    it('must return IPv4 address that was found with {all: false} option', () => {
        const options = {all: false};

        const ipv4records = [['1.2.3.4', 4]];
        const ipv6records = [[]];

        const resolveStub = sinon.stub(lookup, '_resolve');
        resolveStub.onCall(0).callsFake(() => {
            return new Promise(resolve => {
                resolve(ipv4records);
            });
        });

        resolveStub.onCall(1).callsFake(() => {
            return new Promise(resolve => {
                resolve(ipv6records);
            });
        });

        const makeNotFoundErrorSpy = sinon.spy(lookup, '_makeNotFoundError');

        return lookup._resolveBoth(hostname, options).then(records => {
            assert.isTrue(resolveStub.calledTwice);

            assert.strictEqual(resolveStub.getCall(0).args[0], hostname);
            assert.strictEqual(resolveStub.getCall(1).args[0], hostname);

            assert.deepEqual(
                resolveStub.getCall(0).args[1],
                Object.assign({}, options, {family: Lookup.IPv4})
            );

            assert.deepEqual(
                resolveStub.getCall(1).args[1],
                Object.assign({}, options, {family: Lookup.IPv6})
            );

            assert.deepEqual(records, ipv4records);

            assert.isTrue(makeNotFoundErrorSpy.notCalled);
        });
    });

    it('must return IPv6 address that was found with {all: false} option', () => {
        const options = {all: false};

        const ipv4records = [];
        const ipv6records = ['2001:0db8:85a3:0000:0000:8a2e:0370:7334', 6];

        const resolveStub = sinon.stub(lookup, '_resolve');
        resolveStub.onCall(0).callsFake(() => {
            return new Promise(resolve => {
                resolve(ipv4records);
            });
        });

        resolveStub.onCall(1).callsFake(() => {
            return new Promise(resolve => {
                resolve(ipv6records);
            });
        });

        const makeNotFoundErrorSpy = sinon.spy(lookup, '_makeNotFoundError');

        return lookup._resolveBoth(hostname, options).then(records => {
            assert.isTrue(resolveStub.calledTwice);

            assert.strictEqual(resolveStub.getCall(0).args[0], hostname);
            assert.strictEqual(resolveStub.getCall(1).args[0], hostname);

            assert.deepEqual(
                resolveStub.getCall(0).args[1],
                Object.assign({}, options, {family: Lookup.IPv4})
            );

            assert.deepEqual(
                resolveStub.getCall(1).args[1],
                Object.assign({}, options, {family: Lookup.IPv6})
            );

            assert.deepEqual(records, ipv6records);

            assert.isTrue(makeNotFoundErrorSpy.notCalled);
        });
    });
});
