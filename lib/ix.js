const operators = require('./ix/operators');

function pipe(...stages) {
    var val = stages.shift();
    while (stages.length > 0) val = (stages.shift())(val);
    return val;
}

module.exports = {
    operators,
    ops: operators,
    pipe,
}