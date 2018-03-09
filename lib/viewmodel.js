const { svg } = require('@cycle/dom');
const rxjs = require('rxjs');

const A = require('./array');
const { BoundingBox, Point, Size } = require('./geometry');
const invariant = require('./invariant');
const model = require('./model');
const rx = require('./reactive');
const { isDefined, log } = require('./util');
const V = require('./vector');

function getAbsoluteBoundingBox(element) {
    return BoundingBox.fromRect(element.getBoundingClientRect());
}

function getRelativeBoundingBox(element) {
    return BoundingBox.fromRect(element.getBBox());
}

function getAbsoluteBoundingBox$(element$) {
    return element$
        .map(getAbsoluteBoundingBox)
        .distinctUntilChanged(BoundingBox.equality);
}

function getRelativeBoundingBox$(element$) {
    return element$
        .map(getRelativeBoundingBox)
        .distinctUntilChanged(BoundingBox.equality);
}

function getAbsoluteBoundingBoxes$(elements$) {
    return elements$
        .map(elements => elements.map(getAbsoluteBoundingBox))
        .distinctUntilChanged(A.equality(BoundingBox.equality));
}

function getRelativeBoundingBoxes$(elements$) {
    return elements$
        .map(elements => elements.map(getRelativeBoundingBox))
        .distinctUntilChanged(A.equality(BoundingBox.equality));
}

function getOriginPoint(absoluteBoundingBox, relativeBoundingBox) {
    return Point(
        absoluteBoundingBox.left - relativeBoundingBox.left,
        absoluteBoundingBox.top - relativeBoundingBox.top
    );
}

function getChildren$(domSource) {
    return domSource.select('> *').elements();
}

const SvgTransform = {
    translate: function(x, y) {
        return `translate(${x} ${y})`;
    },
};

const AlignTo = {
    baseline: {},
    start: {},
    middle: {},
    end: {},
};

const Axis = {
    horizontal: 0,
    vertical: 1,
}

function getAlignmentOffset({alignTo, boundingBox, axis}) {
    switch (alignTo) {
        case AlignTo.baseline: return 0;
        case AlignTo.start: return -([boundingBox.left, boundingBox.top][axis]);
        case AlignTo.end: return -([boundingBox.right, boundingBox.bottom][axis]);
        case AlignTo.middle: return -(boundingBox.center[axis]);
    }
}

function StackLayout({direction, alignTo = AlignTo.baseline, spaceBetween = 0}) {
    invariant(Array.from(Object.values(Axis)).includes(direction), `Invalid value for direction.`, {direction});
    const primaryAxis = direction;
    const secondaryAxis = primaryAxis === Axis.horizontal ? Axis.vertical : Axis.horizontal;
    return {
        perform: function({vnodes, boxes}) {
            const offsets = boxes.reduce(({baseOffset, offsets}, box, i) => {
                const offset = [0, 0];
                offset[primaryAxis] = baseOffset - [box.left, box.top][primaryAxis];
                offset[secondaryAxis] = getAlignmentOffset({alignTo, boundingBox: box, axis: secondaryAxis});
                return {
                    baseOffset: baseOffset + box.size[primaryAxis] + spaceBetween,
                    offsets: offsets.concat([offset]),
                };
            }, {baseOffset: 0, offsets: []}).offsets;
            return vnodes.map((vnode, i) => svg.g({
                attrs: {
                    transform: offsets[i] && SvgTransform.translate(...offsets[i]),
                },
                dataset: boxes[i] && {
                    'bboxX': boxes[i].left,
                    'bboxY': boxes[i].top,
                    'bboxWidth': boxes[i].width,
                    'bboxHeight': boxes[i].height,
                },
            }, [vnode]));
        },
    };
}

function JunctionIcon({parentDomSource, radius}) {
    const ownDomSource = parentDomSource.select('.junction');
    const ownElement$ = ownDomSource.element();
    return {
        vnode$: rxjs.Observable.of(svg.circle('.junction', {
            attrs: {cx: 0, cy: 0, r: radius, },
        })),
        anchorAbsolutePosition$: getAbsoluteBoundingBox$(ownElement$).map(bbox => bbox.center),
        mouseDown$: ownDomSource.events('mousedown'),
        mouseUp$: ownDomSource.events('mouseup'),
    };
}

