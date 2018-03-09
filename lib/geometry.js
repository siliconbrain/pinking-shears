const { isNumber, isUndefined } = require('util');

const A = require('./array');
const invariant = require('./invariant');
const { isDefined } = require('./util');


function Point(x, y) {
    invariant(isNumber(x), "'x' must be a number.", {x});
    invariant(isNumber(y), "'y' must be a number.", {y});
    return {
        x,
        y,
        get [0]() { return x; },
        get [1]() { return y; },
        [Symbol.iterator]: function*() { yield x; yield y; },
        offset: (dx, dy) => Point(x + dx, y + dy),
    };
}

Point.equality = function(lhs, rhs) { return lhs.x === rhs.x && lhs.y === rhs.y; };
Point.subtract = function(lhs, rhs) { return Point(lhs[0] - rhs[0], lhs[1] - rhs[1]); }

function Size(width, height) {
    invariant(isNumber(width), "'width' must be a number.", {width});
    invariant(isNumber(height), "'height' must be a number.", {height});
    invariant(width >= 0, "'width' must be non-negative.", {width});
    invariant(height >= 0, "'height' most be non-negative.", {height});
    return {
        width,
        height,
        get [0]() { return width; },
        get [1]() { return height; },
        [Symbol.iterator]: function*() { yield width; yield height; },
    };
}

Size.equality = function(lhs, rhs) { return lhs.width === rhs.width && lhs.height === rhs.height; };

function BoundingBox({center, halfSize}) {
    return {
        center,
        get width() { return halfSize.width * 2; },
        get height() { return halfSize.height * 2; },
        get top() { return center.y - halfSize.height; },
        get right() { return center.x + halfSize.width; },
        get bottom() { return center.y + halfSize.height; },
        get left() { return center.x - halfSize.width; },
        get size() { return Size(halfSize.width * 2, halfSize.height * 2); },
        offset: (...args) => BoundingBox({center: center.offset(...args), halfSize}),
    };
}

BoundingBox.fromLimits = function({bottom, left, right, top}) {
    invariant(left <= right, "'left' must be less than or equal to 'right'.", {left, right});
    invariant(top <= bottom, "'top' must be less than or equal to 'bottom'.", {top, bottom});
    const halfSize = Size((right - left) / 2, (bottom - top) / 2);
    const center = Point((right + left) / 2, (bottom + top) / 2);
    return BoundingBox({center, halfSize});
};

BoundingBox.fromRect = function({x, y, width, height}) {
    invariant(width >= 0, "'width' must be non-negative.", {width});
    invariant(height >= 0, "'height' most be non-negative.", {height});
    const halfSize = Size(width / 2, height / 2);
    const center = Point(x + halfSize.width, y + halfSize.height);
    return BoundingBox({center, halfSize});
};

BoundingBox.equality = function(lhs, rhs) {
    return Point.equality(lhs.center, rhs.center) && Size.equality(lhs.size, rhs.size);
};

module.exports = {
    BoundingBox,
    Point,
    Size,
};