function isImageValid(imageElement) {
    return imageElement.naturalWidth !== 0 && imageElement.naturalHeight !== 0;
}

function transferImageToCanvas(imageElement, canvasContext) {
    const image = {
        width: imageElement.naturalWidth,
        height: imageElement.naturalHeight
    };
    
    const size = Math.max(image.height, image.width);
    const canvas = canvasContext.canvas;
    canvas.width = canvas.height = size;

    const offsetX = (size - image.width) / 2;
    const offsetY = (size - image.height) / 2;
    
    canvasContext.drawImage(imageElement, offsetX, offsetY);
}

function tupleToRgbaString(tuple) {
    const filler = [0, 0, 0, 255].slice(tuple.length);
    return 'rgba(' + Array.from(tuple).concat(filler).join(',') + ')';
}

function makeArea(left, top, width, height) {
    return {left, top, width, height};
}

function* colorsIn(imageData, area) {
    for (var v = area.top; v < Math.min(imageData.height, area.top + area.height); v++) {
        for (var h = area.left; h < Math.min(imageData.width, area.left + area.width); h++) {
            const offset = (v * imageData.width) + h;
            yield imageData.data.slice((offset + 0) * 4, (offset + 1) * 4);
        }
    }
}

function sampleRectangleSize(imageData, resolution) {
    return {
        width: Math.max(1, Math.floor(imageData.width / resolution)),
        height: Math.max(1, Math.floor(imageData.height / resolution))
    };
}

function makeTileSampledAlgo(coreFn) {
    return function(imageData, resolution) {
        const sampleRect = sampleRectangleSize(imageData, resolution);
    
        const result = [];
        for (var v = 0; v < resolution; v++) {
            const row = [];
            for (var h = 0; h < resolution; h++) {
                const sampleArea = makeArea(h * sampleRect.width, v * sampleRect.height, sampleRect.width, sampleRect.height);
                const colors = colorsIn(imageData, sampleArea);
                const color = coreFn(colors);
                row.push(color);
            }
            result.push(row);
        }
        return result;
    };
}

function frequencies(values, equality) {
    if (equality) {
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
    } else {
        const frequencies = {};
        for (const value of values) {
            const count = frequencies[value];
            frequencies[value] = (count || 0) + 1;
        }
        return Object.entries(frequencies);
    }
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

function max(iterable, compareFunction) {
    compareFunction = compareFunction || function(a, b) { return a - b; };
    var result = undefined;
    for (const value of iterable) {
        if (result === undefined || compareFunction(result, value) < 0) {
            result = value;
        }
    }
    return result;
}

function min(iterable, compareFunction) {
    compareFunction = compareFunction || function(a, b) { return a - b; };
    var result = undefined;
    for (const value of iterable) {
        if (result === undefined || compareFunction(result, value) > 0) {
            result = value;
        }
    }
    return result;
}

const algorithms = [
    {
        name: "first color in tile",
        func: makeTileSampledAlgo(function(colors) { return colors.next().value; })
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
        func: makeTileSampledAlgo(function(colors) {
            var cnt = 0, sum = [0, 0, 0, 0];
            for (const color of colors) {
                cnt++;
                color.forEach((v ,i) => { sum[i] += v; });
            }
            return sum.map(v => Math.floor(v / cnt));
        })
    },
];

document.addEventListener('DOMContentLoaded', function() {
    const imageFileInput = document.getElementById('image-file');
    const resolutionInput = document.getElementById('resolution');
    const pixelSizeInput = document.getElementById('pixel-size');
    const imagePreview = document.getElementById('image-preview');
    const algosSection = document.getElementById("algos");

    function redraw() {
        if (!isImageValid(imagePreview)) return;

        const resolution = parseInt(resolutionInput.value);
        const pixelSize = parseInt(pixelSizeInput.value);

        algorithms.forEach(({name, func}, idx) => {
            let canvasElement = algos.getElementsByTagName('canvas')[idx];
            if (canvasElement === undefined) {
                canvasElement = document.createElement('canvas');
                canvasElement.dataset.name = name;
                canvasElement.title = name;
                algosSection.appendChild(canvasElement);
            }
            const ctx = canvasElement.getContext('2d');

            transferImageToCanvas(imagePreview, ctx);
            const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.canvas.width = ctx.canvas.height = resolution * pixelSize;
            console.log("running algo:", name);
            const colors = func(imageData, resolution);
            colors.forEach((row, v) => row.forEach((color, h) => {
                ctx.fillStyle = tupleToRgbaString(color);
                ctx.fillRect(h * pixelSize, v * pixelSize, pixelSize, pixelSize);
            }));
        });
    }

    imagePreview.addEventListener('load', redraw);
    resolutionInput.addEventListener('change', redraw);
    pixelSizeInput.addEventListener('change', redraw);

    imageFileInput.addEventListener('change', function() {
        if (imageFileInput.files.length > 0) {
            imagePreview.src = URL.createObjectURL(imageFileInput.files[0]);
        }
    })
});
