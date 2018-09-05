const lops = require('./operators/lazy');

function _numberCompareFunction(lhs, rhs) { return lhs - rhs; }

const first = (iterable) => {
    for (const val of iterable) return val;
}

const fold = (initial) => (selector) => (iterable) => {
    var result = initial;
    for (const [val, i] of lops.enumerate(iterable)) result = selector(result, val, i, iterable);
    return result;
}

const forEach = (action) => (iterable) => {
    for (const [val, i] of lops.enumerate(iterable)) action(val, i, iterable);
}

const isEmpty = (iterable) => {
    for (const _ of iterable) return false;
    return true;
}

const reduce = (selector) => (iterable) => {
    var result = undefined;
    for (const [val, i] of lops.enumerate(iterable)) result = i === 0 ? val : selector(result, val, i, iterable);
    return result;
}

const max = (compareFunction = _numberCompareFunction) => reduce((res, val) => compareFunction(res, val) < 0 ? val : res);

const min = (compareFunction = _numberCompareFunction) => reduce((res, val) => compareFunction(res, val) > 0 ? val : res);

module.exports = {
    first,
    fold,
    forEach,
    isEmpty,
    lazy: lops,
    max,
    min,
    reduce,
    strict: require('./operators/strict'),
}