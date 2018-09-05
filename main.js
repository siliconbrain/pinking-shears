const rxjs = require('rxjs');
const {BehaviorSubject, combineLatest, from, fromEvent, Observable, Subject} = rxjs;
const rxjs_operators = require('rxjs/operators');
const {filter, skip, startWith, switchMap, map, tap} = rxjs_operators;

const C = require('./lib/color');
const ix = require('./lib/ix');
const V = require('./lib/vector');

function fromMutation(target, options) {
    return new Observable(observer => {
        const mutationObserver = new MutationObserver(
            mutations => mutations.forEach(mutation => observer.next(mutation))
        );
        mutationObserver.observe(target, options);
        return () => mutationObserver.disconnect();
    });
}

function createElement(tag) {
    return ({attrs = {}, on = {}} = {}) => {
        const elem = document.createElement(tag);
        Object.entries(attrs).forEach(([attr, value]) => {
            if (value !== undefined) elem[attr] = value;
        });
        Object.entries(on).forEach(([event, listener]) => { elem.addEventListener(event, listener); });
        return elem;
    }
}

const dom = [
    'canvas',
    'div',
    'img',
    'input',
].reduce((obj, tag) => { obj[tag] = createElement(tag); return obj; }, {});

function createInputImage() {
    const inputElement = dom.input({
        attrs: {
            accept: 'image/*',
            type: 'file',
        },
    });
    const subject = new BehaviorSubject(undefined);
    fromEvent(inputElement, 'change').pipe(
        map(ev => ev.target.files),
        filter(files => files.length > 0),
        map(files => files[0]),
        map(file => URL.createObjectURL(file)),
        switchMap(fileUrl => from(new Promise((resolve, reject) => {
            dom.img({
                attrs: {
                    src: fileUrl,
                },
                on: {
                    load: ev => resolve(ev.target),
                }
            });
        }))),
        filter(isValidImage),
        map(getImageData),
    ).subscribe(subject);
    return {
        element: inputElement,
        sinks: {},
        sources: {
            imageData$: subject,
        },
    };
}

function createImageDataView() {
    const canvasElement = dom.canvas({
        attrs: {
            'style': 'image-rendering: pixelated;',
        },
    });
    const mutation$ = fromMutation(canvasElement, {attributes: true});
    const canvasWidth$ = mutation$.pipe(
        filter(mutation => mutation.attributeName === 'width'),
        map(mutation => mutation.target[mutation.attributeName]),
        startWith(canvasElement.width),
    );
    const canvasHeight$ = mutation$.pipe(
        filter(mutation => mutation.attributeName === 'height'),
        map(mutation => mutation.target[mutation.attributeName]),
        startWith(canvasElement.height),
    );
    const pixelSizeSubject = new BehaviorSubject(1);

    combineLatest(canvasWidth$, canvasHeight$, pixelSizeSubject).subscribe(
        ([canvasWidth, canvasHeight, pixelSize]) => {
            canvasElement.style.width = canvasWidth * pixelSize;
            canvasElement.style.height = canvasHeight * pixelSize;
        }
    );

    const imageDataSubject = new BehaviorSubject(
        canvasElement.getContext('2d').getImageData(0, 0, canvasElement.width, canvasElement.height)
    );

    imageDataSubject.pipe(
        skip(1),
    ).subscribe(imageData => {
        canvasElement.width = imageData.width;
        canvasElement.height = imageData.height;
        const ctx = canvasElement.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
    });

    return {
        element: canvasElement,
        sinks: {
            imageDataObs: imageDataSubject,
            pixelSizeObs: pixelSizeSubject,
        },
        sources: {
            imageData$: imageDataSubject,
        },
    }
}

function createIntegerControl({initialValue = 0, max = undefined, min = 0, step = 1} = {}) {
    const inputElement = dom.input({
        attrs: {
            max: max,
            min: min,
            required: true,
            step: step,
            type: 'number',
            value: initialValue,
        },
    });
    const subject = new BehaviorSubject(parseInt(inputElement.value));
    fromEvent(inputElement, 'change').pipe(
        map(ev => parseInt(ev.target.value)),
    ).subscribe(subject);
    return {
        element: inputElement,
        sinks: {},
        sources: {
            value$: subject,
        },
    }
}

const LexicographicOrder = {
    offsetOf: (...strides) => (...indices) => ix.pipe(
        ix.ops.lazy.zip(indices, strides.concat([1])),
        ix.ops.fold(0)((offset, [index, stride]) => (offset + index) * stride),
    ),
    indicesOf: (...strides) => (offset) => strides.reduceRight(({indices, offset}, stride) => ({
        indices: [offset % stride].concat(indices),
        offset: Math.floor(offset / stride)
    }), {indices: [], offset}).indices,
};

