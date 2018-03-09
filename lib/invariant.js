function InvariantViolationError(message) {
    this.name = 'InvariantViolationError';
    this.message = message;
    this.stack = (new Error()).stack;
}
InvariantViolationError.prototype = new Error;

module.exports = function(condition, message, values) {
    if (!condition) {
        console.error("Invariant violated:", message, values);
        throw new InvariantViolationError(message);
    }
};