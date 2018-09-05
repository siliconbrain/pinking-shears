const {fold} = require('./ix/operators');
const {map} = require('./ix/operators/lazy');

const _sum = fold(0)((sum, val) => sum + val);

function differenceOf(lhs, rhs) {
    return Array.from(lhs, (v, i) => v - rhs[i]);
}

function distanceOf(lhs, rhs) {
    return lengthOf(differenceOf(lhs, rhs));
}

function dot(lhs, rhs) {
    return _sum(map((v, i) => v * rhs[i])(lhs));
}

function lengthOf(vec) {
    return Math.sqrt(squaredLengthOf(vec));
}

function sumOf(lhs, rhs) {
    return Array.from(lhs, (v, i) => v + rhs[i]);
}

function squaredLengthOf(vec) {
    return dot(vec, vec);
}

function uniformScale(vec, scale) {
    return Array.from(vec, (v) => v * scale);
}

module.exports = {
    differenceOf,
    distanceOf,
    dot,
    lengthOf,
    sumOf,
    squaredLengthOf,
    uniformScale,
};