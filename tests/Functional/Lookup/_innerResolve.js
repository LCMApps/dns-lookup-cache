'use strict';

const dns      = require('dns');
const sinon    = require('sinon');
const {assert} = require('chai');

const Lookup      = require('../../../src/Lookup');
const ResolveTask = require('../../../src/ResolveTask');
const addresses   = require('../../addresses');

describe('Func: Lookup::_innerResolve', () => {
    it('must has correct behavior for parallel requests with for different hosts', () => {
        const ipVersion = 4;

        const lookup = new Lookup();

        const addressCacheFindSpy = sinon.spy(lookup._addressCache, 'find');
        const addressCacheSetSpy  = sinon.spy(lookup._addressCache, 'set');

        const tasksManagerFindSpy = sinon.spy(lookup._tasksManager, 'find');
        const tasksManagerAddSpy  = sinon.spy(lookup._tasksManager, 'add');
        const tasksManagerDoneSpy = sinon.spy(lookup._tasksManager, 'done');

        const taskRunSpy = sinon.spy(ResolveTask.prototype, 'run');

        return Promise.all([
            lookup._innerResolve(addresses.INET_HOST1, ipVersion),
            lookup._innerResolve(addresses.INET_HOST2, ipVersion)
        ]).then(results => {
            assert.notDeepEqual(results[0], results[1]);

            assert.isTrue(addressCacheFindSpy.calledTwice);

            assert.isTrue(addressCacheSetSpy.calledTwice);

            assert.isTrue(tasksManagerFindSpy.calledTwice);

            assert.isTrue(tasksManagerAddSpy.calledTwice);

            assert.isTrue(tasksManagerDoneSpy.calledTwice);

            assert.isTrue(taskRunSpy.calledTwice);

            addressCacheFindSpy.restore();
            addressCacheSetSpy.restore();

            tasksManagerFindSpy.restore();
            tasksManagerAddSpy.restore();
            tasksManagerDoneSpy.restore();

            taskRunSpy.restore();
        });
    });

    it('must has correct behavior for parallel requests with the same hostname', () => {
        const ipVersion = 4;

        const lookup = new Lookup();

        const addressCacheFindSpy = sinon.spy(lookup._addressCache, 'find');
        const addressCacheSetSpy  = sinon.spy(lookup._addressCache, 'set');

        const tasksManagerFindSpy = sinon.spy(lookup._tasksManager, 'find');
        const tasksManagerAddSpy  = sinon.spy(lookup._tasksManager, 'add');
        const tasksManagerDoneSpy = sinon.spy(lookup._tasksManager, 'done');

        const taskRunSpy = sinon.spy(ResolveTask.prototype, 'run');

        return Promise.all([
            lookup._innerResolve(addresses.INET_HOST1, ipVersion),
            lookup._innerResolve(addresses.INET_HOST1, ipVersion)
        ]).then(results => {
            assert.deepEqual(results[0], results[1]);

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

            assert.isTrue(taskRunSpy.calledOnce);

            addressCacheFindSpy.restore();
            addressCacheSetSpy.restore();

            tasksManagerFindSpy.restore();
            tasksManagerAddSpy.restore();
            tasksManagerDoneSpy.restore();

            taskRunSpy.restore();
        });
    });

    it('must has correct behavior on resolving error for parallel requests with the same hostname', () => {
        const ipVersion = 4;

        const lookup = new Lookup();

        const addressCacheFindSpy = sinon.spy(lookup._addressCache, 'find');
        const addressCacheSetSpy  = sinon.spy(lookup._addressCache, 'set');

        const tasksManagerFindSpy = sinon.spy(lookup._tasksManager, 'find');
        const tasksManagerAddSpy  = sinon.spy(lookup._tasksManager, 'add');
        const tasksManagerDoneSpy = sinon.spy(lookup._tasksManager, 'done');

        const taskRunSpy = sinon.spy(ResolveTask.prototype, 'run');

        let resolveErrorCount = 0;

        const firstRequestResult = lookup._innerResolve(addresses.INVALID_HOST, ipVersion)
            .catch(err => {
                assert.isPrototypeOf(err, Error);
                assert.oneOf(err.code, [dns.NOTFOUND, dns.SERVFAIL]);
                resolveErrorCount++;
            });

        const secondRequestResult = lookup._innerResolve(addresses.INVALID_HOST, ipVersion)
            .catch(err => {
                assert.isPrototypeOf(err, Error);
                assert.oneOf(err.code, [dns.NOTFOUND, dns.SERVFAIL]);
                resolveErrorCount++;
            });

        return Promise.all([firstRequestResult, secondRequestResult])
            .then(() => {
                assert.strictEqual(resolveErrorCount, 2);

                assert.isTrue(addressCacheFindSpy.calledTwice);
                assert.isTrue(addressCacheFindSpy.calledWithExactly(`${addresses.INVALID_HOST}_${ipVersion}`));

                assert.isTrue(addressCacheSetSpy.notCalled);

                assert.isTrue(tasksManagerFindSpy.calledTwice);
                assert.isTrue(tasksManagerFindSpy.calledWithExactly(`${addresses.INVALID_HOST}_${ipVersion}`));

                assert.isTrue(tasksManagerAddSpy.calledOnce);
                assert.strictEqual(tasksManagerAddSpy.getCall(0).args[0], `${addresses.INVALID_HOST}_${ipVersion}`);
                assert.instanceOf(tasksManagerAddSpy.getCall(0).args[1], ResolveTask);

                assert.isTrue(tasksManagerDoneSpy.calledOnce);
                assert.isTrue(tasksManagerDoneSpy.calledWithExactly(`${addresses.INVALID_HOST}_${ipVersion}`));

                assert.isTrue(taskRunSpy.calledOnce);

                addressCacheFindSpy.restore();
                addressCacheSetSpy.restore();

                tasksManagerFindSpy.restore();
                tasksManagerAddSpy.restore();
                tasksManagerDoneSpy.restore();

                taskRunSpy.restore();
            });
    });
});
