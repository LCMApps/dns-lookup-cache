'use strict';

class TasksManager {
    constructor() {
        this._tasks = new Map();
    }

    /**
     * @param {sring} key
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
        this._tasks.delete(key);
    }
}

module.exports = TasksManager;