function InputView({parentDomSource, input, pendingConnection$}) {
    const ownDomSource = parentDomSource.select(`.input[name="${input.id}"]`);
    const junctionIcon = JunctionIcon({parentDomSource: ownDomSource, radius: 5, });
    const junctionPoint$ = junctionIcon.anchorAbsolutePosition$;
    return {
        model: input,
        vnode$: rxjs.Observable.combineLatest(
            junctionIcon.vnode$,
            getRelativeBoundingBoxes$(getChildren$(ownDomSource)),
            (junctionIconVNode, childrenBBoxes) => svg.g('.input', {
                attrs: {
                    name: input.id,
                },
            }, StackLayout({direction: Axis.horizontal, spaceBetween: 5}).perform({
                vnodes: [
                    junctionIconVNode,
                    svg.text({
                        attrs: {
                            'alignment-baseline': 'middle',
                        },
                    }, [input.name]),
                ],
                boxes: childrenBBoxes,
            }))
        ),
        junctionPoint$,
        initiateConnection$: junctionIcon.mouseDown$
            .do(ev => ev.stopPropagation())
            .map(() => ({target: {point$: junctionPoint$, slot: input}})),
        completeConnection$: junctionIcon.mouseUp$
            .do(ev => ev.stopPropagation())
            .map(() => ({target: {point$: junctionPoint$, slot: input}})),
    };
}

function InputsView({parentDomSource, inputs, pendingConnection$}) {
    const ownDomSource = parentDomSource.select('.inputs');
    const inputViews = inputs.map(input => InputView({
        parentDomSource: ownDomSource,
        input,
        pendingConnection$,
    }));
    return {
        vnode$: rxjs.Observable.combineLatest(
            rx.combineLatest0(...inputViews.map(({vnode$}) => vnode$)),
            getRelativeBoundingBoxes$(getChildren$(ownDomSource)),
            (inputVNodes, childrenBBoxes) => svg.g('.inputs', {
                attrs: {
                    transform: SvgTransform.translate(5, 0),
                },
            }, StackLayout({
                direction: Axis.vertical, spaceBetween: 5, alignTo: AlignTo.start,
            }).perform({vnodes: inputVNodes, boxes: childrenBBoxes, }))
        ),
        junctionPoint$s: inputViews.map(({model, junctionPoint$}) => ({id: model.id, junctionPoint$})),
        initiateConnection$: rxjs.Observable.merge(...inputViews.map(({initiateConnection$}) => initiateConnection$)),
        completeConnection$: rxjs.Observable.merge(...inputViews.map(({completeConnection$}) => completeConnection$)),
    };
}

function OutputView({parentDomSource, output, pendingConnection$}) {
    const ownDomSource = parentDomSource.select(`.output[name="${output.id}"]`);
    const junctionIcon = JunctionIcon({parentDomSource: ownDomSource, radius: 5, });
    const junctionPoint$ = junctionIcon.anchorAbsolutePosition$;
    return {
        model: output,
        vnode$: rxjs.Observable.combineLatest(
            junctionIcon.vnode$,
            getRelativeBoundingBoxes$(getChildren$(ownDomSource)),
            (junctionIconVNode, childrenBBoxes) => svg.g('.output', {
                attrs: {
                    name: output.id,
                },
            }, StackLayout({direction: Axis.horizontal, spaceBetween: 5}).perform({
                vnodes: [
                    svg.text({
                        attrs: {
                            'alignment-baseline': 'middle',
                        }
                    }, [output.name]),
                    junctionIconVNode,
                ],
                boxes: childrenBBoxes,
            }))
        ),
        junctionPoint$,
        initiateConnection$: junctionIcon.mouseDown$
            .do(ev => ev.stopPropagation())
            .map(() => ({source: {point$: junctionPoint$, slot: output}})),
        completeConnection$: junctionIcon.mouseUp$
            .do(ev => ev.stopPropagation())
            .map(() => ({source: {point$: junctionPoint$, slot: output}})),
    };
}

function OutputsView({parentDomSource, outputs, pendingConnection$}) {
    const ownDomSource = parentDomSource.select('.outputs');
    const outputViews = outputs.map(output => OutputView({
        parentDomSource: ownDomSource,
        output,
        pendingConnection$,
    }));
    return {
        vnode$: rxjs.Observable.combineLatest(
            rx.combineLatest0(...outputViews.map(({vnode$}) => vnode$)),
            getRelativeBoundingBoxes$(getChildren$(ownDomSource)),
            (outputVNodes, childrenBBoxes) => svg.g('.outputs', {
                attrs: {
                    transform: SvgTransform.translate(145, 0),
                },
            }, StackLayout({
                direction: Axis.vertical, spaceBetween: 5, alignTo: AlignTo.end,
            }).perform({vnodes: outputVNodes, boxes: childrenBBoxes, }))
        ),
        junctionPoint$s: outputViews.map(({model, junctionPoint$}) => ({id: model.id, junctionPoint$})),
        initiateConnection$: rxjs.Observable.merge(...outputViews.map(({initiateConnection$}) => initiateConnection$)),
        completeConnection$: rxjs.Observable.merge(...outputViews.map(({completeConnection$}) => completeConnection$)),
    };
}

