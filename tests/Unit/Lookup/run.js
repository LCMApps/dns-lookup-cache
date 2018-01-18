'use strict';

const {assert} = require('chai');
const sinon    = require('sinon');

const Lookup    = require('../../../src/Lookup');
const addresses = require('../../addresses');

describe('Unit: Lookup::run', () => {
    let lookup;

    const hostname = addresses.INET_HOST1;

    beforeEach(() => {
        lookup = new Lookup();
    });

    const invalidSetOfOptions = [
        {family: -1},
        {family: 0},
        {family: 3},
        {family: 5},
        {family: 7}
    ];

    invalidSetOfOptions.forEach(invalidOptions => {
        it(`must throw exception, cuz family option is invalid ${JSON.stringify(invalidOptions)}`, () => {
            const cb = () => {};

            const resolveStub     = sinon.stub(lookup, '_resolve');
            const resolveBothStub = sinon.stub(lookup, '_resolveBoth');

            assert.throws(() => {
                lookup.run(hostname, invalidOptions, cb);
            }, Error, 'invalid family number, must be one of the {4, 6} or undefined');

            assert.isTrue(resolveStub.notCalled);
            assert.isTrue(resolveBothStub.notCalled);
        });
    });

    const setOfOptions = [
        {all: true, family: 4},
        {all: true, family: 6}
    ];

    setOfOptions.forEach(options => {
        it(`must correct call callback with results for options ${JSON.stringify(options)}`, done => {
            const expectedAddresses = [
                {address: '1.2.3.4'},
                {address: '5.6.7.8'}
            ];

            const cbSpy = sinon.stub();

            const resolveStub     = sinon.stub(lookup, '_resolve').resolves(expectedAddresses);
            const resolveBothStub = sinon.stub(lookup, '_resolveBoth');

            lookup.run(hostname, options, cbSpy);

            setImmediate(() => {
                assert.isTrue(resolveStub.calledOnce);
                assert.isTrue(resolveStub.calledWithExactly(hostname, options));

                assert.isTrue(cbSpy.calledOnce);
                assert.isTrue(cbSpy.calledWithExactly(null, expectedAddresses));

                assert.isTrue(resolveBothStub.notCalled);

                done();
            });
        });

        it(`must correct call callback with error for options ${JSON.stringify(options)}`, done => {
            const expectedError = new Error('some error');

            const cbSpy = sinon.stub();

            const resolveStub     = sinon.stub(lookup, '_resolve').rejects(expectedError);
            const resolveBothStub = sinon.stub(lookup, '_resolveBoth');

            lookup.run(hostname, options, cbSpy);

            setImmediate(() => {
                assert.isTrue(resolveStub.calledOnce);
                assert.isTrue(resolveStub.calledWithExactly(hostname, options));

                assert.isTrue(cbSpy.calledOnce);
                assert.strictEqual(cbSpy.getCall(0).args.length, 1);
                assert.instanceOf(cbSpy.getCall(0).args[0], Error);
                assert.strictEqual(cbSpy.getCall(0).args[0].message, expectedError.message);

                assert.isTrue(resolveBothStub.notCalled);

                done();
            });
        });
    });

    it('must correct call callback with error when family value is undefined', done => {
        const expectedError = new Error('some error');
        const options       = {family: undefined};

        const cbSpy = sinon.stub();

        const resolveStub     = sinon.stub(lookup, '_resolve');
        const resolveBothStub = sinon.stub(lookup, '_resolveBoth').rejects(expectedError);

        lookup.run(hostname, options, cbSpy);

        setImmediate(() => {
            assert.isTrue(resolveStub.notCalled);

            assert.isTrue(cbSpy.calledOnce);
            assert.strictEqual(cbSpy.getCall(0).args.length, 1);
            assert.instanceOf(cbSpy.getCall(0).args[0], Error);
            assert.strictEqual(cbSpy.getCall(0).args[0].message, expectedError.message);

            assert.isTrue(resolveBothStub.calledOnce);
            assert.isTrue(resolveBothStub.calledWithExactly(hostname, options));

            done();
        });
    });

    it('must correct call callback with appropriate data when family value is undefined', done => {
        const expectedAddresses = [
            {address: '1.2.3.4'},
            {address: '5.6.7.8'}
        ];

        const options = {all: true, family: undefined};

        const cbSpy = sinon.stub();

        const resolveStub     = sinon.stub(lookup, '_resolve');
        const resolveBothStub = sinon.stub(lookup, '_resolveBoth').resolves(expectedAddresses);

        lookup.run(hostname, options, cbSpy);

        setImmediate(() => {
            assert.isTrue(resolveStub.notCalled);

            assert.isTrue(cbSpy.calledOnce);
            assert.isTrue(cbSpy.calledWithExactly(null, expectedAddresses));

            assert.isTrue(resolveBothStub.calledOnce);
            assert.isTrue(resolveBothStub.calledWithExactly(hostname, options));

            done();
        });
    });
});
