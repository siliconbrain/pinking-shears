const {div, header, input, main, makeDOMDriver, section, svg} = require('@cycle/dom');
const {run} = require('@cycle/rxjs-run');
const {adapt} = require('@cycle/run/lib/adapt');
const rxjs = require('rxjs');

const A = require('./lib/array');
const C = require('./lib/color');
const components = require('./lib/components');
const F = require('./lib/functional');
const I = require('./lib/interactive');
const invariant = require('./lib/invariant');
const model = require('./lib/model');

function log(value) { console.log(value); }

const blueprints = [
    model.BlockBlueprint({
        name: "Image file",
        description: "Select an image file",
        outputs: [
            model.Output({
                name: "image",
            }),
        ],
        properties: [
            model.Property({
                name: "file",
            })
        ],
    }),
    model.BlockBlueprint({
        name: "Canvas",
        description: "Canvas to display image data on",
        inputs: [
            model.Input({
                name: "image data",
            }),
        ],
    })
];

const imageFileBlock = model.Block({blueprint: blueprints[0]});
const canvasBlock = model.Block({blueprint: blueprints[1]});

const constellation = model.Constellation({
    blocks: [
        imageFileBlock,
        canvasBlock,
    ],
    connections: [
        model.Connection({
            source: model.Junction({block: imageFileBlock, slot: 0}),
            destination: model.Junction({block: canvasBlock, slot: 0}),
        }),
    ],
});

function InputComponent({domSource, input}) {
    return {
        vdom$: rxjs.Observable.of(input.name),
    };
}

function OutputComponent({domSource, output}) {
    return {
        vdom$: rxjs.Observable.of(output.name),
    };
}

function BlockComponent({domSource, block}) {
    const blockDomSource = domSource.select(`.block[name="${block.blueprint.name}"]`);
    const inputsDomSource = blockDomSource.select('.inputs');
    const outputsDomSource = blockDomSource.select('.outputs');
    const inputs = block.blueprint.inputs.map(input => InputComponent({domSource: inputsDomSource, input}));
    const outputs = block.blueprint.outputs.map(output => OutputComponent({domSource: outputsDomSource, output}));
    const selected$ = blockDomSource.element()
        .map(element => element.classList.contains('selected'))
        .distinctUntilChanged();
    const dragging$ = rxjs.Observable.merge(
        blockDomSource.events('mousedown').map(ev => ev.preventDefault() || true),
        blockDomSource.events('mouseup').map(() => false),
        blockDomSource.events('mouseleave').map(() => false),
    ).startWith(false);
    const movement$ = blockDomSource.events('mousemove')
        .map(ev => ({x: ev.movementX, y: ev.movementY}));
    const draggingMovement$ = rxjs.Observable.combineLatest(selected$, dragging$, movement$)
        .filter(([selected, dragging]) => selected && dragging)
        .map(([_selected, _dragging, movement]) => movement);
    const position$ = draggingMovement$.scan(
        (currentPosition, translation) => ({
            x: currentPosition.x + translation.x,
            y: currentPosition.y + translation.y,
        }), {x: 0, y: 0}).startWith({x: 0, y: 0});

    blockDomSource.events('click').map(ev => (ev.stopPropagation(), document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected')), ev.ownerTarget.classList.add('selected'))).subscribe();

    return {
        vdom$: rxjs.Observable.combineLatest(
            position$,
            inputs.length > 0 ? rxjs.Observable.combineLatest(inputs.map(({vdom$}) => vdom$)) : rxjs.Observable.of([]),
            outputs.length > 0 ? rxjs.Observable.combineLatest(outputs.map(({vdom$}) => vdom$)) : rxjs.Observable.of([]),
        ).map(([position, inputVDoms, outputVDoms]) => div('.block', {
            attrs: {
                name: block.blueprint.name,
                style: position && `left: ${position.x}; top: ${position.y};`,
            },
        }, [
            header([block.blueprint.name]),
            div('.slots', [
                section('.inputs', inputVDoms),
                section('.outputs', outputVDoms),
            ]),
        ])),
    };
}

function ConnectionComponent({domSource, connection}) {
    return {
        vdom$: rxjs.Observable.of(div()),
    };
}

function ConstellationComponent({domSource, constellation}) {
    const constellationDomSource = domSource.select('.constellation');
    const blocks = constellation.blocks.map(block => BlockComponent({
        domSource: constellationDomSource,
        block,
    }));
    const connections = constellation.connections.map(connection => ConnectionComponent({
        domSource: constellationDomSource,
        connection,
    }));
    return {
        vdom$: rxjs.Observable.combineLatest(
            rxjs.Observable.combineLatest(...blocks.map(({vdom$}) => vdom$)),
            rxjs.Observable.combineLatest(...connections.map(({vdom$}) => vdom$)),
        ).map(([blockVDoms, connectionVDoms]) => div('.constellation', [
                ...blockVDoms,
                ...connectionVDoms,
            ])),
    };
}

function app({DOM}) {
    const constellationComponent = ConstellationComponent({domSource: DOM.select('#workspace'), constellation});
    DOM.select('document').events('click').do(() => document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'))).subscribe();
    return {
        DOM: constellationComponent.vdom$.map(constellationVDom => main('#workspace', [constellationVDom])),
        sideEffect: rxjs.Observable.empty(),
    };
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('head').appendChild(require('./style').createStyleElement());

    run(app, {
        DOM: makeDOMDriver('body'),
        sideEffect: funcAndArgs$ => { adapt(funcAndArgs$).subscribe(({func, args}) => func(...args)); }
    });
});
