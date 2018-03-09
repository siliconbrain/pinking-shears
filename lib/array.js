const { referencialEquality } = require('./functional');
const { isFunction } = require('util');

function contains(array, value, equal = undefined) {
    return indexOf(array, value, equal) >= 0;
}

function count(array, predicate = () => true) {
    return array.reduce((cnt, val) => cnt + (predicate(val) ? 1 : 0), 0);
}

function equality(elementEquality = referencialEquality) {
    return (lhs, rhs) => lhs.length === rhs.length && lhs.every((v, i) => elementEquality(v, rhs[i]));
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

function unique(array, equal = undefined) {
    return array.filter((value, index) => indexOf(array, value, equal) === index);
}

module.exports = {
    contains,
    count,
    equality,
    indexOf,
    omits,
    pairs,
    unique,
};