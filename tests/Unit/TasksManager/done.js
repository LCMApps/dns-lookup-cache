'use strict';

const {assert}         = require('chai');

const TasksManager = require('../../../src/TasksManager');
const addresses    = require('../../addresses');

describe('Unit: TasksManager::done', () => {
    it('must correct done task for particular hostname key', () => {
        const tasksManager = new TasksManager();
        const task         = {};

        tasksManager._tasks.set(addresses.INET_HOST1, task);

        tasksManager.done(addresses.INET_HOST1);

        assert.isUndefined(tasksManager._tasks.get(addresses.INET_HOST1));
    });
});
