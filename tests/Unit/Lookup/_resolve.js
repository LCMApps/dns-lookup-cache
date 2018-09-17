'use strict';

const dns = require('dns');

const {assert} = require('chai');
const sinon    = require('sinon');

const Lookup    = require('../../../src/Lookup');
const addresses = require('../../addresses');

describe('Unit: Lookup::_resolve', () => {
    const hostname = addresses.INET_HOST1;

    let makeNotFoundErrorStub;
    let innerResolveStub;

    let lookup;

    beforeEach(() => {
        lookup = new Lookup();
    });

    afterEach(() => {
        makeNotFoundErrorStub.restore();
        innerResolveStub.restore();
    });

    it('must correct rejects with adjusted error if got NODATA error', done => {
        const err   = new Error('some error');
        err.syscall = 'some-sys-call';
        err.code    = dns.NODATA;

        const expectedErrorMessage    = new Error(`${err.syscall} ENOTFOUND ${hostname}`);
        expectedErrorMessage.hostname = hostname;
        expectedErrorMessage.syscall  = 'some-sys-call';
        expectedErrorMessage.code     = dns.NOTFOUND;
        expectedErrorMessage.errno    = dns.NOTFOUND;

        const expectedNumberOfResolveTriesAfterError = 0;

        makeNotFoundErrorStub = sinon.spy(Lookup.prototype, '_makeNotFoundError');
        innerResolveStub      = sinon.stub(Lookup.prototype, '_innerResolve').rejects(err);

        lookup._resolve(hostname, {family: 4})
            .catch(error => {
                assert.instanceOf(error, Error);
                assert.strictEqual(error.message, expectedErrorMessage.message);
                assert.strictEqual(error.syscall, expectedErrorMessage.syscall);
                assert.strictEqual(error.code, expectedErrorMessage.code);
                assert.strictEqual(error.errno, expectedErrorMessage.code);

                assert.isTrue(makeNotFoundErrorStub.calledOnce);
                assert.isTrue(makeNotFoundErrorStub.calledWithExactly(hostname, error.syscall));

                assert.strictEqual(lookup._amountOfResolveTries[hostname], expectedNumberOfResolveTriesAfterError);

                done();
            });
    });

    const testCases = [
        {
            family: 4
        },
        {
            family: 6
        }
    ];

    testCases.forEach(testCase => {
        it(`must correct rejects with error if got empty result with no error for family - ${
            testCase.family
        }`, done => {

            const expectedError = new Error(`Empty "${testCase.family === 4 ? 'A' : 'AAAA'}" records list for ` +
                hostname);
            expectedError.hostname = hostname;
            const expectedNumberOfResolveTriesAfterError = 0;

            innerResolveStub  = sinon.stub(Lookup.prototype, '_innerResolve').resolves([]);

            lookup._resolve(hostname, {family: testCase.family})
                .catch(error => {
                    assert.instanceOf(error, Error);
                    assert.strictEqual(error.message, expectedError.message);
                    assert.strictEqual(error.hostname, expectedError.hostname);

                    assert.strictEqual(lookup._amountOfResolveTries[hostname], expectedNumberOfResolveTriesAfterError);

                    done();
                });
        });
    });

    it('must correct rejects with original error', done => {
        const expectedError = new Error('expected error message');

        const expectedNumberOfResolveTriesAfterError = 0;

        makeNotFoundErrorStub = sinon.spy(Lookup.prototype, '_makeNotFoundError');
        innerResolveStub      = sinon.stub(Lookup.prototype, '_innerResolve').rejects(expectedError);

        lookup._resolve(hostname, {family: 4})
            .catch(error => {
                assert.instanceOf(error, Error);
                assert.strictEqual(error.message, expectedError.message);

                assert.isTrue(makeNotFoundErrorStub.notCalled);

                assert.strictEqual(lookup._amountOfResolveTries[hostname], expectedNumberOfResolveTriesAfterError);

                done();
            });
    });

    it('must go into recursion if there is no error and records param equals to undefined', done => {
        const expectedNumberOfResolveTriesAfterRecursion = 0;

        makeNotFoundErrorStub = sinon.spy(Lookup.prototype, '_makeNotFoundError');
        innerResolveStub      = sinon.stub(Lookup.prototype, '_innerResolve').resolves(undefined);

        lookup._resolve(hostname, {family: 4})
            .catch(error => {
                assert.instanceOf(error, Error);
                assert.strictEqual(
                    error.message,
                    `Cannot resolve host '${hostname}'. Too deep recursion.`
                );

                assert.isTrue(makeNotFoundErrorStub.notCalled);

                assert.strictEqual(lookup._amountOfResolveTries[hostname], expectedNumberOfResolveTriesAfterRecursion);

                done();
            });
    });

    it('must resolve next IP address every call (RR algorithm) ({all: false} option has been provided)', () => {
        const records = [
            {address: 1, family: 4},
            {address: 2, family: 4}
        ];

        const expectedNumberOfResolveTriesAfterCorrectResolve = 0;

        makeNotFoundErrorStub = sinon.spy(Lookup.prototype, '_makeNotFoundError');
        innerResolveStub      = sinon.stub(Lookup.prototype, '_innerResolve').resolves(records);

        return Promise.all([
            lookup._resolve(hostname, {family: 4}),
            lookup._resolve(hostname, {family: 4}),
            lookup._resolve(hostname, {family: 4})
        ])
            .then(results => {
                const [resolve1, resolve2, resolve3] = results;

                assert.deepEqual(resolve1, {address: records[0].address, family: records[0].family});

                assert.deepEqual(resolve2, {address: records[1].address, family: records[1].family});

                assert.deepEqual(resolve3, {address: records[0].address, family: records[0].family});

                assert.strictEqual(
                    lookup._amountOfResolveTries[hostname],
                    expectedNumberOfResolveTriesAfterCorrectResolve
                );
            });
    });

    it('must resolves all IP addresses ({all: true} options has been provided)', () => {
        const records         = [
            {address: 1, family: 4, expiredTime: Date.now()},
            {address: 2, family: 4, expiredTime: Date.now()}
        ];
        const expectedRecords = records.map(record => {
            return {
                address: record.address,
                family:  record.family
            };
        });

        const expectedNumberOfResolveTriesAfterCorrectResolve = 0;

        makeNotFoundErrorStub = sinon.spy(Lookup.prototype, '_makeNotFoundError');
        innerResolveStub      = sinon.stub(Lookup.prototype, '_innerResolve').resolves(records);

        return lookup._resolve(hostname, {all: true, family: 4})
            .then(results => {
                assert.deepEqual(results, expectedRecords);

                assert.strictEqual(
                    lookup._amountOfResolveTries[hostname],
                    expectedNumberOfResolveTriesAfterCorrectResolve
                );
            });
    });
});
