'use strict';

const {assert} = require('chai');

const TasksManager = require('../../../src/TasksManager');

describe('Unit: TasksManager::constructor', () => {
    it('must correct create an instance of TasksManager class', () => {
        const tasksManager = new TasksManager();

        assert.instanceOf(tasksManager._tasks, Map);
    });
});
