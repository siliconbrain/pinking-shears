function Input({name, description = undefined}) {
    return {
        name,
        description,
    };
}

function Output({name, description = undefined}) {
    return {
        name, description,
    };
}

function Property({name, description = undefined, defaultValue = undefined}) {
    return {
        name, description,
    };
}

function BlockBlueprint({
    name, description = undefined, inputs = [], outputs = [], properties = []
}) {

    return {
        name, description, inputs, outputs, properties,
    };
}

function Block({blueprint}) {
    return {
        blueprint,
    };
}

function Junction({block, slot}) {
    return {
        block,
        slot,
    };
}

function Connection({source, destination}) {
    return {
        source,
        destination,
    };
}

function Constellation({blocks, connections}) {
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