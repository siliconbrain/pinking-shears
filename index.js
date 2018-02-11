function isImageValid(imageElement) {
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

function createAlgoElements(algoName) {
    const container = document.createElement('div');
    container.classList.add('algo');
    const canvas = document.createElement('canvas');
    canvas.dataset.name = canvas.title = algoName;
    container.appendChild(canvas);
    return container;
}

document.addEventListener('DOMContentLoaded', function() {
    const inputImageFileElement = document.getElementById('input-image-file');
    const outputResolutionElement = document.getElementById('output-resolution');
    const outputPixelSizeElement = document.getElementById('output-pixel-size');
    const inputImagePreviewElement = document.getElementById('input-image-preview');
    const algosSection = document.getElementById("algos");

    function redraw() {
        if (!isImageValid(inputImagePreviewElement)) return;

        const resolution = parseInt(outputResolutionElement.value);
        const pixelSize = parseInt(outputPixelSizeElement.value);

        algorithms.forEach(({name, func}, idx) => {
            let algoElement = algosSection.getElementsByClassName('algo')[idx];
            if (algoElement === undefined) {
                algoElement = createAlgoElements(name);
                algosSection.appendChild(algoElement);
            }
            const canvasElement = algoElement.getElementsByTagName('canvas')[0];
            const ctx = canvasElement.getContext('2d');

            transferImageToCanvas(inputImagePreviewElement, ctx);
            const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.canvas.width = ctx.canvas.height = resolution * pixelSize;
            console.log("running algo:", name);
            const colors = func(imageData, resolution);
            colors.forEach((row, v) => row.forEach((color, h) => {
                ctx.fillStyle = makeRgbaString(...color);
                ctx.fillRect(h * pixelSize, v * pixelSize, pixelSize, pixelSize);
            }));
        });
    }

    inputImagePreviewElement.addEventListener('load', redraw);
    outputResolutionElement.addEventListener('change', redraw);
    outputPixelSizeElement.addEventListener('change', redraw);

    inputImageFileElement.addEventListener('change', function() {
        if (inputImageFileElement.files.length > 0) {
            inputImagePreviewElement.src = URL.createObjectURL(inputImageFileElement.files[0]);
        }
    })
});
