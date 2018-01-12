'use strict';

const {assert} = require('chai');

const ResolveTask = require('../../../src/ResolveTask');
const addresses   = require('../../addresses');

describe('Unit: ResolveTask::addResolveCallback', () => {
    let task;

    const hostname  = addresses.INET_HOST1;
    const ipVersion = 4;

    beforeEach(() => {
        task = new ResolveTask(hostname, ipVersion);
    });

    it('must correct add callbacks to run when task has been resolved', () => {
        const resolvedCallback = () => {};
        const expectedCallback = [resolvedCallback];

        assert.isEmpty(task._callbacks);

        task.addResolvedCallback(resolvedCallback);

        assert.isTrue(task._callbacks.length === 1);
        assert.deepEqual(task._callbacks, expectedCallback);
    });
});
