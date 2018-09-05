function LazyIterable(iteratorFactory) {
    if (new.target === undefined)
        return new LazyIterable(iteratorFactory);

    this[Symbol.iterator] = iteratorFactory;
}

function _not(predicate) { return () => !predicate(...arguments); }

const enumerate = (iterable) => LazyIterable(function*() {
    var i = 0;
    for (const val of iterable) yield [val, i++];
});

const filter = (predicate) => (iterable) => LazyIterable(function*() {
    for (const [val, i] of enumerate(iterable))
        if (predicate(val, i, iterable)) yield val;
});

const flatten = (iterable) => LazyIterable(function*() {
    for (const iter of iterable) yield* iter;
});

const map = (selector) => (iterable) => LazyIterable(function*() {
    for (const [val, i] of enumerate(iterable)) yield selector(val, i, iterable);
});

const flatMap = (selector) => (iterable) => flatten(map(selector)(iterable));

const partition = (predicate) => (iterable) => [
    filter(predicate)(iterable),
    filter(_not(predicate))(iterable),
];

const range = (from, to, step = 1) => LazyIterable(function*() {
    var cur = from;
    while (cur < to) {
        yield cur;
        cur += step;
    }
});

const scan = (selector) => (iterable) => LazyIterable(function*(){
    var previous;
    for (const [val, i] of enumerate(iterable)) {
        if (i !== 0) yield selector(previous, val, i - 1, iterable);
        previous = val;
    }
});

const skip = (count) => skipWhile((_, i) => i < count);

const skipWhile = (predicate) => (iterable) => LazyIterable(function*() {
    for (const [val, i] of enumerate(iterable)) {
        if (predicate(val, i, iterable)) continue;
        else yield val;
    }
});

const take = (count) => takeWhile((_, i) => i < count);

const takeWhile = (predicate) => (iterable) => LazyIterable(function*() {
    for (const [val, i] of enumerate(iterable)) {
        if (predicate(val, i, iterable)) yield val;
        else break;
    }
});

const tap = (examiner) => (iterable) => LazyIterable(function*() {
    for (const [val, i] of enumerate(iterable)) {
        examiner(val, i, iterable);
        yield val;
    }
});

function* iterationsOf(iterators) {
    while (true) yield iterators.map(iterator => iterator.next());
}

const zip = (...iterables) => LazyIterable(function*(){
    const iterators = iterables.map(iterable => iterable[Symbol.iterator]());
    for (const iteration of iterationsOf(iterators)) {
        if (iteration.some(({done}) => done)) break;
        else yield iteration.map(({value}) => value);
    }
});

const zipWith = (selector) => (...iterables) => map((vals, ...rest) => selector(...vals, ...rest))(zip(...iterables));

const product = (...iterables) => iterables.map(map(v => [v])).reduceRight(
    (innerIterable, outerIterable) => flatMap(outer => map(inner => outer.concat(inner))(innerIterable))(outerIterable));

module.exports = {
    enumerate,
    filter,
    flatMap,
    flatten,
    LazyIterable,
    map,
    partition,
    product,
    range,
    scan,
    skip,
    skipWhile,
    take,
    takeWhile,
    tap,
    zip,
    zipWith,
};