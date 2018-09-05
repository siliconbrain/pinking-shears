const lops = require('./lazy');

const partition = (predicate) => (iterable) => {
    const ts = [], fs = [];
    for (const [val, i] of lops.enumerate(iterable)) (predicate(val, i, iterable) ? ts : fs).push(val);
    return [ts, fs];
}

function identity(value) { return value; }
function numberComparer(lhs, rhs) { return lhs - rhs; }

function binarySearchIndex(comparer) {
    return (array) => (value) => {
        const interval = {start: 0, end: array.length};
        while (interval.start < interval.end) {
            const middleIdx = Math.floor((interval.start + interval.end) / 2);  // NOTE: (start + end) >> 1
            const ordering = comparer(value, array[middleIdx]);
            if (ordering === 0) return middleIdx;
            else if (ordering < 0) interval.end = middleIdx;
            else interval.start = middleIdx + 1;
        }
        return interval.start;
    }
}

function partialSort(keySelector = identity, keyComparer = numberComparer) {
    const indexOf = binarySearchIndex((lhs, rhs) => keyComparer(lhs.key, rhs.key));
    const withKey = (val) => ({val, key: keySelector(val)});
    return (sortLength) => (array) => {
        const sorted = [];
        for (const value of array) {
            const valueWithKey = withKey(value);
            sorted.splice(indexOf(sorted)(valueWithKey), 0, valueWithKey);
            if (sorted.length > sortLength) sorted.pop();
        }
        return Array.from(sorted, ({val}) => val);
    };
}

module.exports = {
    partialSort,
    partition,
}