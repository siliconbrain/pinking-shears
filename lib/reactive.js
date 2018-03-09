const rxjs = require('rxjs');

function combineLatest0(...observables) {
    return observables.length > 0 ? rxjs.Observable.combineLatest(...observables) : rxjs.Observable.of([]);
}

function combineLatestOf(observables) {
    switch (observables.length) {
        case 0: return rxjs.Observable.of([]);
        case 1: return observables[0].map(v => [v]);
        default: return rxjs.Observable.combineLatest(...observables);
    }
}

module.exports = {
    combineLatest0,
    combineLatestOf,
};