const { isNumber } = require('util');

function numberCompareFunction(lhs, rhs) {
    console.assert(isNumber(lhs));
    console.assert(isNumber(rhs));
    return lhs - rhs;
}

function referencialEquality(lhs, rhs) {
    return lhs === rhs;
}

module.exports = {
    numberCompareFunction,
    referencialEquality,
};