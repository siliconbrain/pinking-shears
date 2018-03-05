const {img, input, label, span} = require('@cycle/dom');
const rxjs = require('rxjs');

function FileInput({domSource, accept}) {
    const fileUrl$ = domSource.select('input[type="file"]').events('change')
        .map(ev => ev.target.files)
        .filter(files => files.length > 0)
        .map(files => files[0])
        .map(file => URL.createObjectURL(file));
    const vdom$ = rxjs.Observable.of(input({attrs: {
        type: 'file', accept: accept,
    }}))
    return {
        fileUrl$,
        vdom$,
    };
}

function Image({domSource, src$}) {
    function isValidImage(imageElement) {
        return imageElement.naturalWidth !== 0 && imageElement.naturalHeight !== 0;
    }
    const image$ = domSource.select('img').events('load')
        .map(ev => ev.target)
        .filter(isValidImage);
    const vdom$ = src$
        .map(src => img({attrs: {src: src}}));
    return {
        vdom$,
        image$,
    };
}

function Label({domSource, labelText, inputComponentFactory, inputComponentParams}) {
    const {vdom$: inputComponentVDom$, ...rest} = inputComponentFactory({
        domSource: domSource.select('label'),
        ...inputComponentParams,
    });
    const vdom$ = inputComponentVDom$.map(inputComponentVDom => label([
        span([labelText]),
        inputComponentVDom,
    ]));
    return {
        vdom$,
        ...rest,
    };
}

function NumberInput({domSource, initialValue, parser = parseInt, min = undefined, max = undefined, step = undefined}) {
    const value$ = domSource.select('input[type="number"]').events('change')
        .map(ev => parser(ev.target.value))
        .startWith(initialValue);
    const vdom$ = value$.map(value => input({attrs: {
        type: 'number', value: value, min: min, max: max, step: step,
    }}));
    return {
        value$,
        vdom$,
    };
}

module.exports = {
    FileInput,
    Image,
    Label,
    NumberInput,
};