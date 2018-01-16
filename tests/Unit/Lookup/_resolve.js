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

    it('must correct call callback with adjusted error', () => {
        const expectedErrorMessage = new Error('expected error message');

        const expectedNumberOfResolveTriesAfterError = 0;

        const error   = new Error('some error');
        error.syscall = 'some-sys-call';
        error.code    = dns.NODATA;

        const callbackStub = sinon.stub();

        makeNotFoundErrorStub = sinon.stub(Lookup.prototype, '_makeNotFoundError').returns(expectedErrorMessage);
        innerResolveStub      = sinon.stub(Lookup.prototype, '_innerResolve')
            .callsFake((hostname, family, callback) => {
                callback(error);
            });

        lookup._resolve(hostname, {family: 4}, callbackStub);

        assert.isTrue(callbackStub.calledOnce);
        assert.strictEqual(callbackStub.getCall(0).args[0], expectedErrorMessage);

        assert.isTrue(makeNotFoundErrorStub.calledOnce);
        assert.isTrue(makeNotFoundErrorStub.calledWithExactly(hostname, error.syscall));

        assert.strictEqual(lookup._amountOfResolveTries[hostname], expectedNumberOfResolveTriesAfterError);
    });

    it('must correct call callback with original error', () => {
        const expectedErrorMessage = new Error('expected error message');

        const expectedNumberOfResolveTriesAfterError = 0;

        const callbackStub = sinon.stub();

        makeNotFoundErrorStub = sinon.spy(Lookup.prototype, '_makeNotFoundError');
        innerResolveStub      = sinon.stub(Lookup.prototype, '_innerResolve')
            .callsFake((hostname, family, callback) => {
                callback(expectedErrorMessage);
            });

        lookup._resolve(hostname, {family: 4}, callbackStub);

        assert.isTrue(callbackStub.calledOnce);
        assert.strictEqual(callbackStub.getCall(0).args[0], expectedErrorMessage);

        assert.isTrue(makeNotFoundErrorStub.notCalled);

        assert.strictEqual(lookup._amountOfResolveTries[hostname], expectedNumberOfResolveTriesAfterError);
    });

    it('must go into recursion if there is no error and records param equals to undefined', () => {
        const error   = null;
        const records = undefined;

        const expectedNumberOfResolveTriesAfterRecursion = 0;

        const callbackStub = sinon.stub();

        makeNotFoundErrorStub = sinon.spy(Lookup.prototype, '_makeNotFoundError');
        innerResolveStub      = sinon.stub(Lookup.prototype, '_innerResolve')
            .callsFake((hostname, family, callback) => {
                callback(error, records);
            });

        lookup._resolve(hostname, {family: 4}, callbackStub);

        assert.isTrue(callbackStub.calledOnce);
        assert.instanceOf(callbackStub.getCall(0).args[0], Error);
        assert.strictEqual(
            callbackStub.getCall(0).args[0].message,
            `Cannot resolve host '${hostname}'. Too deep recursion.`
        );

        assert.isTrue(makeNotFoundErrorStub.notCalled);

        assert.strictEqual(lookup._amountOfResolveTries[hostname], expectedNumberOfResolveTriesAfterRecursion);
    });

    it('must return next IP address every call (RR algorithm) ({all: false} option has been provided)', () => {
        const error   = null;
        const records = [
            {address: 1, family: 4},
            {address: 2, family: 4}
        ];

        const expectedNumberOfResolveTriesAfterCorrectResolve = 0;

        const callbackStub = sinon.stub();

        makeNotFoundErrorStub = sinon.spy(Lookup.prototype, '_makeNotFoundError');
        innerResolveStub      = sinon.stub(Lookup.prototype, '_innerResolve')
            .callsFake((hostname, family, callback) => {
                callback(error, records);
            });

        lookup._resolve(hostname, {family: 4}, callbackStub);
        lookup._resolve(hostname, {family: 4}, callbackStub);
        lookup._resolve(hostname, {family: 4}, callbackStub);

        assert.isTrue(callbackStub.calledThrice);

        assert.deepEqual(callbackStub.getCall(0).args[0], null);
        assert.deepEqual(callbackStub.getCall(0).args[1], records[0].address);
        assert.deepEqual(callbackStub.getCall(0).args[2], records[0].family);

        assert.deepEqual(callbackStub.getCall(1).args[0], null);
        assert.deepEqual(callbackStub.getCall(1).args[1], records[1].address);
        assert.deepEqual(callbackStub.getCall(1).args[2], records[1].family);

        assert.deepEqual(callbackStub.getCall(2).args[0], null);
        assert.deepEqual(callbackStub.getCall(2).args[1], records[0].address);
        assert.deepEqual(callbackStub.getCall(2).args[2], records[0].family);

        assert.isTrue(makeNotFoundErrorStub.notCalled);

        assert.strictEqual(lookup._amountOfResolveTries[hostname], expectedNumberOfResolveTriesAfterCorrectResolve);
    });

    it('must return all IP addresses ({all: true} options has been provided)', () => {
        const error           = null;
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

        const callbackStub = sinon.stub();

        makeNotFoundErrorStub = sinon.spy(Lookup.prototype, '_makeNotFoundError');
        innerResolveStub      = sinon.stub(Lookup.prototype, '_innerResolve')
            .callsFake((hostname, family, callback) => {
                callback(error, records);
            });

        lookup._resolve(hostname, {all: true, family: 4}, callbackStub);

        assert.isTrue(callbackStub.calledOnce);

        assert.deepEqual(callbackStub.getCall(0).args[0], null);
        assert.deepEqual(callbackStub.getCall(0).args[1], expectedRecords);

        assert.isTrue(makeNotFoundErrorStub.notCalled);

        assert.strictEqual(lookup._amountOfResolveTries[hostname], expectedNumberOfResolveTriesAfterCorrectResolve);
    });
});