function SlotsView({parentDomSource, block, slots, pendingConnection$}) {
    const ownDomSource = parentDomSource.select('.slots');
    const inputsView = InputsView({parentDomSource: ownDomSource, block, inputs: slots.inputs, pendingConnection$});
    const outputsView = OutputsView({parentDomSource: ownDomSource, block, outputs: slots.outputs, pendingConnection$});
    return {
        vnode$: rxjs.Observable.combineLatest(
            inputsView.vnode$,
            outputsView.vnode$,
            getRelativeBoundingBoxes$(getChildren$(ownDomSource)),
            (inputsVNode, outputsVNode, childrenBBoxes) => svg.g('.slots', StackLayout({
                direction: Axis.vertical, spaceBetween: 5,
            }).perform({vnodes: [inputsVNode, outputsVNode], boxes: childrenBBoxes, }))
        ),
        junctionPoint$s: {
            input: inputsView.junctionPoint$s,
            output: outputsView.junctionPoint$s,
        },
        initiateConnection$: rxjs.Observable.merge(inputsView.initiateConnection$, outputsView.initiateConnection$),
        completeConnection$: rxjs.Observable.merge(inputsView.completeConnection$, outputsView.completeConnection$),
    }
}

function BlockView({parentDomSource, block, mouseMovement$, initialTranslation = [0, 0], pendingConnection$}) {
    // console.log('Create: BlockView', block.id);
    const selector = `.block[name="${block.id}"]`;
    const ownDomSource = parentDomSource.select(selector);
    const slotsView = SlotsView({
        parentDomSource: ownDomSource,
        block,
        slots: {inputs: block.blueprint.inputs, outputs: block.blueprint.outputs},
        pendingConnection$,
    });
    const frontContentDomSource = ownDomSource.select('.front');
    const headerDomSource = ownDomSource.select('.header');
    const size$ = getRelativeBoundingBox$(frontContentDomSource.element())
        .map(({height}) => [150, height + 5])
        .startWith([150, 0]);
    const headerHeight = 30;
    const translation$ = headerDomSource.events('mousedown')
        .do(ev => ev.stopPropagation())
        .switchMap(ev => mouseMovement$.takeWhile(ev => ev.buttons === 1))
        .map(ev => [ev.movementX, ev.movementY])
        .scan((sum, delta) => V.sumOf(sum, delta), [...initialTranslation])
        .publishBehavior([...initialTranslation]);
    translation$.connect();
    return {
        block,
        vnode$: rxjs.Observable.combineLatest(
            slotsView.vnode$,
            translation$,
            size$,
            getRelativeBoundingBoxes$(getChildren$(frontContentDomSource)),
            (slotsVNode, translation, size, frontBoxes) => svg.g('.block', {
                attrs: {
                    name: block.id,
                    transform: SvgTransform.translate(...translation),
                },
            }, [
                svg.rect('.back', {
                    attrs: {
                        x: 0, y: 0, width: size[0], height: size[1],
                    },
                }),
                svg.g('.front', StackLayout({direction: Axis.vertical, spaceBetween: 5}).perform({
                    vnodes: [
                        svg.g('.header', {
                            attrs: {
                            },
                        }, [
                            svg.rect({
                                attrs: {
                                    x: 0, y: 0, width: size[0], height: headerHeight,
                                },
                            }),
                            svg.text({
                                attrs: {
                                    x: (size[0] - 2) / 2, y: headerHeight / 2,
                                    'alignment-baseline': 'middle',
                                    'text-anchor': 'middle',
                                },
                            }, [block.blueprint.name]),
                        ]),
                        slotsVNode,
                    ],
                    boxes: frontBoxes,
                })),
            ])
        ),
        selector$: ownDomSource.events('click').do(ev => ev.stopPropagation()).mapTo(selector),
        selected$: ownDomSource.element().map(element => element.classList.contains('selected')).distinctUntilChanged(),
        junctionPoint$s: {
            id: block.id,
            slots: slotsView.junctionPoint$s,
        },
        initiateConnection$: slotsView.initiateConnection$.map(ev => {
            const end = ev.source || ev.target;
            end.block = block;
            return ev;
        }),
        completeConnection$: slotsView.completeConnection$.map(ev => {
            const end = ev.source || ev.target;
            end.block = block;
            return ev;
        }),
    };
}

