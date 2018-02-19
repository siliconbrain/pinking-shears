const {canvas, div, header, img, input, label, main, makeDOMDriver, section} = require('@cycle/dom');
const {run} = require('@cycle/rxjs-run');
const {adapt} = require('@cycle/run/lib/adapt');
const rxjs = require('rxjs');

const L = require('./lazy');

function isValidImage(imageElement) {
    return imageElement.naturalWidth !== 0 && imageElement.naturalHeight !== 0;
}

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

function makeRgbaString(r = 0, g = 0, b = 0, a = 255) {
    return `rgba(${r},${g},${b},${a / 255})`;
}

function makeArea(left, top, width, height) {
    return {left, top, width, height};
}

function colorsIn(imageData, area) {
    const rows = L.range(area.top, Math.min(imageData.height, area.top + area.height));
    const cols = L.range(area.left, Math.min(imageData.width, area.left + area.width));
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
        const rows = L.range(0, resolution);
        const cols = L.range(0, resolution);
        return rows.map(rowIdx => cols.flatMap(colIdx => {
            const sampleArea = makeArea(colIdx * sampleRect.width, rowIdx * sampleRect.height, sampleRect.width, sampleRect.height);
            const colors = colorsIn(imageData, sampleArea);
            if (L.isEmpty(colors)) return [];
            else {
            const color = coreFn(colors, params);
                return [color];
            }
        }));
    };
}

function frequencies(values, equality) {
    equality = equality || function(a, b) { return a === b; };

    const frequencies = [];
    for (const value of values) {
        const idx = frequencies.findIndex(([val, cnt]) => equality(val, value));
        if (idx < 0) {
            frequencies.push([value, 0]);
        } else {
            frequencies[idx][1] += 1;
        }
    }
    return frequencies;
}

function areSameColor(colorA, colorB) {
    return colorA.every((v, i) => v === colorB[i]);
}

function length(arr) {
    return Math.sqrt(arr.map(v => v * v).reduce((acc, val) => acc + val));
}

function colorDistance(colorA, colorB) {
    const diff = colorA.map((v, i) => v - colorB[i]);
    return length(diff) / 510;
}

function areAlmostSameColor(tolerance) {
    return function(colorA, colorB) {
        return colorDistance(colorA, colorB) <= tolerance;
    }
}

function numberCompareFunction(a, b) { return a - b; }

function max(iterable, compareFunction = numberCompareFunction) {
    return L.reduce(iterable, (res, val) => compareFunction(res, val) < 0 ? val : res);
}

function min(iterable, compareFunction = numberCompareFunction) {
    return L.reduce(iterable, (res, val) => compareFunction(res, val) > 0 ? val : res);
}

function isTransparent(color) {
    return color[3] === 0;
}

function averageOf(colors) {
    var cntA = 0, cntC = 0, sum = [0, 0, 0, 0];
    for (const color of colors) {
        cntA++;
        if (!isTransparent(color)) cntC++;
        color.forEach((v, i) => sum[i] += v);
    }
    return [...sum.slice(0, 3).map(v => cntC === 0 ? 0 : v / cntC), sum[3] / cntA].map(v => Math.round(v));
}

const algorithms = [
    {
        name: "first color in tile",
        func: makeTileSampledAlgo(function(colors) { return L.first(colors); }),
    },
    {
        name: "most significant color in tile",
        func: makeTileSampledAlgo(function(colors) {
            return max(frequencies(colors, areSameColor), (a, b) => a[1] - b[1])[0];
        }),
    },
    {
        name: "least significant color in tile",
        func: makeTileSampledAlgo(function(colors) {
            return min(frequencies(colors, areSameColor), (a, b) => a[1] - b[1])[0];
        }),
    },
    {
        name: "most significant color in tile with tolerance",
        func: makeTileSampledAlgo(function(colors, {tolerance}) {
            return max(frequencies(colors, areAlmostSameColor(tolerance)), (a, b) => a[1] - b[1])[0];
        }),
        params: {
            tolerance: {
                type: 'range',
                min: 0,
                max: 1,
                initial: 0.5
            },
        },
    },
    {
        name: "least significant color in tile with tolerance",
        func: makeTileSampledAlgo(function(colors, {tolerance}) {
            return min(frequencies(colors, areAlmostSameColor(tolerance)), (a, b) => a[1] - b[1])[0];
        }),
        params: {
            tolerance: {
                type: 'range',
                min: 0,
                max: 1,
                initial: 0.5
            },
        },
    },
    {
        name: "average color in tile",
        func: makeTileSampledAlgo(averageOf),
    },
];

