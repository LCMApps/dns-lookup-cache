'use strict';

const {AssertionError} = require('assert');
const {assert}         = require('chai');

const TasksManager = require('../../../src/TasksManager');
const addresses    = require('../../addresses');

describe('Unit: TasksManager::done', () => {
    it('must not be able to done task that does not exist', () => {
        const tasksManager = new TasksManager();

        assert.throws(() => {
            tasksManager.done(addresses.INET_HOST1);
        }, AssertionError, 'You cannot done task that does not exit. You have a bug.');
    });

    it('must correct done task for particular hostname key', () => {
        const tasksManager = new TasksManager();
        const task         = {};

        tasksManager._tasks.set(addresses.INET_HOST1, task);

        tasksManager.done(addresses.INET_HOST1);

        assert.isUndefined(tasksManager._tasks.get(addresses.INET_HOST1));
    });
});
