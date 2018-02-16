(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
function makeIterable(iteratorFactory) {
    const iterable = {
        [Symbol.iterator]: iteratorFactory
    };
    iterable.filter = (predicate) => filter(iterable, predicate);
    iterable.first = () => first(iterable);
    iterable.flatMap = (func) => flatMap(iterable, func);
    iterable.fold = (initial) => (func) => fold(iterable, initial, func);
    iterable.forEach = (func) => forEach(iterable, func);
    iterable.isEmpty = () => isEmpty(iterable);
    iterable.map = (func) => map(iterable, func);
    iterable.reduce = (func, seed) => reduce(iterable, func, seed);
    iterable.skip = (count) => skip(iterable, count);
    iterable.take = (count) => take(iterable, count);
    iterable.zip = (...iterables) => zip(iterable, ...iterables);
    return iterable;
}

function enumerate(iterable) {
    return makeIterable(function*() {
        var i = 0;
        for (const val of iterable) yield [val, i++];
    });
}

function filter(iterable, predicate) {
    return makeIterable(function*() {
        for (const [val, i] of enumerate(iterable))
            if (predicate(val, i)) yield val;
    })
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

function isEmpty(iterable) {
    for (const _ of iterable) return false;
    return true;
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

function skip(iterable, count) {
    return makeIterable(function*() {
        for (const [val, i] of enumerate(iterable)) {
            if (i < count) continue;
            else yield val;
        }
    });
}

function take(iterable, count) {
    return makeIterable(function*() {
        for (const [val, i] of enumerate(iterable)) {
            if (i < count) yield val;
            else break;
        }
    });
}

function* iterationsOf(iterators) {
    while (true) yield iterators.map(iterator => iterator.next());
}

function zip(...iterables) {
    return makeIterable(function*(){
        const iterators = iterables.map(iterable => iterable[Symbol.iterator]());
        for (const iteration of iterationsOf(iterators)) {
            if (iteration.some(({done}) => done)) break;
            else yield iteration.map(({value}) => value);
        }
    });
}

function zipWith(func, ...iterables) {
    return map(zip(...iterables), (values, i) => func(...values, i));
}

module.exports = {
    enumerate,
    filter,
    first,
    flatMap,
    fold,
    forEach,
    isEmpty,
    makeIterable,
    map,
    range,
    reduce,
    skip,
    take,
    zip,
    zipWith,
};
},{}],2:[function(require,module,exports){
const L = require('./lazy');

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
    document.querySelector('head').appendChild(require('./style').createStyleElement());
    
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

},{"./lazy":1,"./style":5}],3:[function(require,module,exports){
const package = require('./package.json');

const ZeroArgumentsMessage = `No arguments provided.`;

function parseRule() {
    if (arguments.length < 1) throw new Error(ZeroArgumentsMessage);
    if (arguments.length === 1) {
        if (typeof arguments[0] === 'string') {
            throw new Error("No declarations provided.");
        }
    }

    let selectors = [...arguments].slice(0, -1);

    let declarations = arguments[arguments.length - 1];
    if (Array.isArray(declarations)) {
        declarations = Object.assign({}, ...declarations);
    }
    declarations = Object.keys(declarations).map(property => {
        return ({
            property,
            value: declarations[property],
        });
    });

    return {
        selectors,
        declarations,
    };
}

function makeNestedRuleBuilderCtor(base, rules) {
    return function _makeNestedRuleBuilder(selector, assembler) {
        if (selector === undefined || selector === '') {
            throw new Error(`A selector must be provided for the nested rules.`);
        }

        if (assembler === undefined || typeof assembler !== 'function') {
            throw new Error(`An assembler function must be provided for the nested rules.`);
        }

        const builder = {};
        
        builder.rule = function() {
            const rule = parseRule(...arguments);

            if (rule.selectors.length === 0) {
                rule.selectors = [selector];
            } else {
                rule.selectors = rule.selectors.map((nestedSelector) => `${selector} ${nestedSelector}`);
            }

            rules.push(rule);

            return builder;
        };
        builder.r = builder.rule;

        builder.nest = function(innerSelector, innerAssembler) {
            return makeNestedRuleBuilderCtor(builder, rules)(`${selector} ${innerSelector}`, innerAssembler);
        };
        builder.n = builder.nest;
        
        assembler(builder);

        return base;
    };
}

module.exports.makeStyleSheet = function() {
    let _imports = [];
    let _rules = [];

    const styleSheet = {};

    styleSheet.rule = function() {
        const rule = parseRule(...arguments);

        if (rule.selectors.length === 0) {
            rule.selectors = ['*'];
        }

        _rules.push(rule);

        return styleSheet;
    };
    styleSheet.r = styleSheet.rule;

    styleSheet.import = function() {
        if (arguments.length < 1) throw new Error(ZeroArgumentsMessage);
        
        const url = arguments[0];

        let mediaQueries = [...arguments].slice(1);

        _imports.push({
            url,
            mediaQueries,
        });

        return styleSheet;
    };
    styleSheet.i = styleSheet.import;

    styleSheet.nest = makeNestedRuleBuilderCtor(styleSheet, _rules);
    styleSheet.n = styleSheet.nest;

    styleSheet.renderCSS = function(signature) {
        let result = '';
        const print = function (value) {
            result = result.concat(value);
        }

        if (signature !== null) {
            if (signature === undefined) {
                signature = `Generated with ${package.name} (${package.version}).` 
            }
            print(`/* ${signature} */\n\n`);
        }
        _imports.forEach(importRule => {
            print(`@import url("${importRule.url}")`);
            if (importRule.mediaQueries.length !== 0)
                print(` ${importRule.mediaQueries.join(`, `)}`);
            print(`;\n`);
        });
        print(`\n`);
        _rules.forEach(rule => {
            print(rule.selectors.join(',\n') + '\n{\n');
            rule.declarations.forEach(declaration => {
                print(`\t${declaration.property}: ${declaration.value};\n`)
            });
            print('}\n\n');
        });

        return result;
    }

    return styleSheet;
}

},{"./package.json":4}],4:[function(require,module,exports){
module.exports={
  "_from": "fluent-style-sheets",
  "_id": "fluent-style-sheets@1.0.1",
  "_inBundle": false,
  "_integrity": "sha1-jtZsNFZGAFH4hw7+zS0IFNv6Mgg=",
  "_location": "/fluent-style-sheets",
  "_phantomChildren": {},
  "_requested": {
    "type": "tag",
    "registry": true,
    "raw": "fluent-style-sheets",
    "name": "fluent-style-sheets",
    "escapedName": "fluent-style-sheets",
    "rawSpec": "",
    "saveSpec": null,
    "fetchSpec": "latest"
  },
  "_requiredBy": [
    "#USER",
    "/"
  ],
  "_resolved": "https://registry.npmjs.org/fluent-style-sheets/-/fluent-style-sheets-1.0.1.tgz",
  "_shasum": "8ed66c3456460051f8870efecd2d0814dbfa3208",
  "_spec": "fluent-style-sheets",
  "_where": "/home/siliconbrain/projects/pinking-shears",
  "author": {
    "name": "Dudás Ádám",
    "email": "sir.dudas.adam@gmail.com"
  },
  "bugs": {
    "url": "https://github.com/siliconbrain/fluent-style-sheets/issues"
  },
  "bundleDependencies": false,
  "deprecated": false,
  "description": "Define your CSS in JavaScript with a fluent API.",
  "homepage": "https://github.com/siliconbrain/fluent-style-sheets#readme",
  "keywords": [
    "css",
    "js",
    "javascript",
    "style sheet",
    "edsl",
    "fluent"
  ],
  "license": "MIT",
  "main": "index.js",
  "name": "fluent-style-sheets",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/siliconbrain/fluent-style-sheets.git"
  },
  "scripts": {
    "test": "echo Sorry, there are not tests yet. Someone should really write some... :)"
  },
  "version": "1.0.1"
}

},{}],5:[function(require,module,exports){
const {makeStyleSheet} = require('fluent-style-sheets');

const styleSheet = makeStyleSheet()
.r('html', {
    'background-color': 'rgb(191,191,191)',
    'font-family': 'sans-serif',
    'font-size': '11pt',
})
.r('#input-image-preview', '.algo canvas', {
    'border': '1px solid #888',
    'margin': '0.5em',
})
.r('#controls input', {
    'margin': '0.5em 0',
})
.r('#input-image-preview', {
    'background-color': 'fuchsia',
    'height': '480px',
    'object-fit': 'contain',
    'width': '480px',
})
.r('#output-resolution', '#output-pixel-size', {
    'width': '46px',
})
.r('.algo', {
    'display': 'inline-block',
});

module.exports = {
    styleSheet,
    createStyleElement: () => {
        const styleElement = document.createElement('style');
        styleElement.innerHTML = styleSheet.renderCSS();
        return styleElement;
    }
};
},{"fluent-style-sheets":3}]},{},[2]);