function inputModule({DOM}) {
    const file$ = DOM.select('#image-file-input').events('change')
        .map(ev => ev.target.files)
        .filter(files => files.length > 0)
        .map(files => files[0]);

    const image$ = DOM.select('#input .preview img').events('load')
        .map(ev => ev.target)
        .filter(isValidImage);

    const previewBackgroundColor$ = rxjs.Observable.combineLatest(
        ...['red', 'green', 'blue', 'alpha'].map(component => DOM
            .select(`#input .preview .background-color .color-component-${component} input`)
            .events('change')
            .map(ev => ev.target.value)
            .startWith(0)
        )
    );

    return {
        vdom$: rxjs.Observable.combineLatest(
            file$.map(file => URL.createObjectURL(file)).startWith(null),
            previewBackgroundColor$,
        ).map(([imgSrc, previewBackgroundColor]) => section('#input', [
                div('.file-input', [
                    label({attrs: {for: 'image-file-input'}}, "Input image: "),
                    input('#image-file-input', {attrs: {type: 'file', accept: 'image/*'}}),
                ]),
                div('.preview', [
                    img({attrs: {src: imgSrc || undefined}}),
                    canvas({attrs: {
                        width: 480,
                        height: 480,
                        style: `background-color: ${makeRgbaString(...previewBackgroundColor)}`,
                    }}),
                    div('.background-color', [
                        label('Background color:'),
                        ...['red', 'green', 'blue', 'alpha'].map((component, i) =>
                            div(`.color-component-input.color-component-${component}`, [
                                label(component[0].toUpperCase()),
                                input({attrs: {type: 'number', min: 0, max: 255, value: previewBackgroundColor[i]}})
                            ])
                        ),
                    ]),
                ]),
            ]),
        ),
        image$,
        sideEffect$: image$.map(image => ({
            func: (image) => {
                const canvas = document.querySelector('#input .preview canvas');
                const ctx = canvas.getContext('2d');
                transferImageToCanvas(image, ctx);
            },
            args: [image],
        })),
    };
}

function algoModule(algo, {DOM, image$, outputResolution$, outputPixelSize$}) {
    const params = Object.entries(algo.params || {}).map(([key, param]) => {
        const paramVal$ = DOM.select(`.algo[data-name="${algo.name}"] input[name="${key}"]`)
            .events('change')
            .map(ev => ev.target.value)
            .map(val => {
                switch (param.type) {
                    case 'range':
                        return parseFloat(val);
                }
            }).startWith(param.initial);
        return {
            key,
            vdom$: paramVal$.map(paramVal => input({attrs: {name: key, type: param.type, step: '0.01', min: param.min, max: param.max, value: paramVal}})),
            param$: paramVal$,
        }
    });
    const params$ = params.length > 0
        ? rxjs.Observable.combineLatest(...params.map(({param$}) => param$))
            .map((ps) => ps.reduce((obj, val, idx) => Object.assign(obj, {[params[idx].key]: val}), {}))
        : rxjs.Observable.of({});
    return {
        vdom$: (params.length > 0 ? rxjs.Observable.combineLatest(...params.map(({vdom$}) => vdom$)) : rxjs.Observable.of([]))
            .map((paramVdoms) =>
                div('.algo', {dataset: {name: algo.name}}, [
                    canvas({attrs: {title: algo.name}}),
                    ...paramVdoms,
                ])        
            ),
        sideEffect$: rxjs.Observable.combineLatest(image$, outputResolution$, outputPixelSize$, params$)
        .map(([image, resolution, pixelSize, params]) => ({
            func: function (image, resolution, pixelSize) {
                const canvasElement = document.querySelector(`canvas[title="${algo.name}"`);
                const ctx = canvasElement.getContext('2d');
    
                transferImageToCanvas(image, ctx);
                const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.canvas.width = ctx.canvas.height = resolution * pixelSize;
                console.log("running algo:", algo.name, params);
                const colors = algo.func(imageData, resolution, params);
                console.log("done.");
                colors.forEach((row, v) => row.forEach((color, h) => {
                    ctx.fillStyle = makeRgbaString(...color);
                    ctx.fillRect(h * pixelSize, v * pixelSize, pixelSize, pixelSize);
                }));
            },
            args: [image, resolution, pixelSize],
        })),
    }
}

function outputModule({DOM, image$}) {
    const outputResolution$ = DOM.select('#output-resolution').events('change').map(ev => parseInt(ev.target.value)).startWith(64);
    const outputPixelSize$ = DOM.select('#output-pixel-size').events('change').map(ev => parseInt(ev.target.value)).startWith(4);

    const algoModules = algorithms.map(
        algo => algoModule(algo, {DOM: DOM.select('#output #algos'), image$, outputResolution$, outputPixelSize$})
    );

    return {
        vdom$: rxjs.Observable.combineLatest(outputResolution$, outputPixelSize$, ...algoModules.map(({vdom$}) => vdom$))
            .map(([outputResolution, outputPixelSize, ...algoVdoms]) => section('#output', [
                div('.output-param', [
                    label({attrs: {for: 'output-resolution'}}, "Output resolution:"),
                    input('#output-resolution', {attrs: {type: 'number', required: true, min: 1, value: outputResolution}}),
                ]),
                div('.output-param', [
                    label({attrs: {for: 'output-pixel-size'}}, "Output pixel size:"),
                    input('#output-pixel-size', {attrs: {type: 'number', required: true, min: 1, value: outputPixelSize}}),                    
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
