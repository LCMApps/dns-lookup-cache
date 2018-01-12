'use strict';

const dns = require('dns');

const async    = require('async');
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

    it('must run two resolve tasks for IPv4 and IPv6 in parallel', () => {
        const options = {};

        const resolveTaskBuilderStub = sinon.stub(lookup, '_resolveTaskBuilder').callsFake(() => {
            return cb => {};
        });

        const asyncParallelSpy = sinon.spy(async, 'parallel');

        lookup._resolveBoth(hostname, options);

        assert.isTrue(asyncParallelSpy.calledOnce);
        assert.isTrue(resolveTaskBuilderStub.calledTwice);

        assert.strictEqual(resolveTaskBuilderStub.getCall(0).args[0], hostname);
        assert.strictEqual(resolveTaskBuilderStub.getCall(1).args[0], hostname);

        assert.deepEqual(
            resolveTaskBuilderStub.getCall(0).args[1],
            Object.assign({}, options, {family: Lookup.IPv4})
        );
        assert.deepEqual(
            resolveTaskBuilderStub.getCall(1).args[1],
            Object.assign({}, options, {family: Lookup.IPv6})
        );
    });

    it('must run callback with error in case we got error during resolve on first call', done => {
        const cbSpy = sinon.stub();

        const error   = new Error('some error');
        const options = {};

        const resolveTaskBuilderStub = sinon.stub(lookup, '_resolveTaskBuilder');
        resolveTaskBuilderStub.onCall(0).callsFake(() => {
            return cb => {
                setImmediate(() => {
                    cb(error);
                });
            };
        });
        resolveTaskBuilderStub.onCall(1).callsFake(() => {
            return cb => {};
        });

        const makeNotFoundErrorSpy = sinon.spy(lookup, '_makeNotFoundError');

        lookup._resolveBoth(hostname, options, cbSpy);

        setImmediate(() => {
            assert.isTrue(resolveTaskBuilderStub.calledTwice);

            assert.strictEqual(resolveTaskBuilderStub.getCall(0).args[0], hostname);
            assert.strictEqual(resolveTaskBuilderStub.getCall(1).args[0], hostname);

            assert.deepEqual(
                resolveTaskBuilderStub.getCall(0).args[1],
                Object.assign({}, options, {family: Lookup.IPv4})
            );
            assert.deepEqual(
                resolveTaskBuilderStub.getCall(1).args[1],
                Object.assign({}, options, {family: Lookup.IPv6})
            );

            assert.isTrue(cbSpy.calledOnce);

            assert.strictEqual(cbSpy.getCall(0).args.length, 1);
            assert.instanceOf(cbSpy.getCall(0).args[0], Error);
            assert.strictEqual(cbSpy.getCall(0).args[0].message, error.message);

            assert.isTrue(makeNotFoundErrorSpy.notCalled);

            done();
        });
    });

    it('must run callback with error in case we got error during resolve on second call', done => {
        const cbSpy = sinon.stub();

        const error   = new Error('some error');
        const options = {};

        const resolveTaskBuilderStub = sinon.stub(lookup, '_resolveTaskBuilder');
        resolveTaskBuilderStub.onCall(0).callsFake(() => {
            return cb => {};
        });
        resolveTaskBuilderStub.onCall(1).callsFake(() => {
            return cb => {
                setImmediate(() => {
                    cb(error);
                });
            };
        });

        const makeNotFoundErrorSpy = sinon.spy(lookup, '_makeNotFoundError');

        lookup._resolveBoth(hostname, options, cbSpy);

        setImmediate(() => {
            assert.isTrue(resolveTaskBuilderStub.calledTwice);

            assert.strictEqual(resolveTaskBuilderStub.getCall(0).args[0], hostname);
            assert.strictEqual(resolveTaskBuilderStub.getCall(1).args[0], hostname);

            assert.deepEqual(
                resolveTaskBuilderStub.getCall(0).args[1],
                Object.assign({}, options, {family: Lookup.IPv4})
            );
            assert.deepEqual(
                resolveTaskBuilderStub.getCall(1).args[1],
                Object.assign({}, options, {family: Lookup.IPv6})
            );

            assert.isTrue(cbSpy.calledOnce);

            assert.strictEqual(cbSpy.getCall(0).args.length, 1);
            assert.instanceOf(cbSpy.getCall(0).args[0], Error);
            assert.strictEqual(cbSpy.getCall(0).args[0].message, error.message);

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

            const cbSpy = sinon.stub();

            const resolveTaskBuilderStub = sinon.stub(lookup, '_resolveTaskBuilder').callsFake(() => {
                return cb => {
                    setImmediate(() => {
                        cb(null, []);
                    });
                };
            });

            const makeNotFoundErrorSpy = sinon.spy(lookup, '_makeNotFoundError');

            lookup._resolveBoth(hostname, options, cbSpy);

            setImmediate(() => {
                assert.isTrue(resolveTaskBuilderStub.calledTwice);

                assert.strictEqual(resolveTaskBuilderStub.getCall(0).args[0], hostname);
                assert.strictEqual(resolveTaskBuilderStub.getCall(1).args[0], hostname);

                assert.deepEqual(
                    resolveTaskBuilderStub.getCall(0).args[1],
                    Object.assign({}, options, {family: Lookup.IPv4})
                );

                assert.deepEqual(
                    resolveTaskBuilderStub.getCall(1).args[1],
                    Object.assign({}, options, {family: Lookup.IPv6})
                );

                assert.isTrue(cbSpy.calledOnce);

                assert.isTrue(makeNotFoundErrorSpy.calledOnce);
                assert.isTrue(makeNotFoundErrorSpy.calledWithExactly(hostname));

                assert.strictEqual(cbSpy.getCall(0).args.length, 1);
                assert.instanceOf(cbSpy.getCall(0).args[0], Error);
                assert.strictEqual(cbSpy.getCall(0).args[0].message, expectedError.message);
                assert.strictEqual(cbSpy.getCall(0).args[0].hostname, expectedError.hostname);
                assert.strictEqual(cbSpy.getCall(0).args[0].code, expectedError.code);
                assert.strictEqual(cbSpy.getCall(0).args[0].errno, expectedError.errno);

                done();
            });
        });
    });

    it('must return addresses that was found with {all: true} option. IPv4 should be listed first', done => {
        const options = {all: true};

        const cbSpy = sinon.stub();

        const ipv4records = [
            {address: '1.2.3.4'},
            {address: '5.6.7.8'}
        ];

        const ipv6records = [
            {address: '2001:0db8:85a3:0000:0000:8a2e:0370:7334'},
            {address: '2001:0db8:85a3:0000:0000:8a2e:0370:7335'}
        ];

        const resolveTaskBuilderStub = sinon.stub(lookup, '_resolveTaskBuilder');
        resolveTaskBuilderStub.onCall(0).callsFake(() => {
            return cb => {
                setTimeout(() => {
                    cb(null, ipv4records);
                }, 20);
            };
        });

        resolveTaskBuilderStub.onCall(1).callsFake(() => {
            return cb => {
                setTimeout(() => {
                    cb(null, ipv6records);
                }, 10);
            };
        });

        const makeNotFoundErrorSpy = sinon.spy(lookup, '_makeNotFoundError');

        lookup._resolveBoth(hostname, options, cbSpy);

        setTimeout(() => {
            assert.isTrue(resolveTaskBuilderStub.calledTwice);

            assert.strictEqual(resolveTaskBuilderStub.getCall(0).args[0], hostname);
            assert.strictEqual(resolveTaskBuilderStub.getCall(1).args[0], hostname);

            assert.deepEqual(
                resolveTaskBuilderStub.getCall(0).args[1],
                Object.assign({}, options, {family: Lookup.IPv4})
            );

            assert.deepEqual(
                resolveTaskBuilderStub.getCall(1).args[1],
                Object.assign({}, options, {family: Lookup.IPv6})
            );

            assert.isTrue(cbSpy.calledOnce);

            assert.strictEqual(cbSpy.getCall(0).args.length, 2);
            assert.isNull(cbSpy.getCall(0).args[0]);
            assert.deepEqual(cbSpy.getCall(0).args[1], ipv4records.concat(ipv6records));

            assert.isTrue(makeNotFoundErrorSpy.notCalled);

            done();
        }, 30);
    });

    it('must return IPv4 address that was found with {all: false} option', done => {
        const options = {all: false};

        const cbSpy = sinon.stub();

        const ipv4records = ['1.2.3.4', 4];
        const ipv6records = [];

        const resolveTaskBuilderStub = sinon.stub(lookup, '_resolveTaskBuilder');
        resolveTaskBuilderStub.onCall(0).callsFake(() => {
            return cb => {
                setImmediate(() => {
                    cb(null, ipv4records);
                });
            };
        });

        resolveTaskBuilderStub.onCall(1).callsFake(() => {
            return cb => {
                setImmediate(() => {
                    cb(null, ipv6records);
                });
            };
        });

        const makeNotFoundErrorSpy = sinon.spy(lookup, '_makeNotFoundError');

        lookup._resolveBoth(hostname, options, cbSpy);

        setTimeout(() => {
            assert.isTrue(resolveTaskBuilderStub.calledTwice);

            assert.strictEqual(resolveTaskBuilderStub.getCall(0).args[0], hostname);
            assert.strictEqual(resolveTaskBuilderStub.getCall(1).args[0], hostname);

            assert.deepEqual(
                resolveTaskBuilderStub.getCall(0).args[1],
                Object.assign({}, options, {family: Lookup.IPv4})
            );

            assert.deepEqual(
                resolveTaskBuilderStub.getCall(1).args[1],
                Object.assign({}, options, {family: Lookup.IPv6})
            );

            assert.isTrue(cbSpy.calledOnce);

            assert.strictEqual(cbSpy.getCall(0).args.length, 3);
            assert.isNull(cbSpy.getCall(0).args[0]);
            assert.deepEqual(cbSpy.getCall(0).args.slice(1), ipv4records);

            assert.isTrue(makeNotFoundErrorSpy.notCalled);

            done();
        }, 30);
    });

    it('must return IPv6 address that was found with {all: false} option', done => {
        const options = {all: false};

        const cbSpy = sinon.stub();

        const ipv4records = [];
        const ipv6records = ['2001:0db8:85a3:0000:0000:8a2e:0370:7334', 6];

        const resolveTaskBuilderStub = sinon.stub(lookup, '_resolveTaskBuilder');
        resolveTaskBuilderStub.onCall(0).callsFake(() => {
            return cb => {
                setImmediate(() => {
                    cb(null, ipv4records);
                });
            };
        });

        resolveTaskBuilderStub.onCall(1).callsFake(() => {
            return cb => {
                setImmediate(() => {
                    cb(null, ipv6records);
                });
            };
        });

        const makeNotFoundErrorSpy = sinon.spy(lookup, '_makeNotFoundError');

        lookup._resolveBoth(hostname, options, cbSpy);

        setTimeout(() => {
            assert.isTrue(resolveTaskBuilderStub.calledTwice);

            assert.strictEqual(resolveTaskBuilderStub.getCall(0).args[0], hostname);
            assert.strictEqual(resolveTaskBuilderStub.getCall(1).args[0], hostname);

            assert.deepEqual(
                resolveTaskBuilderStub.getCall(0).args[1],
                Object.assign({}, options, {family: Lookup.IPv4})
            );

            assert.deepEqual(
                resolveTaskBuilderStub.getCall(1).args[1],
                Object.assign({}, options, {family: Lookup.IPv6})
            );

            assert.isTrue(cbSpy.calledOnce);

            assert.strictEqual(cbSpy.getCall(0).args.length, 3);
            assert.isNull(cbSpy.getCall(0).args[0]);
            assert.deepEqual(cbSpy.getCall(0).args.slice(1), ipv6records);

            assert.isTrue(makeNotFoundErrorSpy.notCalled);

            done();
        }, 30);
    });
});
