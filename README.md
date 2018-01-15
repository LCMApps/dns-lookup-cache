
# lookup-dns-cache - DNS cache to replace NodeJS `dns.lookup` standard method

## Super simple to use

```js
const request = require('request');
const {lookup} = require('lookup-dns-cache');

// With "request" module

request({
    url: 'http://google.com',
    method: 'GET',
    lookup: lookup
}, (error, response, body) => {
    // ...
});

// Direct usage

lookup('google.com', {}, (error, address, family) => {
    // ...
});
```

## Table of contents

- [Motivation](#motivation)
- [How to use](#howtouse)
- [Inner implementation](#implementation)
- [Examples](#examples)

---

## Motivation

The main idea behind this package is eliminate NodeJS event loop usage when you do network request.
See [NodeJS DNS implementation](https://nodejs.org/api/dns.html#dns_implementation_considerations) to understand the problem with `dns.lookup`.


[back to top](#table-of-contents)

---

## How to use

This module supports almost the same params as `dns.lookup` does. Concretely, you can pass `options` object as a second param, and
set:
- `family` to `4` or `6`
- `all` flag to `true`/`false` if you want/don't want get all IP addresses at once.

Because this implementation does not use `getaddrinfo` method, the `hints` param is not supported.

The `verbatim` param is not supported for now. If you will not specify any family you will get IPv4 addresses first and IPv6 addresses second.
 
The `callback` function works the same way as a standard method.

The `error` object would have all fields the standard implementation's error object has.

NodeJS `dns.lookup`:
```javascript
> const dns = require('dns');
> dns.lookup('host-doesnot-support-ipv6', {family: 6}, console.log)

> { Error: getaddrinfo ENOTFOUND vss-cc-ha.hwtool.net
    at errnoException (dns.js:55:10)
    at GetAddrInfoReqWrap.onlookup [as oncomplete] (dns.js:97:26)
  code: 'ENOTFOUND',
  errno: 'ENOTFOUND',
  syscall: 'getaddrinfo',
  hostname: 'vss-cc-ha.hwtool.net' }

```

`lookup-dns-cache`
```javascript
> const {lookup} = require('lookup-dns-cache');
> lookup('host-doesnot-support-ipv6', {family: 6}, console.log)

> { Error: queryAaaa ENOTFOUND vss-cc-ha.hwtool.net
      at makeNotFoundError (/path/lookup-dns-cache/src/Lookup.js:182:19)
      at ipv6AddressesTable.resolve (/path/lookup-dns-cache/src/Lookup.js:147:37)
      at Immediate.setImmediate [as _onImmediate] (/path/lookup-dns-cache/src/IpAddressesTable.js:70:48)
      at runCallback (timers.js:773:18)
      at tryOnImmediate (timers.js:734:5)
      at processImmediate [as _immediateCallback] (timers.js:711:5)
    hostname: 'vss-cc-ha.hwtool.net',
    syscall: 'queryAaaa',
    code: 'ENOTFOUND',
    errno: 'ENOTFOUND' }
```

If you are looking for `IPv4` addresses only, explicitly specify param `{family: 4}`. In that case, you will avoid 
spending time on useless searching for `IPv6`. Apply the same technique if you are looking for `IPv6` addresses only. 

Under the hood, `lookup` method has Round-robin algorithm. It means that if particular hostname resolves to several addresses
it will return new address every time you call that function. For example:
```javascript
// hostname: example.com
// resolves to: [1.2.3.4, 5.6.7.8, 9.10.11.12]

lookup('example.com', {family: 4}, (error, address, family) => {
   // address === "1.2.3.4"
   // family === 4
});

lookup('example.com', {family: 4}, (error, address, family) => {
   // address === "5.6.7.8"
   // family === 4
});

lookup('example.com', {family: 4}, (error, address, family) => {
   // address === "9.10.11.12"
   // family === 4
});

lookup('example.com', {family: 4}, (error, address, family) => {
   // address === "1.2.3.4"
   // family === 4
});
```

[back to top](#table-of-contents)

---
## Implementation

Under the hood, this package uses `dns.resolve4` and `dns.resolve6` methods with `{ttl: true}` param.
It caches addresses for that particular hostname for DNS TTL time and returns one address if you specified `{all: false}` (default value)
and array of addresses if `{all: true}`.

If you didn't specify family type (`{family: 4}` or `{family: 6}`) the method searches for addresses of `{family: 4}` and `{family: 6}` in parallel.
After that, if you specified `{all: true}` it returns an array in form `[[...IPv4],[...IPv6]]`, in other case it returns `IPv4` or `IPv6` address.
(`IPv4` has more priority).

[back to top](#table-of-contents)

---
## Examples

```javascript
lookup('hostname', {all: true}, (error, results) => {
   // results is an array that contains both IPv4 and IPv6 addresses (Ipv4 first).
   //
   // error - null
   // results - [ 
   //   { address: '1.2.3.4', family: 4 },
   //   { address: '5.6.7.8', family: 4 } 
   // ]
});
```

```javascript
lookup('hostname', {all: false}, (error, address, family) => {
   // address and family of the first resolved IP (IPv4 or IPv6 if supported).
   // error - null
   // address - '1.2.3.4'
   // family - 4
});
```

```javascript
lookup('hostname', {all: false, family: 4}, (error, address, family) => {
   // address and family of the first resolved IP (IPv4 only). 
});
```

```javascript
lookup('hostname', {all: false, family: 6}, (error, address, family) => {
   // address and family of the first resolved IP (IPv6 only).
   // will return an error if IPv6 is not supported. See NodeJS dns.lookup doc.
});
```

[back to top](#table-of-contents)

---
## Similar packages

Yahoo tried to solve this problem in own way https://github.com/yahoo/dnscache.

The big disadvantages if this package are:
- monkey patching dns module
- does not support DNS TTL
- cache just one IP address and use it for every request (no advantage of round-robin if you have dns resolver that returns several addresses)

[back to top](#table-of-contents)
