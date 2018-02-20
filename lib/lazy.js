function makeIterable(iteratorFactory) {
    const iterable = {
        [Symbol.iterator]: iteratorFactory
    };
    iterable.filter = (predicate) => filter(iterable, predicate);
    iterable.first = () => first(iterable);
    iterable.flatMap = (func) => flatMap(iterable, func);
    iterable.fold = (initial) => (func) => fold(iterable, initial, func);
    iterable.forEach = (func) => forEach(iterable, func);
    iterable.isEmpty = () => isEmpty(iterable);
    iterable.map = (func) => map(iterable, func);
    iterable.reduce = (func, seed) => reduce(iterable, func, seed);
    iterable.skip = (count) => skip(iterable, count);
    iterable.take = (count) => take(iterable, count);
    iterable.zip = (...iterables) => zip(iterable, ...iterables);
    return iterable;
}

function enumerate(iterable) {
    return makeIterable(function*() {
        var i = 0;
        for (const val of iterable) yield [val, i++];
    });
}

function filter(iterable, predicate) {
    return makeIterable(function*() {
        for (const [val, i] of enumerate(iterable))
            if (predicate(val, i)) yield val;
    })
}

function first(iterable) {
    for (const val of iterable) return val;
}

function flatMap(iterable, func) {
    return makeIterable(function*() { for (const [val, i] of enumerate(iterable)) yield* func(val, i) });
}

function fold(iterable, initial, func) {
    var result = initial;
    for (const [val, i] of enumerate(iterable)) result = func(result, val, i);
    return result;
}

function forEach(iterable, func) {
    for (const _ of map(iterable, func));
}

function isEmpty(iterable) {
    for (const _ of iterable) return false;
    return true;
}

function map(iterable, func) {
    return makeIterable(function*() { for (const [val, i] of enumerate(iterable)) yield func(val, i); });
}

function range(from, to) {
    return makeIterable(function*() { var cur = from; while (cur < to) yield cur++ });
}

function reduce(iterable, func) {
    var result = undefined;
    for (const [val, i] of enumerate(iterable)) result = i === 0 ? val : func(result, val, i);
    return result;
}

function skip(iterable, count) {
    return makeIterable(function*() {
        for (const [val, i] of enumerate(iterable)) {
            if (i < count) continue;
            else yield val;
        }
    });
}

function take(iterable, count) {
    return makeIterable(function*() {
        for (const [val, i] of enumerate(iterable)) {
            if (i < count) yield val;
            else break;
        }
    });
}

function* iterationsOf(iterators) {
    while (true) yield iterators.map(iterator => iterator.next());
}

function zip(...iterables) {
    return makeIterable(function*(){
        const iterators = iterables.map(iterable => iterable[Symbol.iterator]());
        for (const iteration of iterationsOf(iterators)) {
            if (iteration.some(({done}) => done)) break;
            else yield iteration.map(({value}) => value);
        }
    });
}

function zipWith(func, ...iterables) {
    return map(zip(...iterables), (values, i) => func(...values, i));
}

module.exports = {
    enumerate,
    filter,
    first,
    flatMap,
    fold,
    forEach,
    isEmpty,
    makeIterable,
    map,
    range,
    reduce,
    skip,
    take,
    zip,
    zipWith,
};