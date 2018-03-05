const {canvas, div, header, i, img, input, label, main, makeDOMDriver, section, span} = require('@cycle/dom');
const {run} = require('@cycle/rxjs-run');
const {adapt} = require('@cycle/run/lib/adapt');
const rxjs = require('rxjs');

const A = require('./lib/array');
const C = require('./lib/color');
const components = require('./lib/components');
const F = require('./lib/functional');
const I = require('./lib/interactive');
const invariant = require('./lib/invariant');

function log(value) { console.log(value); }

function transferImageToCanvas(imageElement, canvasContext) {
    const imageWidth = imageElement.naturalWidth,
          imageHeight = imageElement.naturalHeight;

    const size = Math.max(imageHeight, imageWidth);
    const canvas = canvasContext.canvas;
    canvas.width = canvas.height = size;

    const offsetX = (size - imageWidth) / 2;
    const offsetY = (size - imageHeight) / 2;

    canvasContext.drawImage(imageElement, offsetX, offsetY);
}

const imageDataExtractor = (function() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    return {
        getImageData: function(imageElement) {
            const imageWidth = imageElement.naturalWidth,
                  imageHeight = imageElement.naturalHeight;

            canvas.width = imageWidth;
            canvas.height = imageHeight;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.drawImage(imageElement, 0, 0);

            return ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
    };
})();

function makeArea(left, top, width, height) {
    return {left, top, width, height};
}

function colorsIn(imageData, area) {
    const rows = I.range(area.top, Math.min(imageData.height, area.top + area.height));
    const cols = I.range(area.left, Math.min(imageData.width, area.left + area.width));
    return rows.flatMap(rowIdx => cols.map(colIdx => (rowIdx * imageData.width) + colIdx))
        .map(offset => imageData.data.slice((offset + 0) * 4, (offset + 1) * 4));
}

function sampleRectangleSize(imageData, resolution) {
    console.assert(imageData.width === imageData.height, "canvas is not square");
    return {
        width: Math.ceil(imageData.width / resolution),
        height: Math.ceil(imageData.height / resolution)
    };
}

function makeTileSampledAlgo(coreFn) {
    return function(imageData, resolution, params) {
        const sampleRect = sampleRectangleSize(imageData, resolution);
        const rows = I.range(0, resolution);
        const cols = I.range(0, resolution);
        return rows.map(rowIdx => cols.flatMap(colIdx => {
            const sampleArea = makeArea(
                colIdx * sampleRect.width,
                rowIdx * sampleRect.height,
                sampleRect.width,
                sampleRect.height
            );
            const colors = colorsIn(imageData, sampleArea);
            if (I.isEmpty(colors)) return [];
            else {
                const color = coreFn(colors, params);
                return [color];
            }
        }));
    };
}

function makeCompareFunction(baseCompareFunction, keySelector) {
    return (a, b) => baseCompareFunction(keySelector(a), keySelector(b));
}

const algorithms = [
    {
        name: "average color in tile",
        func: makeTileSampledAlgo(C.averageOf),
    },
    {
        name: "quantized palette",
        func: makeTileSampledAlgo(function (colors, {levelsR, levelsG, levelsB, levelsA}) {
            const color = C.averageOf(colors);
            function quantize(channel, levels) {
                const u = Math.round(256 / levels);
                return Math.round(channel / u) * u;
            }
            return color.map((channel, i) => quantize(channel, [levelsR, levelsG, levelsB, levelsA][i]));
        }),
        params: {
            levelsR: {
                type: "number",
                min: 1,
                max: 256,
                initial: 16,
            },
            levelsG: {
                type: "number",
                min: 1,
                max: 256,
                initial: 16,
            },
            levelsB: {
                type: "number",
                min: 1,
                max: 256,
                initial: 16,
            },
            levelsA: {
                type: "number",
                min: 1,
                max: 256,
                initial: 16,
            },
        },
    }
];

function RGBAColorInputPanel({domSource}) {
    function makeChannel(channel) {
        const {value$, vdom$} = components.Label({
            domSource: domSource.select(`.channel[data-channel="${channel}"]`),
            labelText: channel[0].toUpperCase(),
            inputComponentFactory: components.NumberInput,
            inputComponentParams: {
                initialValue: 0,
                min: 0,
                max: 255,
                parser: parseInt,
            },
        });
        return {
            value$,
            vdom$: vdom$.map(vdom => div('.channel', {dataset: {channel: channel}}, [vdom])),
        }
    }
    const channels = [
        makeChannel('red'),
        makeChannel('green'),
        makeChannel('blue'),
        makeChannel('alpha'),
    ];
    const vdom$ = rxjs.Observable.combineLatest(...channels.map(({vdom$}) => vdom$))
        .map(channelVDoms => div('.channels', [...channelVDoms]));
    const color$ = rxjs.Observable.combineLatest(...channels.map(({value$}) => value$));
    return {
        vdom$,
        color$,
    }
}

