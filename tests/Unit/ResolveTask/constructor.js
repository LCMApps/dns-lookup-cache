'use strict';

const dns = require('dns');

const {assert} = require('chai');

const ResolveTask = require('../../../src/ResolveTask');
const addresses   = require('../../addresses');

describe('Unit: ResolveTask::constructor', () => {
    const hostname   = addresses.INET_HOST1;
    const ipVersions = [4, 6];

    ipVersions.forEach(ipVersion => {
        it(`must correct create resolve task for ipVersion === ${ipVersion}`, () => {
            const task = new ResolveTask(hostname, ipVersion);

            assert.strictEqual(task._hostname, hostname);
            assert.strictEqual(task._ipVersion, ipVersion);

            ipVersion === 4 && assert.strictEqual(task._resolver, dns.resolve4);
            ipVersion !== 4 && assert.strictEqual(task._resolver, dns.resolve6);
        });
    });

});
