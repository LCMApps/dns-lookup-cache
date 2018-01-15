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
        {family: 4},
        {family: 6}
    ];

    setOfOptions.forEach(options => {
        it(`must correct call _resolve method with appropriate params and options ${JSON.stringify(options)}`, () => {
            const cb = () => {};

            const resolveStub     = sinon.stub(lookup, '_resolve');
            const resolveBothStub = sinon.stub(lookup, '_resolveBoth');

            lookup.run(hostname, options, cb);

            assert.isTrue(resolveStub.calledOnce);
            assert.isTrue(resolveStub.calledWithExactly(hostname, options, cb));

            assert.isTrue(resolveBothStub.notCalled);
        });
    });

    it('must correct call _resolveBoth method with appropriate params, cuz family value is undefined', () => {
        const options = {family: undefined};
        const cb      = () => {};

        const resolveStub     = sinon.stub(lookup, '_resolve');
        const resolveBothStub = sinon.stub(lookup, '_resolveBoth');

        lookup.run(hostname, options, cb);

        assert.isTrue(resolveStub.notCalled);

        assert.isTrue(resolveBothStub.calledOnce);
        assert.isTrue(resolveBothStub.calledWithExactly(hostname, options, cb));
    });
});
