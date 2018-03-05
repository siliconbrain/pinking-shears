const I = require('./interactive');
const V = require('./vector');

function areEqual(lhs, rhs) {
    console.assert(lhs.length === rhs.length, "colors must have the same number of components", lhs, rhs);
    return lhs.every((v, i) => v === rhs[i]);
}

function areAlmostEqual(tolerance) {
    return function(lhs, rhs) {
        return distanceOf(lhs, rhs) <= tolerance;
    }
}

function fromUint8ToFloat(color) {
    return [...color].map(v => v / 255);
}

function fromFloatToUint8(color) {
    return [...color].map(v => Math.round(v * 255));
}

function premultiplied([r, g, b, a]) {
    return [r * a, g * a, b * a, a];
}

function averageOf(colors) {
    const premultipiedColors = I.map(colors, fromUint8ToFloat).map(premultiplied);
    const {sum, cnt} = premultipiedColors.fold({sum: [0, 0, 0, 0], cnt: 0})(
        ({sum, cnt}, color) => ({sum: V.sumOf(sum, color), cnt: cnt + 1})
    );
    if (cnt === 0) return;
    else return fromFloatToUint8([...sum.slice(0, 3).map(v => sum[3] === 0 ? 0 : v / sum[3]), sum[3] / cnt]);
}

function distanceOf(lhs, rhs) {
    console.assert(lhs.length === rhs.length, "colors must have the same number of components", lhs, rhs);
    const result = V.distanceOf(fromUint8ToFloat(lhs), fromUint8ToFloat(rhs)) / Math.sqrt(lhs.length);
    console.assert(result >= 0, "distance should be non-negative", result);
    console.assert(result <= 1, "distance should be normalized", result);
    return result;
}

function isTransparent(color) {
    return color[3] === 0;
}

function makeRgbaString(r = 0, g = 0, b = 0, a = 255) {
    return `rgba(${r},${g},${b},${a / 255})`;
}

function toRgbaString(color) {
    return makeRgbaString(...color);
}

function hexStringToInteger(string) {
    return ;
}

function hexColorStringToArray(string) {
    invariant(
        string.match(/^[#][0-9a-f]{6}$/i),
        "'string' must be of the form #xxxxxx, where x represents hexadecimal digits",
        string);
    const value = parseInt(string.slice(1), 16);
    return [
        (value & (255 << 16)) >> 16,
        (value & (255 << 8)) >> 8,
        (value & (255 << 0)) >> 0,
        255
    ];
}

function integerToHexString(integer) {
    invariant(integer >= 0, "'integer' must be non-negative", integer);
    invariant(integer % 1 === 0, "'integer' must be a whole number", integer);
    return ('000000' + integer.toString(16)).slice(-6);
}

function arrayColorToHexString([r, g, b]) {
    return '#' + integerToHexString((r << 16) | (g << 8) | (b << 0));
}

module.exports = {
    areEqual,
    areAlmostEqual,
    arrayColorToHexString,
    averageOf,
    distanceOf,
    hexColorStringToArray,
    isTransparent,
    makeRgbaString,
    toRgbaString,
};