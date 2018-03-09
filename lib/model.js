function Slot({id, name, description = undefined}) {
    return {
        id, name, description,
    };
}

Slot.equality = function(lhs, rhs) {
    return lhs.id === rhs.id;
};

function Input({id, name, description = undefined}) {
    return Slot({id, name, description});
}

function Output({id, name, description = undefined}) {
    return Slot({id, name, description});
}

function Property({id, name, description = undefined, defaultValue = undefined}) {
    return {
        id, name, description,
    };
}

function BlockBlueprint({
    id, name, description = undefined, inputs = [], outputs = [], properties = []
}) {

    return {
        id, name, description, inputs, outputs, properties,
    };
}

function Block({id, blueprint}) {
    return {
        id, blueprint,
    };
}

Block.equality = function(lhs, rhs) {
    return lhs.id === rhs.id;
};

function Junction({block, slot}) {
    return {
        block, slot,
    };
}

Junction.equality = function(lhs, rhs) {
    return Block.equality(lhs.block, rhs.block) && Slot.equality(lhs.slot, rhs.slot);
};

function Connection({source, target}) {
    return {
        source,
        target,
    };
}

Connection.equality = function(lhs, rhs) {
    return Junction.equality(lhs.source, rhs.source) && Junction.equality(lhs.target, rhs.target);
};

function Constellation({blocks = [], connections = []}) {
    return {
        blocks,
        connections,
    };
}

module.exports = {
    Block,
    BlockBlueprint,
    Connection,
    Constellation,
    Input,
    Junction,
    Output,
    Property,
};