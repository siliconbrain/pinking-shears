function InvariantViolationError(message) {
    this.name = 'InvariantViolationError';
    this.message = message;
    this.stack = (new Error()).stack;
}
InvariantViolationError.prototype = new Error;

module.exports = function(condition, message, ...params) {
    if (!condition) {
        console.error("Invariant violated:", message, ...params);
        throw new InvariantViolationError(message);
    }
};