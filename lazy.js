const L = function() {
    
    function makeIterable(iteratorFactory) {
        const iterable = {
            [Symbol.iterator]: iteratorFactory
        };
        iterable.first = () => first(iterable);
        iterable.flatMap = (func) => flatMap(iterable, func);
        iterable.fold = (initial) => (func) => fold(iterable, initial, func);
        iterable.forEach = (func) => forEach(iterable, func);
        iterable.map = (func) => map(iterable, func);
        iterable.reduce = (func, seed) => reduce(iterable, func, seed);
        return iterable;
    }

    function enumerate(iterable) {
        return makeIterable(function*() {
            var i = 0;
            for (const val of iterable) yield [val, i++];
        });
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

    return {
        first,
        flatMap,
        fold,
        forEach,
        map,
        range,
        reduce,
    };
}();