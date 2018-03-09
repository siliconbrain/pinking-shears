const {div, main, makeDOMDriver, svg} = require('@cycle/dom');
const {run} = require('@cycle/rxjs-run');
const {adapt} = require('@cycle/run/lib/adapt');
const rxjs = require('rxjs');

const A = require('./lib/array');
const C = require('./lib/color');
const components = require('./lib/components');
const F = require('./lib/functional');
const {Point} = require('./lib/geometry');
const I = require('./lib/interactive');
const invariant = require('./lib/invariant');
const model = require('./lib/model');
const rx = require('./lib/reactive');
const {log} = require('./lib/util');
const V = require('./lib/vector');
const vm = require('./lib/viewmodel');

const blueprints = [
    model.BlockBlueprint({
        id: 'scalar-constant',
        name: "Scalar constant",
        description: "This block lets you specify a scalar constant",
        outputs: [
            model.Output({
                id: 'value',
                name: "value",
            }),
        ],
        properties: [
            model.Property({
                id: 'value',
                name: "value",
            }),
        ],
    }),
    model.BlockBlueprint({
        id: 'image-file',
        name: "Image file",
        description: "This block lets you select an image file",
        outputs: [
            model.Output({
                id: 'image-data',
                name: "image data",
            }),
        ],
        properties: [
            model.Property({
                id: 'file',
                name: "file",
            })
        ],
    }),
    model.BlockBlueprint({
        id: 'canvas',
        name: "Canvas",
        description: "A canvas to display image data on",
        inputs: [
            model.Input({
                id: 'image-data',
                name: "image data",
            }),
        ],
    }),
    model.BlockBlueprint({
        id: 'scalar-add',
        name: "Scalar addition",
        description: "This block lets you add two scalar values together",
        inputs: [
            model.Input({
                id: 'lhs',
                name: "left-hand side",
            }),
            model.Input({
                id: 'rhs',
                name: "right-hand side",
            }),
        ],
        outputs: [
            model.Output({
                id: 'result',
                name: "result",
            }),
        ],
    }),
];

const constellation = model.Constellation({});

function app({DOM}) {
    const constellationView = vm.ConstellationView({
        parentDomSource: DOM.select('#workspace'),
        constellation,
        blueprints
    });
    function onBlueprintDragStart(blueprintId, ev) {
        ev.dataTransfer.setData('application/prs.pinking-shears.blueprint-id+text', blueprintId);
        ev.dataTransfer.dropEffect = "copy";
    }
    return {
        DOM: constellationView.vnode$.map(constellationVNode => main([
            div('#toolbar', [
                div('#blueprints', [
                    ...blueprints.map(blueprint => div('.blueprint', {
                        attrs: {
                            'draggable': 'true',
                            'title': blueprint.description,
                        },
                        on: {
                            'dragstart': [onBlueprintDragStart, blueprint.id],
                        }
                    }, [
                        blueprint.name
                    ])),
                ])
            ]),
            div('#workspace', [constellationVNode]),
            div('#details'),
        ])),
        selector: rxjs.Observable.merge(
            DOM.select('#workspace').events('click').map(() => null),
            constellationView.selector$,
        ),
    };
}

function domElementSelectorDriver(tag = 'selected') {
    return (selector$) => {
        adapt(selector$).subscribe(selector => {
            document.querySelectorAll(`.${tag}`).forEach(element => { element.classList.remove(tag); });
            document.querySelectorAll(selector).forEach(element => { element.classList.add(tag); });
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('head').appendChild(require('./style').createStyleElement());

    run(app, {
        DOM: makeDOMDriver('body', {
            modules: [
                require('snabbdom/modules/attributes').default,
                require('snabbdom/modules/class').default,
                require('snabbdom/modules/dataset').default,
                require('snabbdom/modules/eventlisteners').default,
                require('snabbdom/modules/props').default,
            ]
        }),
        selector: domElementSelectorDriver(),
        dragger: domElementSelectorDriver('dragged'),
    });
});