function wireVNode$({sourcePoint$, targetPoint$}) {
    return rxjs.Observable.combineLatest(sourcePoint$, targetPoint$,
        (sourcePoint, targetPoint) => ({
            source: sourcePoint,
            target: targetPoint,
            delta: Point.subtract(targetPoint, sourcePoint),
        })
    ).map(({source, target, delta}) => {
        const ctrlPointOffsetX = 0.25 * Math.max(Math.abs(delta.x), Math.min(Math.abs(delta.y), 200));
        const points = [
            source,
            {x: source.x + ctrlPointOffsetX, y: source.y},
            {x: source.x + 0.5 * delta.x, y: source.y + 0.5 * delta.y},
            {x: target.x - ctrlPointOffsetX, y: target.y},
            target,
        ];
        return svg.path({
            attrs: {
                d: [
                    `M${points[0].x} ${points[0].y}`,
                    `Q${points[1].x} ${points[1].y}, ${points[2].x} ${points[2].y}`,
                    `Q${points[3].x} ${points[3].y}, ${points[4].x} ${points[4].y}`,
                ].join(' '),
            },
        })
    });
}

function ConnectionView({parentDomSource, connection, sourceJunctionPoint$, targetJunctionPoint$}) {
    const selector = [
        '.connection',
        `[data-source-block="${connection.source.block.id}"]`,
        `[data-source-slot="${connection.source.slot.id}"]`,
        `[data-target-block="${connection.target.block.id}"]`,
        `[data-target-slot="${connection.target.slot.id}"]`,
    ].join('');
    const ownDomSource = parentDomSource.select(selector);
    return {
        connection,
        vnode$: wireVNode$({sourcePoint$: sourceJunctionPoint$, targetPoint$: targetJunctionPoint$}).map(
            vnode => svg.g('.connection', {
                dataset: {
                    sourceBlock: connection.source.block.id,
                    sourceSlot: connection.source.slot.id,
                    targetBlock: connection.target.block.id,
                    targetSlot: connection.target.slot.id,
                },
            }, [vnode])
        ),
        selector$: ownDomSource.events('click').do(ev => ev.stopPropagation()).mapTo(selector),
        selected$: ownDomSource.element().map(element => element.classList.contains('selected')),
    };
}

function getItemById(array, id) {
    return array.find(({id: itemId}) => itemId === id);
}

function connectionUnicity(lhs, rhs) {
    return model.Connection.equality(lhs, rhs) || model.Junction.equality(lhs.target, rhs.target);
}

