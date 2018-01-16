'use strict';

const {assert} = require('chai');

const TasksManager = require('../../../src/TasksManager');
const addresses    = require('../../addresses');

describe('Unit: TasksManager::find', () => {
    let tasksManager;

    beforeEach(() => {
        tasksManager = new TasksManager();
    });

    it('must return undefined, cuz there is no task for such key', () => {
        const task = tasksManager.find(addresses.INET_HOST1);

        assert.isUndefined(task);
    });

    it('must return task for particular key', () => {
        const task = {};

        tasksManager._tasks.set(addresses.INET_HOST1, task);

        assert.strictEqual(tasksManager.find(addresses.INET_HOST1), task);

    });
});
