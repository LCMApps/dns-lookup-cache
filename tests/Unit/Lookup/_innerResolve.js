'use strict';

const {EventEmitter} = require('events');

const {assert}   = require('chai');
const proxyquire = require('proxyquire');
const sinon      = require('sinon');

const addresses = require('../../addresses');

describe('Unit: Lookup::_innerResolve', () => {
    const ipVersions = [4, 6];

    ipVersions.forEach(ipVersion => {
        it(`must correct return cached value for IPv${ipVersion}`, () => {
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

            const lookup = new Lookup();

            return lookup._innerResolve(addresses.INET_HOST1, ipVersion)
                .then(result => {
                    assert.deepEqual(result, cachedAddress);

                    assert.isTrue(addressCacheFindSpy.calledOnce);
                    assert.isTrue(addressCacheFindSpy.calledWithExactly(`${addresses.INET_HOST1}_${ipVersion}`));
                    assert.isTrue(addressCacheSetSpy.notCalled);

                    assert.isTrue(resolveTaskRunSpy.notCalled);

                    assert.isTrue(tasksManagerFindSpy.notCalled);
                    assert.isTrue(tasksManagerAddSpy.notCalled);
                    assert.isTrue(tasksManagerDoneSpy.notCalled);
                });
        });
    });

    ipVersions.forEach(ipVersion => {
        it(`must correct create task on first call, and add listeners for the same task on second (IPv${ipVersion})`,
            () => {
                const expectedAddresses = [];
                const resolveTaskRunSpy = sinon.spy();

                const constructorStub = sinon.stub();

                const task = new EventEmitter();
                task.run   = resolveTaskRunSpy;

                const resolveTaskOnSpy   = sinon.spy(task, 'on');
                const resolveTaskOnceSpy = sinon.spy(task, 'once');

                const addressCacheFindSpy = sinon.spy(() => undefined);
                const addressCacheSetSpy  = sinon.spy();

                const tasksManagerFindSpy = sinon.stub();
                tasksManagerFindSpy.onFirstCall().callsFake(() => undefined);
                tasksManagerFindSpy.onSecondCall().callsFake(() => task);

                const tasksManagerAddSpy  = sinon.spy();
                const tasksManagerDoneSpy = sinon.spy();

                class AddressCache {}
                AddressCache.prototype.find = addressCacheFindSpy;
                AddressCache.prototype.set  = addressCacheSetSpy;

                class ResolveTask {
                    constructor(hostname, ipVersion) {
                        constructorStub(hostname, ipVersion);

                        return task;
                    }
                }

                class TasksManager {}
                TasksManager.prototype.find = tasksManagerFindSpy;
                TasksManager.prototype.add  = tasksManagerAddSpy;
                TasksManager.prototype.done = tasksManagerDoneSpy;

                const Lookup = proxyquire('../../../src/Lookup', {
                    './AddressCache': AddressCache,
                    './TasksManager': TasksManager,
                    './ResolveTask':  ResolveTask
                });

                const lookup = new Lookup();

                setImmediate(() => {
                    task.emit('addresses', expectedAddresses);
                });

                return Promise.all([
                    lookup._innerResolve(addresses.INET_HOST1, ipVersion),
                    lookup._innerResolve(addresses.INET_HOST1, ipVersion)
                ]).then(results => {
                    assert.deepEqual(results, [expectedAddresses, expectedAddresses]);

                    assert.isTrue(addressCacheFindSpy.calledTwice);
                    assert.isTrue(addressCacheFindSpy.calledWithExactly(`${addresses.INET_HOST1}_${ipVersion}`));

                    assert.isTrue(addressCacheSetSpy.calledOnce);

                    assert.isTrue(constructorStub.calledOnce);
                    assert.isTrue(constructorStub.calledWithExactly(addresses.INET_HOST1, ipVersion));

                    assert.isTrue(resolveTaskRunSpy.calledOnce);

                    assert.strictEqual(resolveTaskOnSpy.callCount, 6);
                    assert.strictEqual(resolveTaskOnceSpy.callCount, 1);

                    assert.strictEqual(resolveTaskOnSpy.getCall(0).args[0], 'addresses');
                    assert.instanceOf(resolveTaskOnSpy.getCall(0).args[1], Function);

                    assert.strictEqual(resolveTaskOnSpy.getCall(1).args[0], 'error');
                    assert.instanceOf(resolveTaskOnSpy.getCall(1).args[1], Function);

                    assert.strictEqual(resolveTaskOnSpy.getCall(2).args[0], 'error');
                    assert.instanceOf(resolveTaskOnSpy.getCall(2).args[1], Function);

                    assert.strictEqual(resolveTaskOnSpy.getCall(3).args[0], 'addresses');
                    assert.instanceOf(resolveTaskOnSpy.getCall(3).args[1], Function);

                    assert.strictEqual(resolveTaskOnSpy.getCall(4).args[0], 'error');
                    assert.instanceOf(resolveTaskOnSpy.getCall(4).args[1], Function);

                    assert.strictEqual(resolveTaskOnSpy.getCall(5).args[0], 'addresses');
                    assert.instanceOf(resolveTaskOnSpy.getCall(5).args[1], Function);

                    assert.strictEqual(resolveTaskOnceSpy.getCall(0).args[0], 'error');
                    assert.instanceOf(resolveTaskOnceSpy.getCall(0).args[1], Function);

                    assert.isTrue(tasksManagerFindSpy.calledTwice);
                    assert.isTrue(tasksManagerAddSpy.calledOnce);
                    assert.isTrue(tasksManagerDoneSpy.calledOnce);
                });
            });
    });

    ipVersions.forEach(ipVersion => {
        it(`must correct create task, add to task manager, run for IPv${ipVersion} and correct handle address event`,
            () => {
                const expectedAddresses          = Symbol();
                const resolveTaskRunSpy          = sinon.spy();

                const task = new EventEmitter();

                task.run                 = resolveTaskRunSpy;

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

                const lookup = new Lookup();

                setImmediate(() => {
                    task.emit('addresses', expectedAddresses);
                });

                return lookup._innerResolve(addresses.INET_HOST1, ipVersion)
                    .then(result => {
                        assert.deepEqual(result, expectedAddresses);

                        assert.isTrue(addressCacheFindSpy.calledOnce);
                        assert.isTrue(
                            addressCacheFindSpy.calledWithExactly(`${addresses.INET_HOST1}_${ipVersion}`)
                        );

                        assert.isTrue(addressCacheSetSpy.calledOnce);
                        assert.strictEqual(
                            addressCacheSetSpy.getCall(0).args[0],
                            `${addresses.INET_HOST1}_${ipVersion}`
                        );
                        assert.strictEqual(addressCacheSetSpy.getCall(0).args[1], expectedAddresses);

                        assert.isTrue(tasksManagerFindSpy.calledOnce);
                        assert.isTrue(tasksManagerFindSpy.calledWithExactly(`${addresses.INET_HOST1}_${ipVersion}`));

                        assert.isTrue(tasksManagerAddSpy.calledOnce);
                        assert.strictEqual(
                            tasksManagerAddSpy.getCall(0).args[0],
                            `${addresses.INET_HOST1}_${ipVersion}`
                        );
                        assert.strictEqual(tasksManagerAddSpy.getCall(0).args[1], task);

                        assert.isTrue(tasksManagerDoneSpy.calledOnce);
                        assert.isTrue(
                            tasksManagerDoneSpy.calledWithExactly(`${addresses.INET_HOST1}_${ipVersion}`)
                        );

                        assert.isTrue(resolveTaskRunSpy.calledOnce);
                        assert.isTrue(resolveTaskRunSpy.calledWithExactly());

                        assert.strictEqual(resolveTaskOnSpy.callCount, 4);

                        assert.strictEqual(resolveTaskOnSpy.getCall(0).args[0], 'addresses');
                        assert.instanceOf(resolveTaskOnSpy.getCall(0).args[1], Function);

                        assert.strictEqual(resolveTaskOnSpy.getCall(1).args[0], 'error');
                        assert.instanceOf(resolveTaskOnSpy.getCall(1).args[1], Function);

                        assert.strictEqual(resolveTaskOnSpy.getCall(2).args[0], 'error');
                        assert.instanceOf(resolveTaskOnSpy.getCall(2).args[1], Function);

                        assert.strictEqual(resolveTaskOnSpy.getCall(3).args[0], 'addresses');
                        assert.instanceOf(resolveTaskOnSpy.getCall(3).args[1], Function);
                    });
            });

        it(`must correct create task, add to task manager, run for IPv${ipVersion} and correct handle error event`,
            done => {
                const expectedError              = new Error('error');
                const resolveTaskRunSpy          = sinon.spy();

                const task = new EventEmitter();

                task.run                 = resolveTaskRunSpy;

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

                const lookup = new Lookup();

                setImmediate(() => {
                    task.emit('error', expectedError);
                });

                lookup._innerResolve(addresses.INET_HOST1, ipVersion)
                    .catch(error => {
                        assert.instanceOf(error, Error);
                        assert.strictEqual(error.message, expectedError.message);

                        assert.isTrue(addressCacheFindSpy.calledOnce);
                        assert.isTrue(addressCacheFindSpy.calledWithExactly(`${addresses.INET_HOST1}_${ipVersion}`));

                        assert.isTrue(addressCacheSetSpy.notCalled);

                        assert.isTrue(tasksManagerFindSpy.calledOnce);
                        assert.isTrue(tasksManagerFindSpy.calledWithExactly(`${addresses.INET_HOST1}_${ipVersion}`));

                        assert.isTrue(tasksManagerAddSpy.calledOnce);
                        assert.strictEqual(
                            tasksManagerAddSpy.getCall(0).args[0], `${addresses.INET_HOST1}_${ipVersion}`
                        );
                        assert.strictEqual(tasksManagerAddSpy.getCall(0).args[1], task);

                        assert.isTrue(tasksManagerDoneSpy.calledOnce);
                        assert.isTrue(tasksManagerDoneSpy.calledWithExactly(`${addresses.INET_HOST1}_${ipVersion}`));

                        assert.isTrue(resolveTaskRunSpy.calledOnce);
                        assert.isTrue(resolveTaskRunSpy.calledWithExactly());

                        assert.strictEqual(resolveTaskOnSpy.callCount, 4);

                        assert.strictEqual(resolveTaskOnSpy.getCall(0).args[0], 'addresses');
                        assert.instanceOf(resolveTaskOnSpy.getCall(0).args[1], Function);

                        assert.strictEqual(resolveTaskOnSpy.getCall(1).args[0], 'error');
                        assert.instanceOf(resolveTaskOnSpy.getCall(1).args[1], Function);

                        assert.strictEqual(resolveTaskOnSpy.getCall(2).args[0], 'error');
                        assert.instanceOf(resolveTaskOnSpy.getCall(2).args[1], Function);

                        assert.strictEqual(resolveTaskOnSpy.getCall(3).args[0], 'addresses');
                        assert.instanceOf(resolveTaskOnSpy.getCall(3).args[1], Function);

                        done();
                    });
            });
    });
});