function ConstellationView({parentDomSource, constellation, blueprints}) {
    const ownDomSource = parentDomSource.select('.constellation');
    const mouseMovement$ = ownDomSource.events('mousemove');
    const offset$ = getAbsoluteBoundingBox$(ownDomSource.element()).map(bbox => Point(bbox.left, bbox.top));

    const blueprintDrop$ = ownDomSource.events('drop').map(ev => ({
        blueprint: getItemById(blueprints, ev.dataTransfer.getData('application/prs.pinking-shears.blueprint-id+text')),
        position: Point(ev.offsetX, ev.offsetY),
    }));
    const blockDrop$ = blueprintDrop$.map(({blueprint, position}, i) => ({
        block: model.Block({
            id: `${blueprint.id}-${constellation.blocks.length + i}`,
            blueprint,
        }),
        position,
    }));
    const initialBlockDrop$ = rxjs.Observable.from(constellation.blocks).map(block => ({block, position: Point(0, 0)}));
    const blockViews$ = initialBlockDrop$.concat(blockDrop$).map(({block, position}) => BlockView({
        parentDomSource: ownDomSource,
        block,
        mouseMovement$,
        initialTranslation: position,
    })).scan((blockViews, blockView) => blockViews.concat(blockView), []).publishBehavior([]).refCount();

    const initiateConnection$ = rxjs.Observable.merge(
        blockViews$.switchMap(
            blockViews => rxjs.Observable.merge(...blockViews.map(({initiateConnection$}) => initiateConnection$))
        ),
        ownDomSource.events('mousedown').mapTo(null),
    ).distinctUntilChanged();
    const completeConnection$ = rxjs.Observable.merge(
        blockViews$.switchMap(
            blockViews => rxjs.Observable.merge(...blockViews.map(({completeConnection$}) => completeConnection$))
        ),
        ownDomSource.events('mouseup').mapTo(null),
    ).distinctUntilChanged();
    const connectionDrop$ = initiateConnection$.switchMap(initiation =>
        completeConnection$.map(completion => {
            if (initiation && completion) {
                const source = initiation.source || completion.source;
                const target = initiation.target || completion.target;
                if (source && target && !model.Block.equality(source.block, target.block)) {
                    return model.Connection({
                        source: model.Junction({block: source.block, slot: source.slot}),
                        target: model.Junction({block: target.block, slot: target.slot}),
                    });
                }
            }
        })
    ).filter(isDefined);
    const pendingConnectionVNode$ = rxjs.Observable.merge(initiateConnection$, completeConnection$.mapTo(null))
        .switchMap(fixedEnd => {
            if (fixedEnd){
                const movingEndPoint = mouseMovement$.map(ev => Point(ev.offsetX, ev.offsetY));
                const sourcePoint$ = fixedEnd.source
                    ? fixedEnd.source.point$.withLatestFrom(offset$, (point, offset) => Point.subtract(point, offset))
                    : movingEndPoint.map(point => point.offset(2, 0));  // workaround for CSS :hover
                const targetPoint$ = fixedEnd.target
                    ? fixedEnd.target.point$.withLatestFrom(offset$, (point, offset) => Point.subtract(point, offset))
                    : movingEndPoint.map(point => point.offset(-2, 0));  // workaround for CSS :hover
                return wireVNode$({sourcePoint$, targetPoint$}).map(vnode => svg.g('.pending-connection', [vnode]));
            } else return rxjs.Observable.of(null);
        }).startWith(null);
    const connections$ = rxjs.Observable.from(constellation.connections).concat(connectionDrop$)
        .scan((connections, connection) =>  A.unique(connections.concat(connection), connectionUnicity), [])
        .startWith([]).distinctUntilChanged(A.equality(model.Connection.equality));
    const connectionViews$ = rxjs.Observable.combineLatest(
        blockViews$.map(blockViews => blockViews.map(({junctionPoint$s}) => junctionPoint$s)),
        connections$,
        (arrayOfBlockJunctionPoint$s, connections) => connections.map(connection => {
            const sourceBlockJunctionPoint$s = getItemById(arrayOfBlockJunctionPoint$s, connection.source.block.id);
            const targetBlockJunctionPoint$s = getItemById(arrayOfBlockJunctionPoint$s, connection.target.block.id);
            if (sourceBlockJunctionPoint$s && targetBlockJunctionPoint$s) {
                const sourceJunctionPoint$ = getItemById(sourceBlockJunctionPoint$s.slots.output, connection.source.slot.id);
                const targetJunctionPoint$ = getItemById(targetBlockJunctionPoint$s.slots.input, connection.target.slot.id);
                if (sourceJunctionPoint$ && targetJunctionPoint$) {
                    return ConnectionView({
                        parentDomSource: ownDomSource,
                        connection,
                        sourceJunctionPoint$: rxjs.Observable.combineLatest(
                            sourceJunctionPoint$.junctionPoint$,
                            offset$,
                            (sourceJunctionPoint, offset) => Point.subtract(sourceJunctionPoint, offset)
                        ),
                        targetJunctionPoint$: rxjs.Observable.combineLatest(
                            targetJunctionPoint$.junctionPoint$,
                            offset$,
                            (targetJunctionPoint, offset) => Point.subtract(targetJunctionPoint, offset)
                        ),
                    })
                }
            }
        }
    ).filter(isDefined)).publishBehavior([]).refCount();

    return {
        vnode$: rxjs.Observable.combineLatest(
            blockViews$.switchMap(blockViews => rx.combineLatestOf(blockViews.map(({vnode$}) => vnode$))),
            connectionViews$.switchMap(
                connectionViews => rx.combineLatestOf(connectionViews.map(({vnode$}) => vnode$)).startWith([])
            ),
            pendingConnectionVNode$.map(vnode => vnode ? [vnode] : []),
            (blockVNodes, connectionVNodes, pendingConnections) => svg('.constellation', {
                on: {
                    'dragover': (ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = "copy"; },
                },
            }, [
                ...connectionVNodes,
                ...blockVNodes,
                ...pendingConnections,
            ])
        ),
        selector$: rxjs.Observable.merge(
            blockViews$.switchMap(blockViews => rxjs.Observable.merge(...blockViews.map(({selector$}) => selector$))),
            connectionViews$.switchMap(
                connectionViews => rxjs.Observable.merge(...connectionViews.map(({selector$}) => selector$))
            ),
        ),
    }
}

module.exports = {
    BlockView,
    ConnectionView,
    ConstellationView,
    InputView,
    InputsView,
    OutputView,
    OutputsView,
    SlotsView,
};