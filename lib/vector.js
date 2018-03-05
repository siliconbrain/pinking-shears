function sumOf(vector0, ...vectors) {
    console.assert(vectors.every(vector => vector.length === vector0.length));
    return vectors.reduce((acc, vec) => acc.map((v, i) => v + vec[i]), vector0);
}

function differenceOf(lhs, rhs) {
    console.assert(lhs.length === rhs.length);
    console.assert(!isUnsignedTypedArray(lhs));
    return lhs.map((v, i) => v - rhs[i]);
}

function distanceOf(lhs, rhs) {
    return lengthOf(differenceOf(lhs, rhs));
}

function isIntegerTypedArray(vector) {
    [
        Int8Array,
        Int16Array,
        Int32Array,
        Uint8Array,
        Uint8ClampedArray,
        Uint16Array,
        Uint32Array,
    ].indexOf(vector.constructor) >= 0;
}

function isUnsignedTypedArray(vector) {
    [
        Uint8Array,
        Uint8ClampedArray,
        Uint16Array,
        Uint32Array,
    ].indexOf(vector.constructor) >= 0;
}

function lengthOf(vector) {
    return Math.sqrt(squaredLengthOf(vector));
}

function squaredLengthOf(vector) {
    var result = 0;
    for (const e of vector) {
        result += e * e;
    }
    return result;
}

function normalized(vector) {
    console.assert(!isIntegerTypedArray(vector))
    const l = lengthOf(vector);
    return vector.map(v => v / l);
}

module.exports = {
    differenceOf,
    distanceOf,
    lengthOf,
    normalized,
    squaredLengthOf,
    sumOf,
};