function inputModule({DOM}) {
    const {vdom$: fileSelectorVDom$, fileUrl$} = components.Label({
        domSource: DOM.select('#input .file-input'),
        labelText: "Input image",
        inputComponentFactory: components.FileInput,
        inputComponentParams: {
            accept: 'image/*',
        },
    });
    const {vdom$: imageVDom$, image$} = components.Image({
        domSource: DOM.select('#input .preview'),
        src$: fileUrl$.startWith(undefined),
    });
    const {vdom$: previewBackgroundColorSelectorVDom$, color$: previewBackgroundColor$} = RGBAColorInputPanel({
        domSource: DOM.select('#input .preview .background-color'),
    })

    const canvas$ = DOM.select('#input .preview canvas').element().distinctUntilChanged();

    return {
        vdom$: rxjs.Observable.combineLatest(
            fileSelectorVDom$,
            imageVDom$,
            previewBackgroundColorSelectorVDom$,
            previewBackgroundColor$,
        ).map(([
            fileSelectorVDom,
            imageVDom,
            previewBackgroundColorSelectorVDom,
            previewBackgroundColor,
        ]) => section('#input', [
                div('.file-input', [fileSelectorVDom]),
                div('.preview', [
                    imageVDom,
                    div([
                        canvas({attrs: {
                            width: 480,
                            height: 480,
                            style: `background-color: ${C.toRgbaString(previewBackgroundColor)}`,
                        }}),
                    ]),
                    div('.background-color', [
                        label('Background color'),
                        previewBackgroundColorSelectorVDom,
                    ]),
                ]),
            ]),
        ),
        image$,
        sideEffect$: rxjs.Observable.combineLatest(image$, canvas$).map(([image, canvas]) => ({
            func: (image, canvas) => {
                const ctx = canvas.getContext('2d');
                transferImageToCanvas(image, ctx);
            },
            args: [image, canvas],
        })),
    };
}

function parseParamValue(type, value) {
    switch (type) {
        case 'color':
            return hexColorStringToArray(value);
        case 'number':
            return parseInt(value);
        case 'range':
            return parseFloat(value);
        default:
            throw new Error(`Unknown parameter type: ${type}`);
    }
}

function renderParamValue(type, value) {
    switch (type) {
        case 'color':
            return value && tupleColorToHexString(value);
        case 'number':
            return value && value.toString();
        case 'range':
            return value && value.toString();
        default:
            throw new Error(`Unknown parameter type: ${type}`);
    }
}

function renderAlgo(algo, canvas, image, resolution, pixelSize, paramValues) {
    const ctx = canvas.getContext('2d');
    transferImageToCanvas(image, ctx);
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.canvas.width = ctx.canvas.height = resolution * pixelSize;
    console.log("running algo", algo.name, paramValues);
    const colors = algo.func(imageData, resolution, paramValues);
    colors.forEach((row, v) => row.forEach((color, h) => {
        ctx.fillStyle = C.toRgbaString(color);
        ctx.fillRect(h * pixelSize, v * pixelSize, pixelSize, pixelSize);
    }));
    console.log("done.");
}

function arrayToObject(array, keySelector) {
    return array.reduce((obj, val, idx) => {
        obj[keySelector(val, idx)] = val;
        return obj;
    }, {});
}

