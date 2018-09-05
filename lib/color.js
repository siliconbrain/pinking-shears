const {assert} = require('./assert');
const {pipe} = require('./ix');
const {fold} = require('./ix/operators');
const {map} = require('./ix/operators/lazy');
const V = require('./vector');

const COMPONENTS = ['red', 'green', 'blue', 'alpha']
const LENGTH_OF_LONGEST_COLOR_VECTOR = 510;  // sqrt(255^2 * 4)

function areClose(tolerance) {
    assert(tolerance >= 0, "tolerance must be non-negative", {tolerance});
    if (tolerance === 0) return equality;
    else if (tolerance < 1) return (lhs, rhs) => normalizedDistanceOf(lhs, rhs) <= tolerance;
    else return (lhs, rhs) => distanceOf(lhs, rhs) <= tolerance;
}

function asUint32(data) {
    return new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32();
}

function averageOf(colors) {
    const {sum, cnt} = pipe(
        colors,
        map(toPremultipliedFloats),
        fold({sum: [0, 0, 0, 0], cnt: 0})(({sum, cnt}, color) => ({sum: V.sumOf(sum, color), cnt: cnt + 1})),
    );
    if (cnt === 0) return fromUint8s(...sum);
    else {
        const c = sum[3] === 0 ? 0 : (1 / sum[3]);
        return fromFloats(...V.uniformScale(sum.slice(0, 3), c), sum[3] / cnt);
    }
}

function averageOfWeighted(colors) {
    const {sum, cnt} = pipe(
        colors,
        map(({color, weight}) => ({color: toPremultipliedFloats(color), weight})),
        fold({sum: [0, 0, 0, 0], cnt: 0})(
            ({sum, cnt}, {color, weight}) => ({sum: V.sumOf(sum, V.uniformScale(color, weight)), cnt: cnt + weight})
        ),
    );
    if (cnt === 0) return fromUint8s(...sum);
    else {
        const c = sum[3] === 0 ? 0 : (1 / sum[3]);
        return fromFloats(...V.uniformScale(sum.slice(0, 3), c), sum[3] / cnt);
    }
}

function distanceOf(lhs, rhs) {
    return V.distanceOf(lhs, rhs)
}

function equality(lhs, rhs) {
    return asUint32(lhs) === asUint32(rhs);
}

function fromFloats(...components) {
    return new Uint8ClampedArray(Array.from(components, v => v * 255));
}

function fromUint8s(...components) {
    return new Uint8ClampedArray(components);
}

function normalizedDistanceOf(lhs, rhs) {
    return distanceOf(lhs, rhs) / LENGTH_OF_LONGEST_COLOR_VECTOR;
}

function toFloats(data) {
    return Array.from(data, v => v / 255);
}

function toPremultipliedFloats(data) {
    return toFloats(data).map((v, i, c) => i < 3 ? v * c[3] : v);
}

function toRgbaString(data) {
    return `rgba(${data[0]},${data[1]},${data[2]},${data[3] / 255})`
}

module.exports = Object.assign({
    areClose,
    asUint32,
    averageOf,
    averageOfWeighted,
    COMPONENTS,
    distanceOf,
    equality,
    fromFloats,
    fromUint8s,
    normalizedDistanceOf,
    toFloats,
    toPremultipliedFloats,
    toRgbaString,
}, ...COMPONENTS.map((com, idx) => ({
    [com]: {
        get_i: (data) => data[idx],
        set_i: (value) => (data) => { data[idx] = value; return data; },
        get_f: (data) => data[idx] / 255,
        set_f: (value) => (data) => {
            data[idx] = value / 255;  // rounding happens automagically when assigning to Uint8ClampedArray
            return data;
        },
    },
})));