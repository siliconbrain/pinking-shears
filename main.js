const {canvas, div, img, input, label, main, makeDOMDriver, section} = require('@cycle/dom');
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
    return function(imageData, resolution) {
        const sampleRect = sampleRectangleSize(imageData, resolution);
        const rows = L.range(0, resolution);
        const cols = L.range(0, resolution);
        return rows.map(rowIdx => cols.flatMap(colIdx => {
            const sampleArea = makeArea(colIdx * sampleRect.width, rowIdx * sampleRect.height, sampleRect.width, sampleRect.height);
            const colors = colorsIn(imageData, sampleArea);
            if (L.isEmpty(colors)) return [];
            else {
            const color = coreFn(colors);
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
        return colorDistance(colorA, colorB) < tolerance;
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
        func: makeTileSampledAlgo(function(colors) { return L.first(colors); })
    },
    {
        name: "most significant color in tile",
        func: makeTileSampledAlgo(function(colors) {
            return max(frequencies(colors, areSameColor), (a, b) => a[1] - b[1])[0];
        })
    },
    {
        name: "least significant color in tile",
        func: makeTileSampledAlgo(function(colors) {
            return min(frequencies(colors, areSameColor), (a, b) => a[1] - b[1])[0];
        })
    },
    {
        name: "most significant color in tile (tolerance: 0.5)",
        func: makeTileSampledAlgo(function(colors) {
            return max(frequencies(colors, areAlmostSameColor(0.5)), (a, b) => a[1] - b[1])[0];
        })
    },
    {
        name: "least significant color in tile (tolerance: 0.5)",
        func: makeTileSampledAlgo(function(colors) {
            return min(frequencies(colors, areAlmostSameColor(0.5)), (a, b) => a[1] - b[1])[0];
        })
    },
    {
        name: "average color in tile",
        func: makeTileSampledAlgo(averageOf)
    },
];

function app({DOM}) {
    const file$ = DOM.select('#image-file-input').events('change')
        .map(ev => ev.target.files)
        .filter(files => files.length > 0)
        .map(files => files[0]);
    const imgSrc$ = file$.map(file => URL.createObjectURL(file));
    const image$ = DOM.select('#input').select('.preview').select('img').events('load').map(ev => ev.target).filter(isValidImage);
    const outputResolution$ = DOM.select('#output-resolution').events('change').map(ev => parseInt(ev.target.value)).startWith(64);
    const outputPixelSize$ = DOM.select('#output-pixel-size').events('change').map(ev => parseInt(ev.target.value)).startWith(4);
    
    const inputPreviewImageBackgroundColor$ = rxjs.Observable.combineLatest(...['red', 'green', 'blue', 'alpha'].map(
        component => DOM
            .select(`#input .preview .background-color .color-component-${component} input`)
            .events('change')
            .map(ev => ev.target.value)
            .startWith(0)
    ));

    return {
        DOM: rxjs.Observable.combineLatest(
            imgSrc$.startWith(null),
            outputResolution$,
            outputPixelSize$,
            inputPreviewImageBackgroundColor$,
            (imgSrc, outputResolution, outputPixelSize, inputPreviewImageBackgroundColor) => main([
            section('#input', [
                div('.file-input', [
                    label({attrs: {for: 'image-file-input'}}, "Input image: "),
                    input('#image-file-input', {attrs: {type: 'file', accept: 'image/*'}}),
                ]),
                div('.preview', [
                    img({attrs: {src: imgSrc || undefined}}),
                    canvas({attrs: {
                        width: 480,
                        height: 480,
                        style: `background-color: ${makeRgbaString(...inputPreviewImageBackgroundColor)}`,
                    }}),
                    div('.background-color', [
                        label('Background color:'),
                        div('.color-component-input.color-component-red', [
                            label('R'),
                            input({attrs: {type: 'number', min: 0, max: 255, value: inputPreviewImageBackgroundColor[0]}})
                        ]),
                        div('.color-component-input.color-component-green', [
                            label('G'),
                            input({attrs: {type: 'number', min: 0, max: 255, value: inputPreviewImageBackgroundColor[1]}})
                        ]),
                        div('.color-component-input.color-component-blue', [
                            label('B'),
                            input({attrs: {type: 'number', min: 0, max: 255, value: inputPreviewImageBackgroundColor[2]}})
                        ]),
                        div('.color-component-input.color-component-alpha', [
                            label('A'),
                            input({attrs: {type: 'number', min: 0, max: 255, value: inputPreviewImageBackgroundColor[3]}})
                        ]),
                    ])
                ]),
            ]),
            section('#output', [
                div('.output-param', [
                    label({attrs: {for: 'output-resolution'}}, "Output resolution:"),
                    input('#output-resolution', {attrs: {type: 'number', required: true, min: 1, value: outputResolution}}),
                ]),
                div('.output-param', [
                    label({attrs: {for: 'output-pixel-size'}}, "Output pixel size:"),
                    input('#output-pixel-size', {attrs: {type: 'number', required: true, min: 1, value: outputPixelSize}}),                    
                ]),
                section('#algos', algorithms.map(algo => 
                    div('.algo', [
                        canvas({attrs: {title: algo.name}}),
                    ])
                )),
            ]),
        ])),
        sideEffect: rxjs.Observable.merge(
            image$.map(image => ({
                func: (image) => {
                    const canvas = document.querySelector('#input .preview canvas');
                    const ctx = canvas.getContext('2d');
                    transferImageToCanvas(image, ctx);
                },
                args: [image],
            })),
            ...algorithms.map(algo => rxjs.Observable.combineLatest(image$, outputResolution$, outputPixelSize$)
                .map(([image, resolution, pixelSize]) => {
                    const canvasElement = document.querySelector(`canvas[title="${algo.name}"`);
                    const ctx = canvasElement.getContext('2d');
        
                    transferImageToCanvas(image, ctx);
                    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
                    ctx.canvas.width = ctx.canvas.height = resolution * pixelSize;
                    console.log("running algo:", algo.name);
                    const colors = algo.func(imageData, resolution);
                    colors.forEach((row, v) => row.forEach((color, h) => {
                        ctx.fillStyle = makeRgbaString(...color);
                        ctx.fillRect(h * pixelSize, v * pixelSize, pixelSize, pixelSize);
                    }));
                })
            ),
        ),
    };
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('head').appendChild(require('./style').createStyleElement());

    run(app, {
        DOM: makeDOMDriver('body'),
        sideEffect: funcAndArgs$ => { adapt(funcAndArgs$).subscribe(({func, args}) => func(...args)); }
    });
});