function algoModule(algo, {DOM, image$, outputResolution$, outputPixelSize$}) {
    const algoDOM = DOM.select(`.algo[data-name="${algo.name}"]`);
    const active$ = algoDOM.select('label input[type="checkbox"]').events('change')
        .map(ev => ev.target.checked).startWith(false);
    const canvas$ = algoDOM.select('canvas').element().distinctUntilChanged();

    const parameters = Object.entries(algo.params || {}).map(
        ([key, param]) => {
            const value$ = algoDOM.select(`input[name="${key}"]`)
                .events('change')
                .map(ev => ev.target.value)
                .map(value => parseParamValue(param.type, value))
                .startWith(param.initial);
            const vdom$ = value$.map(
                value => label('.parameter', {dataset: {'inputtype': param.type}}, [
                    span(key),
                    input({
                        attrs: {
                            name: key,
                            type: param.type,
                            step: param.step || 1,
                            min: param.min,
                            max: param.max,
                            value: renderParamValue(param.type, value),
                        }
                    }),
                ])
            );
            return {
                key,
                vdom$,
                value$,
            }
        }
    );
    const paramVdom$s = parameters.map(({vdom$}) => vdom$);
    const paramVdoms$ = parameters.length > 0 ? rxjs.Observable.combineLatest(...paramVdom$s) : rxjs.Observable.of([]);
    const paramValue$s = parameters.map(({value$}) => value$);
    const paramValues$ = parameters.length > 0
        ? rxjs.Observable.combineLatest(...paramValue$s).map(
            values => arrayToObject(values, (val, idx) => parameters[idx].key)
        )
        : rxjs.Observable.of({});
    return {
        vdom$: rxjs.Observable.combineLatest(active$, paramVdoms$).map(
            ([active, paramVdoms]) =>
                div('.algo', {dataset: {name: algo.name, active}}, [
                    div([
                        header([
                            label([
                                i('.active.fa.fa-caret-' + (active ? 'down' : 'right')),
                                span(algo.name),
                                input({attrs: {type: 'checkbox', checked: active}}),
                            ]),
                        ]),
                        canvas({attrs: {title: algo.name}}),
                        div('.parameters', [
                            ...paramVdoms,
                        ]),
                    ]),
                ])
        ),
        sideEffect$: rxjs.Observable.combineLatest(
            canvas$, image$, outputResolution$, outputPixelSize$, paramValues$, active$
        ).filter(
            ([canvas, image, resolution, pixelSize, paramValues, active]) => active
        ).map(
            ([canvas, image, resolution, pixelSize, paramValues, active]) => ({
                func: renderAlgo,
                args: [algo, canvas, image, resolution, pixelSize, paramValues],
            })
        ),
    };
}

function outputModule({DOM, image$}) {
    const outputResolution = components.Label({
        domSource: DOM.select('#output-resolution'),
        labelText: "Output resolution",
        inputComponentFactory: components.NumberInput,
        inputComponentParams: {
            initialValue: 64,
            parser: parseInt,
            min: 1,
        },
    });
    const outputPixelSize = components.Label({
        domSource: DOM.select('#output-pixel-size'),
        labelText: "Output pixel size",
        inputComponentFactory: components.NumberInput,
        inputComponentParams: {
            initialValue: 4,
            parser: parseInt,
            min: 1,
        },
    });

    const algoModules = algorithms.map(
        algo => algoModule(algo, {
            DOM: DOM.select('#output #algos'),
            image$,
            outputResolution$: outputResolution.value$,
            outputPixelSize$: outputPixelSize.value$,
        })
    );

    return {
        vdom$: rxjs.Observable.combineLatest(
            outputResolution.vdom$,
            outputPixelSize.vdom$,
            rxjs.Observable.combineLatest(...algoModules.map(({vdom$}) => vdom$)),
        ).map(([outputResolutionVDom, outputPixelSizeVDom, algoVdoms]) => section('#output', [
                div('.output-params', [
                    div('#output-resolution.output-param', [outputResolutionVDom]),
                    div('#output-pixel-size.output-param', [outputPixelSizeVDom]),
                ]),
                section('#algos', algoVdoms),
        ])),
        sideEffect$: rxjs.Observable.merge(...algoModules.map(({sideEffect$}) => sideEffect$))
    }
}

function app({DOM}) {
    const {vdom$: inputVdom$, image$, sideEffect$: inputSideEffect$} = inputModule({DOM});
    const {vdom$: outputVdom$, sideEffect$: outputSideEffect$} = outputModule({DOM, image$});

    return {
        DOM: rxjs.Observable.combineLatest(inputVdom$, outputVdom$)
            .map(([inputVdom, outputVdom]) => main([
                inputVdom,
                outputVdom
            ])),
        sideEffect: rxjs.Observable.merge(inputSideEffect$, outputSideEffect$),
    };
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('head').appendChild(require('./style').createStyleElement());

    run(app, {
        DOM: makeDOMDriver('body'),
        sideEffect: funcAndArgs$ => { adapt(funcAndArgs$).subscribe(({func, args}) => func(...args)); }
    });
});
