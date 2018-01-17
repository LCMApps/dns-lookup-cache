'use strict';

const {assert} = require('chai');
const sinon    = require('sinon');

const ResolveTask = require('../../../src/ResolveTask');

const addresses = require('../../addresses');

describe('Unit: ResolveTask::_resolved', () => {
    const hostname  = addresses.INET_HOST1;
    const ipVersion = 4;

    let onErrorSpy;
    let onAddressesSpy;

    beforeEach(() => {
        onAddressesSpy = sinon.spy();
        onErrorSpy     = sinon.spy();
    });

    it('must correct emit error event', () => {
        const expectedError = new Error('some erorr');
        const task          = new ResolveTask(hostname, ipVersion);

        task.on('error', onErrorSpy);
        task.on('addresses', onAddressesSpy);

        task._resolved(expectedError);

        assert.isTrue(onAddressesSpy.notCalled);

        assert.isTrue(onErrorSpy.calledOnce);
        assert.instanceOf(onErrorSpy.getCall(0).args[0], Error);
        assert.strictEqual(onErrorSpy.getCall(0).args[0].message, expectedError.message);
    });

    it('must correct emit address event', () => {
        const expectedAddresses = [{}];
        const task              = new ResolveTask(hostname, ipVersion);

        task.on('error', onErrorSpy);
        task.on('addresses', onAddressesSpy);

        task._resolved(null, expectedAddresses);

        assert.isTrue(onAddressesSpy.calledOnce);
        assert.strictEqual(onAddressesSpy.getCall(0).args[0].length, 1);
        assert.deepEqual(onAddressesSpy.getCall(0).args[0], expectedAddresses);

        assert.isTrue(onErrorSpy.notCalled);
    });
});
