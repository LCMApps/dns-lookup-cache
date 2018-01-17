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

    it(`must return function that calls '_resolve' under the hood and for ${dns.NOTFOUND} error returns empty array`,
        () => {
            const expectedRecords = [];

            const error = new Error('some error');
            error.code  = dns.NOTFOUND;

            const resolveSpy = sinon.stub(lookup, '_resolve').callsFake((hostname, options) => {
                assert.strictEqual(resolveSpy.getCall(0).args[0], hostname);
                assert.strictEqual(resolveSpy.getCall(0).args[1], options);

                return Promise.reject(error);
            });

            return lookup._resolveTaskBuilder(hostname, options).then(records => {
                assert.isTrue(resolveSpy.calledOnce);

                assert.strictEqual(resolveSpy.getCall(0).args.length, 2);
                assert.strictEqual(resolveSpy.getCall(0).args[0], hostname);
                assert.strictEqual(resolveSpy.getCall(0).args[1], options);

                assert.deepEqual(records, expectedRecords);
            });
        }
    );

    it('must return function that calls \'_resolve\' under the hood and in case error calls callback with an error',
        done => {
            const expectedError = new Error('some error');

            const resolveSpy = sinon.stub(lookup, '_resolve').callsFake((hostname, options) => {
                assert.strictEqual(resolveSpy.getCall(0).args[0], hostname);
                assert.strictEqual(resolveSpy.getCall(0).args[1], options);

                return Promise.reject(expectedError);
            });

            lookup._resolveTaskBuilder(hostname, options)
                .catch(error => {
                    assert.isTrue(resolveSpy.calledOnce);

                    assert.strictEqual(resolveSpy.getCall(0).args.length, 2);
                    assert.strictEqual(resolveSpy.getCall(0).args[0], hostname);
                    assert.strictEqual(resolveSpy.getCall(0).args[1], options);

                    assert.instanceOf(error, Error);
                    assert.strictEqual(error.message, expectedError.message);

                    done();
                });
        }
    );

    it('must return function that calls \'_resolve\' under the hood and in case no error calls callback with results',
        () => {
            const expectedRecords = [Symbol(), Symbol()];

            const resolveSpy = sinon.stub(lookup, '_resolve').callsFake((hostname, options) => {
                assert.strictEqual(resolveSpy.getCall(0).args[0], hostname);
                assert.strictEqual(resolveSpy.getCall(0).args[1], options);

                return Promise.resolve(expectedRecords);
            });

            return lookup._resolveTaskBuilder(hostname, options).then(records => {
                assert.isTrue(resolveSpy.calledOnce);

                assert.strictEqual(resolveSpy.getCall(0).args.length, 2);
                assert.strictEqual(resolveSpy.getCall(0).args[0], hostname);
                assert.strictEqual(resolveSpy.getCall(0).args[1], options);

                assert.deepEqual(records, expectedRecords);
            });
        }
    );
});
