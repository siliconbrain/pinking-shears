const { isFunction } = require('util');

function contains(array, value, equal = undefined) {
    return indexOf(array, value, equal) >= 0;
}

function indexOf(array, value, equal = undefined) {
    return isFunction(equal) ? array.findIndex(v => equal(v, value)) : array.indexOf(value);
}

function omits(array, value, equal = undefined) {
    return indexOf(array, value, equal) < 0;
}

function pairs(array) {
    return I.makeIterable(function*() {
        for (const i of I.range(0, array.length)) {
            for (const j of I.range(i+1, array.length)) {
                yield [array[i], array[j]];
            }
        }
    });
}

module.exports = {
    contains,
    indexOf,
    omits,
    pairs,
};