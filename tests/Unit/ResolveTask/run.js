'use strict';

const {assert} = require('chai');
const sinon    = require('sinon');

const ResolveTask = require('../../../src/ResolveTask');
const addresses   = require('../../addresses');

describe('Unit: ResolveTask::run', () => {
    const hostname  = addresses.INET_HOST1;
    const ipVersion = 4;

    it('must run resolver with correct set of params', () => {
        const resolverSpy = sinon.spy();

        const task = new ResolveTask(hostname, ipVersion);

        task._resolver = resolverSpy;

        task.run();

        assert.isTrue(resolverSpy.calledOnce);
        assert.isTrue(resolverSpy.calledWithExactly(hostname, {ttl: true}, task._resolved));
    });

    it('must run resolver with timeout', () => {
        const timeout = 100;
        const clock = sinon.useFakeTimers();
        try {
            const resolverSpy = sinon.spy();

            const task = new ResolveTask(hostname, ipVersion, timeout);

            let error = undefined;
            task.on('error', err => error = err);

            task._resolver = resolverSpy;

            task.run();

            assert.isDefined(task._timeoutHandle);

            clock.tick(timeout);
            assert.isUndefined(task._timeoutHandle);
            assert.isDefined(error);
            assert(error.code === 'ETIMEDOUT');
        } finally {
            clock.restore();
        }

    });
});
