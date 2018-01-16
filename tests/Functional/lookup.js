'use strict';

const dns = require('dns');
const net = require('net');

const { assert } = require('chai');

const { lookup } = require('../../');

const addresses = require('../addresses');

describe("must correct process 'hostname' param", () => {
    const invalidData = [true, 1, [], {}, () => {}, Buffer.alloc(0)];

    invalidData.forEach(invalidHostname => {
        it(`must throw an exception, cuz 'hostname' param has type ${Object.prototype.toString.call(
            invalidHostname
        )}`, () => {
            assert.throws(
                () => {
                    lookup(invalidHostname, {}, () => {});
                },
                Error,
                'hostname must be a string'
            );
        });
    });

    it('must throw an error, cuz `hostname` param has invalid value', done => {
        lookup(addresses.INVALID_HOST, error => {
            assert.instanceOf(error, Error);
            assert.strictEqual(error.code, dns.NOTFOUND);
            assert.strictEqual(error.hostname, addresses.INVALID_HOST);
            assert.match(
                error.message,
                new RegExp(`${dns.NOTFOUND} ${addresses.INVALID_HOST}`)
            );

            done();
        });
    });

    it('must work just fine for correct hostname param', done => {
        const expectedIpFamily = 4;

        lookup(
            addresses.INET_HOST1,
            expectedIpFamily,
            (error, address, family) => {
                assert.ifError(error);
                assert.isTrue(net.isIPv4(address));
                assert.strictEqual(family, expectedIpFamily);

                done();
            }
        );
    });

    const falsyValues = [false, null, undefined, 0, NaN, ''];

    const optionsValues = [
        {
            options: {},
            expectedError: null,
            expectedAddress: null,
            expectedFamily: 4
        },
        {
            options: { all: false },
            expectedError: null,
            expectedAddress: null,
            expectedFamily: 4
        },
        {
            options: { all: false, family: 6 },
            expectedError: null,
            expectedAddress: null,
            expectedFamily: 6
        },
        {
            options: { all: true },
            expectedError: null,
            expectedAddress: [],
            expectedFamily: undefined
        },
        {
            options: { all: true, family: 6 },
            expectedError: null,
            expectedAddress: [],
            expectedFamily: undefined
        }
    ];

    falsyValues.forEach(hostname => {
        optionsValues.forEach(optionsValue => {
            const options = optionsValue.options;

            it(`must return correct value for hostname === ${hostname}, and options === ${JSON.stringify(
                options
            )}`, done => {
                lookup(hostname, options, (error, address, family) => {
                    assert.strictEqual(error, optionsValue.expectedError);
                    assert.deepEqual(address, optionsValue.expectedAddress);
                    assert.strictEqual(family, optionsValue.expectedFamily);

                    done();
                });
            });
        });
    });
});

describe('must correct process `options` param', () => {
    const invalidOptions = [undefined, null, false, '1', [], Buffer.alloc(0)];

    invalidOptions.forEach(invalidOption => {
        it(`must throw an exception if 'options' param has type ${Object.prototype.toString.call(
            invalidOption
        )}`, () => {
            assert.throws(
                () => {
                    lookup(addresses.INET_HOST1, invalidOption, () => {});
                },
                Error,
                'options must be an object or an ip version number'
            );
        });
    });

    const validFamilyNumbers = [4, 6];

    validFamilyNumbers.forEach(ipFamily => {
        it(`must correct call lookup method if 'options' param has value - ${ipFamily}`, () => {
            lookup(addresses.INET_HOST1, ipFamily, (error, address, family) => {
                assert.ifError(error);

                ipFamily === 4 && assert.isTrue(net.isIPv4(address));
                ipFamily === 6 && assert.isTrue(net.isIPv6(address));

                assert.strictEqual(family, ipFamily);
            });
        });
    });

    const invalidFamilyNumbers = [-1, 0, 3, 5, 7];

    invalidFamilyNumbers.forEach(invalidIpFamily => {
        it(`must correct call lookup method if 'options' param has invalid value - ${invalidIpFamily}`, () => {
            assert.throws(() => {
                lookup(addresses.INET_HOST1, invalidIpFamily, () => {});
            }, Error, 'invalid family number, must be one of the {4, 6} or undefined');
        });
    });

    it('must correct call lookup method if `options` param is omitted', done => {
        const expectedError = null;
        const expectedAddress = null;
        const expectedIpFamily = 4;

        lookup(null, (error, address, family) => {
            assert.strictEqual(error, expectedError);
            assert.deepEqual(address, expectedAddress);
            assert.strictEqual(family, expectedIpFamily);

            done();
        });
    });
});

describe('must correct process `callback` param', () => {
    const hostname = null;
    const options = {};
    const invalidCallbacks = [
        undefined,
        null,
        false,
        '1',
        [],
        {},
        Buffer.alloc(0)
    ];

    invalidCallbacks.forEach(invalidCallback => {
        it(`must throw an error if callback param has type ${Object.prototype.toString.call(
            invalidCallback
        )}`, () => {
            assert.throws(
                () => {
                    lookup(hostname, options, invalidCallback);
                },
                Error,
                'callback param must be a function'
            );
        });
    });

    const expectedError = null;
    const expectedAddress = null;
    const expectedFamily = 4;

    it('must okay process, cuz callback param is a function', done => {
        lookup(hostname, options, (error, address, family) => {
            assert.strictEqual(error, expectedError);
            assert.strictEqual(address, expectedAddress);
            assert.strictEqual(family, expectedFamily);

            done();
        });
    });
});

describe('must correct lookup for all IPv4 and IPv6 addresses', () => {
    const testCases = [
        {
            title: 'must correct lookup all IPv4 addresses',
            family: 4,
            expectedAddressIps: [net.isIPv4],
            expectedIpFamilies: [4]
        },
        {
            title: 'must correct lookup all IPv6 addresses',
            family: 6,
            expectedAddressIps: [net.isIPv6],
            expectedIpFamilies: [6]
        },
        {
            title: 'must correct lookup all IPv4 and IPv6 addresses',
            family: undefined,
            expectedAddressIps: [net.isIPv4, net.isIPv6],
            expectedIpFamilies: [4, 6]
        }
    ];

    testCases.forEach(testCase => {
        it(testCase.title, done => {
            lookup(
                addresses.INET_HOST1,
                { all: true, family: testCase.family },
                (err, ips) => {
                    assert.ifError(err);

                    assert.isTrue(Array.isArray(ips));

                    assert.isTrue(
                        ips.every(ip => {
                            return (
                                testCase.expectedAddressIps.some(func => func(ip.address)) &&
                                testCase.expectedIpFamilies.includes(ip.family)
                            );
                        })
                    );

                    done();
                }
            );
        });
    });
});

describe('must correct lookup for one IPv4/IPv6 address', () => {
    const testCases = [
        {
            title: 'must correct lookup IPv4 address',
            family: 4,
            expectedAddressIp: net.isIPv4,
            expectedIpFamily: 4
        },
        {
            title: 'must correct lookup IPv6 address',
            family: 6,
            expectedAddressIp: net.isIPv6,
            expectedIpFamily: 6
        }
    ];

    testCases.forEach(testCase => {
        it(testCase.title, done => {
            lookup(
                addresses.INET_HOST1,
                { family: testCase.family },
                (err, address, family) => {
                    assert.ifError(err);

                    assert.isTrue(testCase.expectedAddressIp(address));
                    assert.strictEqual(testCase.expectedIpFamily, family);

                    done();
                }
            );
        });
    });
});