function pixelAt(imageData, offset) {
    const bytesPerPixel = C.COMPONENTS.length;

    if (offset < 0 || (offset + 1) * bytesPerPixel > imageData.data.byteLength) return;

    return imageData.data.subarray((offset + 0) * bytesPerPixel, (offset + 1) * bytesPerPixel);
}

function pixelAtCoords(imageData, x, y) {
    if (x < 0 || imageData.width <= x || y < 0 || imageData.height <= y) return;

    return pixelAt(imageData, LexicographicOrder.offsetOf(imageData.width)(y, x));
}

function pixelsIn(imageData, area = undefined) {
    const offsets = area === undefined ? ix.ops.lazy.range(0, imageData.height * imageData.width) : ix.pipe(
        ix.ops.lazy.product(
            ix.ops.lazy.range(area.top, Math.min(imageData.height, area.top + area.height)),
            ix.ops.lazy.range(area.left, Math.min(imageData.width, area.left + area.width)),
        ),
        ix.ops.lazy.map(([rowIdx, colIdx]) => LexicographicOrder.offsetOf(imageData.width)(rowIdx, colIdx)),
    );
    return ix.pipe(
        offsets,
        ix.ops.lazy.map(offset => pixelAt(imageData, offset)),
    );
}

function asUint32Array(typedArray) {
    return new Uint32Array(typedArray.buffer, typedArray.byteOffset, Math.trunc(typedArray.byteLength / 4));
}

function isValidImage(imageElement) {
    return imageElement.naturalWidth !== 0 && imageElement.naturalHeight !== 0;
}

