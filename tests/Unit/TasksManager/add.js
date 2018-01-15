'use strict';

const {assert} = require('chai');

const TasksManager = require('../../../src/TasksManager');
const addresses    = require('../../addresses');

describe('Unit: TasksManager::add', () => {
    it('must correct add task for particular hostname key', () => {
        const tasksManager = new TasksManager();
        const task         = {};

        tasksManager.add(addresses.INET_HOST1, task);

        assert.strictEqual(tasksManager._tasks.get(addresses.INET_HOST1), task);
    });
});
