'use strict';

const Lookup = require('./src/Lookup');

const _lookup = new Lookup();

const lookup = _lookup.run.bind(_lookup);

module.exports = {
    lookup
};
