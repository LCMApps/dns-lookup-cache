'use strict';

const async    = require('async');
const sinon    = require('sinon');
const {assert} = require('chai');

const Lookup      = require('../../../src/Lookup');
const ResolveTask = require('../../../src/ResolveTask');
const addresses   = require('../../addresses');

describe('Func: Lookup::_innerResolve', () => {
    it('must has correct behavior for parallel requests with for different hosts', done => {
        const ipVersion = 4;

        const lookup = new Lookup();

        const addressCacheFindSpy = sinon.spy(lookup._addressCache, 'find');
        const addressCacheSetSpy  = sinon.spy(lookup._addressCache, 'set');

        const tasksManagerFindSpy = sinon.spy(lookup._tasksManager, 'find');
        const tasksManagerAddSpy  = sinon.spy(lookup._tasksManager, 'add');
        const tasksManagerDoneSpy = sinon.spy(lookup._tasksManager, 'done');

        const taskAddResolvedCallbackSpy = sinon.spy(ResolveTask.prototype, 'addResolvedCallback');
        const taskRunSpy                 = sinon.spy(ResolveTask.prototype, 'run');

        async.parallel([
            cb => lookup._innerResolve(addresses.INET_HOST1, ipVersion, cb),
            cb => lookup._innerResolve(addresses.INET_HOST2, ipVersion, cb)
        ], (error, results) => {
            assert.ifError(error);

            assert.isTrue(addressCacheFindSpy.calledTwice);

            assert.isTrue(addressCacheSetSpy.calledTwice);

            assert.isTrue(tasksManagerFindSpy.calledTwice);

            assert.isTrue(tasksManagerAddSpy.calledTwice);

            assert.isTrue(tasksManagerDoneSpy.calledTwice);

            assert.isTrue(taskAddResolvedCallbackSpy.calledTwice);
            assert.isTrue(taskRunSpy.calledTwice);

            addressCacheFindSpy.restore();
            addressCacheSetSpy.restore();

            tasksManagerFindSpy.restore();
            tasksManagerAddSpy.restore();
            tasksManagerDoneSpy.restore();

            taskAddResolvedCallbackSpy.restore();
            taskRunSpy.restore();

            done();
        });
    });

    it('must has correct behavior for parallel requests with the same hostname', done => {
        const ipVersion = 4;

        const lookup = new Lookup();

        const addressCacheFindSpy = sinon.spy(lookup._addressCache, 'find');
        const addressCacheSetSpy  = sinon.spy(lookup._addressCache, 'set');

        const tasksManagerFindSpy = sinon.spy(lookup._tasksManager, 'find');
        const tasksManagerAddSpy  = sinon.spy(lookup._tasksManager, 'add');
        const tasksManagerDoneSpy = sinon.spy(lookup._tasksManager, 'done');

        const taskAddResolvedCallbackSpy = sinon.spy(ResolveTask.prototype, 'addResolvedCallback');
        const taskRunSpy                 = sinon.spy(ResolveTask.prototype, 'run');

        async.parallel([
            cb => lookup._innerResolve(addresses.INET_HOST1, ipVersion, cb),
            cb => lookup._innerResolve(addresses.INET_HOST1, ipVersion, cb)
        ], error => {
            assert.ifError(error);

            assert.isTrue(addressCacheFindSpy.calledTwice);
            assert.isTrue(addressCacheFindSpy.calledWithExactly(`${addresses.INET_HOST1}_${ipVersion}`));

            assert.isTrue(addressCacheSetSpy.calledOnce);
            assert.strictEqual(addressCacheSetSpy.getCall(0).args[0], `${addresses.INET_HOST1}_${ipVersion}`);
            assert.instanceOf(addressCacheSetSpy.getCall(0).args[1], Array);

            assert.isTrue(tasksManagerFindSpy.calledTwice);
            assert.isTrue(tasksManagerFindSpy.calledWithExactly(`${addresses.INET_HOST1}_${ipVersion}`));

            assert.isTrue(tasksManagerAddSpy.calledOnce);
            assert.strictEqual(tasksManagerAddSpy.getCall(0).args[0], `${addresses.INET_HOST1}_${ipVersion}`);
            assert.instanceOf(tasksManagerAddSpy.getCall(0).args[1], ResolveTask);

            assert.isTrue(tasksManagerDoneSpy.calledOnce);
            assert.isTrue(tasksManagerDoneSpy.calledWithExactly(`${addresses.INET_HOST1}_${ipVersion}`));

            assert.isTrue(taskAddResolvedCallbackSpy.calledTwice);
            assert.isTrue(taskRunSpy.calledOnce);

            addressCacheFindSpy.restore();
            addressCacheSetSpy.restore();

            tasksManagerFindSpy.restore();
            tasksManagerAddSpy.restore();
            tasksManagerDoneSpy.restore();

            taskAddResolvedCallbackSpy.restore();
            taskRunSpy.restore();

            done();
        });
    });
});