function getImageData(imageElement) {
    const canvas = dom.canvas({
        attrs: {
            width: imageElement.naturalWidth,
            height: imageElement.naturalHeight,
        }
    });
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageElement, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function makeArea(left, top, width, height) {
    return {left, top, width, height};
}

function strictEquality(lhs, rhs) { return lhs === rhs; }
function looseEquality(lhs, rhs) { return lhs == rhs; }

function identity(value) { return value; }

function frequencies(values, keySelector = identity) {
    const frequencies = new Map();
    for (const value of values) {
        const key = keySelector(value);
        const item = frequencies.get(key) || {value, count: 0};
        item.count += 1;
        frequencies.set(key, item);
    }
    return Array.from(frequencies.values());
}

function gaussianBlur(imageData, kernelRadius) {
    const canvas = dom.canvas({
        attrs: {
            width: imageData.width,
            height: imageData.height,
        },
    });
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    ctx.filter = `blur(${kernelRadius}px)`;
    ctx.drawImage(canvas, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function pixelsToImage(pixels, width, height) {
    const result = new ImageData(width, height);
    ix.pipe(
        pixels,
        ix.ops.lazy.take(width * height),
        ix.ops.lazy.flatten,
        ix.ops.forEach((val, i) => { result.data[i] = val; }),
    );
    return result;
}

function makePalette(pixels, threshold) {
    const areClose = C.areClose(threshold);
    var rest = frequencies(pixels, C.asUint32).sort(({count: lhs}, {count: rhs}) => rhs - lhs);
    const groups = [];
    while (rest.length > 1) {
        const parts = ix.ops.strict.partition(({value}, i, weightedColors) => areClose(value, weightedColors[0].value))(rest);
        groups.push(parts[0]);
        rest = parts[1];
    }
    if (rest.length > 0) groups.push(rest);
    return groups.map(weightedColors => C.averageOfWeighted(weightedColors.map(({value, count}) => ({color: value, weight: count}))));
}

function closest(distanceFunc) {
    return (values) => {
        var rdist = Infinity;
        var result = undefined;
        for (const value of values) {
            const vdist = distanceFunc(value);
            if (vdist < rdist) {
                rdist = vdist;
                result = value;
            }
        }
        return result;
    }
}

function downsample(sourceImageData, targetWidth, targetHeight) {
    const vstep = sourceImageData.height / targetHeight;
    const hstep = sourceImageData.width / targetWidth;
    const rows = ix.ops.lazy.range(0, targetHeight);
    const cols = ix.ops.lazy.range(0, targetWidth);
    const targetPixels = ix.pipe(
        rows,
        ix.ops.lazy.flatMap(rowidx => ix.pipe(
            cols,
            ix.ops.lazy.map(colidx => makeArea(Math.floor(colidx * hstep), Math.floor(rowidx * vstep), Math.ceil(hstep), Math.ceil(vstep))),
        )),
        ix.ops.lazy.map(area => pixelsIn(sourceImageData, area)),
        ix.ops.lazy.map(C.averageOf),
    );
    return pixelsToImage(targetPixels, targetWidth, targetHeight);
}

function cloneImageData(imageData) {
    const result = new ImageData(imageData.width, imageData.height);
    result.data.set(imageData.data);
    return result;
}

const FloydSteinbergDiffusionMatrix = [
    /*    -             #     */ [1, 0, 7/16],
    [-1, 1, 3/16], [0, 1, 5/16], [1, 1, 1/16],
];

const JarvisJudiceNinkeDiffusionMatrix = [
    /*    -              -             #     */ [1, 0, 7/48], [2, 0, 5/48],
    [-2, 1, 3/48], [-1, 1, 5/48], [0, 1, 7/48], [1, 1, 5/48], [2, 1, 3/48],
    [-2, 2, 1/48], [-1, 2, 3/48], [0, 2, 5/48], [1, 2, 3/48], [2, 2, 1/48],
];

function palettizeWithErrorDiffusion(sourceImageData, palette, diffusionMatrix) {
    const result = cloneImageData(sourceImageData);
    ix.pipe(
        ix.ops.lazy.product(
            ix.ops.lazy.range(0, result.height),
            ix.ops.lazy.range(0, result.width),
        ),
        ix.ops.forEach(([rowidx, colidx]) => {
            const srcpix = pixelAtCoords(result, colidx, rowidx);
            const respix = closest(color => C.distanceOf(srcpix, color))(palette);
            const error = V.differenceOf(srcpix, respix);
            srcpix.set(respix);
            diffusionMatrix
                .map(([dx, dy, s]) => [pixelAtCoords(result, colidx + dx, rowidx + dy), s])
                .filter(([pix, s]) => pix)
                .forEach(([pix, s]) => pix.set(V.sumOf(pix, V.uniformScale(error, s))));
        }),
    )
    return result;
}

function thresholdMatrixToMap(thresholdMatrix) {
    return (colidx, rowidx) => {
        const row = thresholdMatrix[rowidx % thresholdMatrix.length];
        return row[colidx % row.length];
    };
}

function palettizeWithThresholdMap(sourceImageData, palette, thresholdMap) {
    const result = cloneImageData(sourceImageData);
    ix.pipe(
        ix.ops.lazy.product(
            ix.ops.lazy.range(0, result.height),
            ix.ops.lazy.range(0, result.width),
        ),
        ix.ops.forEach(([rowidx, colidx]) => {
            const threshold = thresholdMap(colidx, rowidx);
            const pixel = pixelAtCoords(result, colidx, rowidx);
            const closest2 = ix.ops.strict.partialSort(color => C.distanceOf(pixel, color))(2)(palette);
            const selected = closest2[(C.distanceOf(pixel, closest2[0]) / C.distanceOf(...closest2) < threshold) ? 0 : 1];
            pixel.set(selected);
        }),
    );
    return result;
}

window.rxjs = rxjs;
window.rxjs_ops = rxjs_operators;
window.ix = ix;
window.main = {
    asUint32Array,
    closest,
    createImageDataView,
    createInputImage,
    createIntegerControl,
    Color: C,
    diffusionMatrices: {
        FloydSteinbergDiffusionMatrix,
        JarvisJudiceNinkeDiffusionMatrix,
    },
    downsample,
    frequencies,
    gaussianBlur,
    makePalette,
    palettizeWithErrorDiffusion,
    palettizeWithThresholdMap,
    pixelsIn,
    pixelsToImage,
    thresholdMatrices: {
        '3x3': [
            [0/9, 7/9, 3/9],
            [6/9, 5/9, 2/9],
            [4/9, 1/9, 8/9],
        ],
        '8x8': [
            [0/64, 48/64, 12/64, 60/64, 3/64, 51/64, 15/64, 63/64],
            [32/64, 16/64, 44/64, 28/64, 35/64, 19/64, 47/64, 31/64],
            [8/64, 56/64, 4/64, 52/64, 11/64, 59/64, 7/64, 55/64],
            [40/64, 24/64, 36/64, 20/64, 43/64, 27/64, 39/64, 23/64],
            [2/64, 50/64, 14/64, 62/64, 1/64, 49/64, 13/64, 61/64],
            [34/64, 18/64, 46/64, 30/64, 33/64, 17/64, 45/64, 29/64],
            [10/64, 58/64, 6/64, 54/64, 9/64, 57/64, 5/64, 53/64],
            [42/64, 26/64, 38/64, 22/64, 41/64, 25/64, 37/64, 21/64],
        ],
    },
    thresholdMatrixToMap,
    V,
};

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('head').appendChild(require('./style').createStyleElement());
});
