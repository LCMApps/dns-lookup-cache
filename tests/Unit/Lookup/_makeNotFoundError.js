'use strict';

const dns = require('dns');

const {assert} = require('chai');

const Lookup    = require('../../../src/Lookup');
const addresses = require('../../addresses');

describe('Unit: Lookup::_makeNotFoundError', () => {
    let lookup;

    beforeEach(() => {
        lookup = new Lookup();
    });

    it('must correct create error object with syscall', () => {
        const expectedSysCall = 'queryA';

        const error = lookup._makeNotFoundError(addresses.INET_HOST1, expectedSysCall);

        assert.instanceOf(error, Error);
        assert.strictEqual(error.message, `${expectedSysCall} ${dns.NOTFOUND} ${addresses.INET_HOST1}`);
        assert.strictEqual(error.hostname, addresses.INET_HOST1);
        assert.strictEqual(error.code, dns.NOTFOUND);
        assert.strictEqual(error.errno, dns.NOTFOUND);
        assert.strictEqual(error.syscall, expectedSysCall);
    });

    it('must correct create error object without syscall', () => {
        const error = lookup._makeNotFoundError(addresses.INET_HOST1);

        assert.instanceOf(error, Error);
        assert.strictEqual(error.message, `${dns.NOTFOUND} ${addresses.INET_HOST1}`);
        assert.strictEqual(error.hostname, addresses.INET_HOST1);
        assert.strictEqual(error.code, dns.NOTFOUND);
        assert.strictEqual(error.errno, dns.NOTFOUND);
        assert.notProperty(error, 'syscall');
    });
});
