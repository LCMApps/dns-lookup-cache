'use strict';

const assert = require('assert');

class TasksManager {
    constructor() {
        this._tasks = new Map();
    }

    /**
     * @param {string} key
     * @returns {ResolveTask}
     */
    find(key) {
        return this._tasks.get(key);
    }

    /**
     * @param {string} key
     * @param {ResolveTask} task
     */
    add(key, task) {
        this._tasks.set(key, task);
    }

    /**
     * @param {string} key
     */
    done(key) {
        assert(this._tasks.has(key), 'task cannot be done, cuz it does not exist.');

        this._tasks.delete(key);
    }
}

module.exports = TasksManager;
