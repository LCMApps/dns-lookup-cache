'use strict';

const dns = require('dns');

const {assert} = require('chai');
const sinon    = require('sinon');

const Lookup = require('../../../src/Lookup');

describe('Unit: Lookup::_resolveTaskBuilder', () => {
    const hostname = Symbol();
    const options  = Symbol();

    let lookup;

    beforeEach(() => {
        lookup = new Lookup();
    });

    it('must return new function every call', () => {
        const expectedNumberOfArguments = 1;

        const resolveTask1 = lookup._resolveTaskBuilder();
        const resolveTask2 = lookup._resolveTaskBuilder();

        assert.instanceOf(resolveTask1, Function);
        assert.instanceOf(resolveTask2, Function);

        assert.strictEqual(resolveTask1.length, expectedNumberOfArguments);
        assert.strictEqual(resolveTask2.length, expectedNumberOfArguments);

        assert.notStrictEqual(resolveTask1, resolveTask2);
    });

    it(`must return function that calls '_resolve' under the hood and for ${dns.NOTFOUND} error returns empty array`,
        () => {
            const error = new Error('some error');
            error.code  = dns.NOTFOUND;

            const cbSpy      = sinon.spy();
            const resolveSpy = sinon.stub(lookup, '_resolve').callsFake((hostname, options, cb) => {
                assert.strictEqual(resolveSpy.getCall(0).args[0], hostname);
                assert.strictEqual(resolveSpy.getCall(0).args[1], options);

                cb(error);
            });

            const resolveTask = lookup._resolveTaskBuilder(hostname, options);

            resolveTask(cbSpy);

            assert.isTrue(resolveSpy.calledOnce);
            assert.strictEqual(resolveSpy.getCall(0).args[0], hostname);
            assert.strictEqual(resolveSpy.getCall(0).args[1], options);
            assert.instanceOf(resolveSpy.getCall(0).args[2], Function);

            assert.isTrue(cbSpy.calledOnce);
            assert.isTrue(cbSpy.calledWithExactly(null, []));
        }
    );

    it('must return function that calls \'_resolve\' under the hood and in case error calls callback with an error',
        () => {
            const error = new Error('some error');

            const cbSpy      = sinon.spy();
            const resolveSpy = sinon.stub(lookup, '_resolve').callsFake((hostname, options, cb) => {
                assert.strictEqual(resolveSpy.getCall(0).args[0], hostname);
                assert.strictEqual(resolveSpy.getCall(0).args[1], options);

                cb(error);
            });

            const resolveTask = lookup._resolveTaskBuilder(hostname, options);

            resolveTask(cbSpy);

            assert.isTrue(resolveSpy.calledOnce);
            assert.strictEqual(resolveSpy.getCall(0).args[0], hostname);
            assert.strictEqual(resolveSpy.getCall(0).args[1], options);
            assert.instanceOf(resolveSpy.getCall(0).args[2], Function);

            assert.isTrue(cbSpy.calledOnce);
            assert.strictEqual(cbSpy.getCall(0).args.length, 1);
            assert.instanceOf(cbSpy.getCall(0).args[0], Error);
            assert.strictEqual(cbSpy.getCall(0).args[0].message, error.message);
        }
    );

    it('must return function that calls \'_resolve\' under the hood and in case no error calls callback with results',
        () => {
            const error   = null;
            const results = [Symbol(), Symbol()];

            const cbSpy      = sinon.spy();
            const resolveSpy = sinon.stub(lookup, '_resolve').callsFake((hostname, options, cb) => {
                assert.strictEqual(resolveSpy.getCall(0).args[0], hostname);
                assert.strictEqual(resolveSpy.getCall(0).args[1], options);

                cb(error, ...results);
            });

            const resolveTask = lookup._resolveTaskBuilder(hostname, options);

            resolveTask(cbSpy);

            assert.isTrue(resolveSpy.calledOnce);
            assert.strictEqual(resolveSpy.getCall(0).args[0], hostname);
            assert.strictEqual(resolveSpy.getCall(0).args[1], options);
            assert.instanceOf(resolveSpy.getCall(0).args[2], Function);

            assert.isTrue(cbSpy.calledOnce);
            assert.strictEqual(cbSpy.getCall(0).args.length, 3);
            assert.isNull(cbSpy.getCall(0).args[0]);
            assert.deepEqual(cbSpy.getCall(0).args.slice(1), results);
        }
    );
});
