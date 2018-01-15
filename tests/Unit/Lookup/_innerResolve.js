'use strict';

const {EventEmitter} = require('events');

const {assert}   = require('chai');
const proxyquire = require('proxyquire');
const sinon      = require('sinon');

const addresses   = require('../../addresses');

describe('Unit: Lookup::_innerResolve', () => {
    const ipVersions = [4, 6];

    ipVersions.forEach(ipVersion => {
        it(`must correct return cached value for IPv${ipVersion}`, done => {
            const cachedAddress = {};

            const addressCacheFindSpy = sinon.spy(() => cachedAddress);
            const addressCacheSetSpy  = sinon.spy();

            const resolveTaskRunSpy = sinon.spy();

            const tasksManagerFindSpy = sinon.spy();
            const tasksManagerAddSpy  = sinon.spy();
            const tasksManagerDoneSpy = sinon.spy();

            class AddressCache {}
            AddressCache.prototype.find = addressCacheFindSpy;
            AddressCache.prototype.set  = addressCacheSetSpy;

            class ResolveTask {}
            ResolveTask.prototype.run = resolveTaskRunSpy;

            class TasksManager {}
            TasksManager.prototype.find = tasksManagerFindSpy;
            TasksManager.prototype.add  = tasksManagerAddSpy;
            TasksManager.prototype.done = tasksManagerDoneSpy;

            const Lookup = proxyquire('../../../src/Lookup', {
                './AddressCache': AddressCache,
                './TasksManager': TasksManager,
                './ResolveTask':  ResolveTask
            });

            const callbackSpy = sinon.spy();

            const lookup = new Lookup();

            lookup._innerResolve(addresses.INET_HOST1, ipVersion, callbackSpy);

            setImmediate(() => {
                assert.isTrue(addressCacheFindSpy.calledOnce);
                assert.isTrue(addressCacheFindSpy.calledWithExactly(`${addresses.INET_HOST1}_${ipVersion}`));
                assert.isTrue(addressCacheSetSpy.notCalled);

                assert.isTrue(resolveTaskRunSpy.notCalled);

                assert.isTrue(tasksManagerFindSpy.notCalled);
                assert.isTrue(tasksManagerAddSpy.notCalled);
                assert.isTrue(tasksManagerDoneSpy.notCalled);

                assert.isTrue(callbackSpy.calledOnce);
                assert.isTrue(callbackSpy.calledWithExactly(null, cachedAddress));

                done();
            });
        });
    });

    ipVersions.forEach(ipVersion => {
        it(`must correct add callback for the found task for IPv${ipVersion}`, done => {
            const resolveTaskRunSpy          = sinon.spy();
            const taskAddResolvedCallbackSpy = sinon.spy();

            class ResolveTask {}
            ResolveTask.prototype.run                 = resolveTaskRunSpy;
            ResolveTask.prototype.addResolvedCallback = taskAddResolvedCallbackSpy;

            const addressCacheFindSpy = sinon.spy(() => undefined);
            const addressCacheSetSpy  = sinon.spy();

            const tasksManagerFindSpy = sinon.spy(() => new ResolveTask());
            const tasksManagerAddSpy  = sinon.spy();
            const tasksManagerDoneSpy = sinon.spy();

            class AddressCache {}
            AddressCache.prototype.find = addressCacheFindSpy;
            AddressCache.prototype.set  = addressCacheSetSpy;

            class TasksManager {}
            TasksManager.prototype.find = tasksManagerFindSpy;
            TasksManager.prototype.add  = tasksManagerAddSpy;
            TasksManager.prototype.done = tasksManagerDoneSpy;

            const Lookup = proxyquire('../../../src/Lookup', {
                './AddressCache': AddressCache,
                './TasksManager': TasksManager,
                './ResolveTask':  ResolveTask
            });

            const callbackSpy = sinon.spy();

            const lookup = new Lookup();

            lookup._innerResolve(addresses.INET_HOST1, ipVersion, callbackSpy);

            setImmediate(() => {
                assert.isTrue(addressCacheFindSpy.calledOnce);
                assert.isTrue(addressCacheFindSpy.calledWithExactly(`${addresses.INET_HOST1}_${ipVersion}`));

                assert.isTrue(tasksManagerFindSpy.calledOnce);
                assert.isTrue(tasksManagerFindSpy.calledWithExactly(`${addresses.INET_HOST1}_${ipVersion}`));
                assert.isTrue(tasksManagerAddSpy.notCalled);
                assert.isTrue(tasksManagerDoneSpy.notCalled);

                assert.isTrue(resolveTaskRunSpy.notCalled);

                assert.isTrue(taskAddResolvedCallbackSpy.calledOnce);
                assert.isTrue(taskAddResolvedCallbackSpy.calledWithExactly(callbackSpy));

                assert.isTrue(callbackSpy.notCalled);

                done();
            });
        });
    });

    ipVersions.forEach(ipVersion => {
        it(`must correct create task, add callback to it, run for IPv${ipVersion} and correct handle events`, done => {
            const expectedAddresses          = Symbol();
            const resolveTaskRunSpy          = sinon.spy();
            const taskAddResolvedCallbackSpy = sinon.spy();

            const task = new EventEmitter();

            task.run                 = resolveTaskRunSpy;
            task.addResolvedCallback = taskAddResolvedCallbackSpy;

            const resolveTaskOnSpy = sinon.spy(task, 'on');

            class ResolveTask {
                constructor() {
                    return task;
                }
            }

            const addressCacheFindSpy = sinon.spy(() => undefined);
            const addressCacheSetSpy  = sinon.spy();

            const tasksManagerFindSpy = sinon.spy(() => undefined);
            const tasksManagerAddSpy  = sinon.spy();
            const tasksManagerDoneSpy = sinon.spy();

            class AddressCache {}
            AddressCache.prototype.find = addressCacheFindSpy;
            AddressCache.prototype.set  = addressCacheSetSpy;

            class TasksManager {}
            TasksManager.prototype.find = tasksManagerFindSpy;
            TasksManager.prototype.add  = tasksManagerAddSpy;
            TasksManager.prototype.done = tasksManagerDoneSpy;

            const Lookup = proxyquire('../../../src/Lookup', {
                './AddressCache': AddressCache,
                './TasksManager': TasksManager,
                './ResolveTask':  ResolveTask
            });

            const callbackSpy = sinon.spy();

            const lookup = new Lookup();

            lookup._innerResolve(addresses.INET_HOST1, ipVersion, callbackSpy);

            setImmediate(() => {
                task.emit('addresses', expectedAddresses);
                task.emit('done');
            });

            setImmediate(() => {
                assert.isTrue(addressCacheFindSpy.calledOnce);
                assert.isTrue(addressCacheFindSpy.calledWithExactly(`${addresses.INET_HOST1}_${ipVersion}`));

                assert.isTrue(addressCacheSetSpy.calledOnce);
                assert.strictEqual(addressCacheSetSpy.getCall(0).args[0], `${addresses.INET_HOST1}_${ipVersion}`);
                assert.strictEqual(addressCacheSetSpy.getCall(0).args[1], expectedAddresses);

                assert.isTrue(tasksManagerFindSpy.calledOnce);
                assert.isTrue(tasksManagerFindSpy.calledWithExactly(`${addresses.INET_HOST1}_${ipVersion}`));

                assert.isTrue(tasksManagerAddSpy.calledOnce);
                assert.strictEqual(tasksManagerAddSpy.getCall(0).args[0], `${addresses.INET_HOST1}_${ipVersion}`);
                assert.strictEqual(tasksManagerAddSpy.getCall(0).args[1], task);

                assert.isTrue(tasksManagerDoneSpy.calledOnce);
                assert.isTrue(tasksManagerDoneSpy.calledWithExactly(`${addresses.INET_HOST1}_${ipVersion}`));

                assert.isTrue(resolveTaskRunSpy.calledOnce);
                assert.isTrue(resolveTaskRunSpy.calledWithExactly());

                assert.isTrue(taskAddResolvedCallbackSpy.calledOnce);
                assert.isTrue(taskAddResolvedCallbackSpy.calledWithExactly(callbackSpy));

                assert.isTrue(callbackSpy.notCalled);

                assert.isTrue(resolveTaskOnSpy.calledTwice);

                assert.strictEqual(resolveTaskOnSpy.getCall(0).args[0], 'addresses');
                assert.instanceOf(resolveTaskOnSpy.getCall(0).args[1], Function);

                assert.strictEqual(resolveTaskOnSpy.getCall(1).args[0], 'done');
                assert.instanceOf(resolveTaskOnSpy.getCall(1).args[1], Function);

                done();
            });
        });
    });
});
