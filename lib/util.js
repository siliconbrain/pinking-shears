function areDefined(...values) { return values.every(isDefined); }

function firstDefinedOf(...args) {
    for (const value of args) {
        if (isDefined(value)) return value;
    }
    return undefined;
}

function isDefined(value) { return value !== undefined; }

function log(tag = undefined) {
    return (...args) => { if (isDefined(tag)) console.log(tag, ...args); else console.log(...args); };
}

module.exports = {
    areDefined,
    firstDefinedOf,
    isDefined,
    log,
}