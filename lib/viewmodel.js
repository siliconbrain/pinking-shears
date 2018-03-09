function BlockView({block}) {

}

function ConstellationView({constellation}) {
    return {
        blocks: constellation.blocks.map(block => BlockView({block})),
    }
}

module.exports = {
    BlockView,
    ConstellationView,
};