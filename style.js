const {makeStyleSheet} = require('fluent-style-sheets');

const middleGray = 'rgb(119, 119, 119)';

const styleSheet = makeStyleSheet()
.i('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css')
.r('html', {
    'background-color': middleGray,
    'font-family': 'sans-serif',
    'font-size': '11pt',
})
.r('canvas', {
    'border': '1px solid #888',
    'margin': '0.5em',
})
.r('input', {
    'margin': '0.5em 0',
})
.r('main', {
    'display': 'flex',
    'justify-content': 'space-between',
})
.n('#input', $ => $
    .r({
        'align-items': 'center',
        'display': 'inline-flex',
        'flex-direction': 'column',
        'margin': '1em',
    })
    .n('.file-input', $ => $
        .r({
            'background-color': '#999',
            'border-radius': '3px',
            'padding': '0.5em',
        })
        .r('label span', {
            'margin': '0 0.25em',
        })
        .r('label span::after', {
            'content': '":"'
        })
        .r('label input', {
            'margin': '0 0.25em',
        })
    )
    .n('.preview', $ => $
        .r({
            'align-items': 'center',
            'display': 'flex',
            'flex-direction': 'column',
        })
        .r('img', {
            'display': 'none',
        })
        .r('canvas', {
            'max-height': '480px',
            'max-width': '480px',
        })
        .n('.background-color', $ => $
            .r({
                'align-items': 'center',
                'background-color': '#999',
                'border-radius': '3px',
                'display': 'flex',
                'flex-direction': 'column',
                'margin': '0 0.5em',
                'padding': '0.5em',
            })
            .r('> label', {
                'margin': '0.25em',
            })
            .n('.channels', $ => $
                .r({
                    'display': 'flex',
                })
                .n('.channel', $ => $
                    .r({
                        'margin': '0.25em',
                    })
                    .r('label span::after', {
                        'content': '":"',
                    })
                    .r('label input', {
                        'border': '1px solid #888',
                        'margin': '0.25em',
                        'padding': '0',
                        'padding-left': '1px',
                        'width': '45px',
                    })
                )
                .r('.channel[data-channel="red"] input', {
                    'background-color': 'rgba(255, 0, 0, 0.33)',
                })
                .r('.channel[data-channel="green"] input', {
                    'background-color': 'rgba(0, 255, 0, 0.33)',
                })
                .r('.channel[data-channel="blue"] input', {
                    'background-color': 'rgba(0, 0, 255, 0.33)',
                })
                .r('.channel[data-channel="alpha"] input', {
                    'background-color': 'rgba(0, 0, 0, 0.33)',
                })
            )
        )
    )
)
.n('#output', $ => $
    .r({
        'display': 'inline-block',
        'margin': '1em',
        'max-width': '50vw',
    })
    .n('.output-param', $ => $
        .r({
            'background-color': '#999',
            'border-radius': '3px',
            'display': 'inline-block',
            'margin': '0.5em',
            'margin-left': '0',
            'padding': '0.5em',
        })
        .r('input', {
            'margin': '0',
            'margin-left': '0.5em',
            'width': '46px',
        })
    )
    .n('#algos', $ => $
        .r({
            'display': 'flex',
            'flex-wrap': 'wrap',
        })
        .n('.algo', $ => $
            .r({
                'display': 'inline-block',
                'margin': '1px',
            })
            .r('> div', {
                'align-items': 'stretch',
                'background-color': '#aaa',
                'border': '1px solid #888',
                'display': 'flex',
                'flex-direction': 'column',
            })
            .n('header', $ => $
                .n('label', $ => $
                    .r({
                        'display': 'flex',
                        'padding': '0.25em',
                    })
                    .r('i', {
                        'margin': '0 0.25em',
                    })
                    .r('input', {
                        'display': 'none',
                    })
                )
            )
            .r('canvas', {
                'align-self': 'center',
                'background-color': middleGray,
            })
            .n('.parameters', $ => $
                .r({
                    'display': 'flex',
                    'flex-wrap': 'wrap',
                })
                .n('.parameter[data-inputtype="range"]', $ => $
                    .r({
                        'align-items': 'center',
                        'background-color': '#999',
                        'border-radius': '5px',
                        'display': 'flex',
                        'flex-direction': 'column',
                        'flex-grow': '1',
                        'margin': '0.25em',
                        'padding': '0.25em',
                    })
                    .r('span', {
                        'margin': '0.25em',
                    })
                )
                .n('.parameter[data-inputtype="number"]', $ => $
                    .r({
                        'align-items': 'center',
                        'background-color': '#999',
                        'border-radius': '5px',
                        'display': 'flex',
                        'flex-grow': '1',
                        'justify-content': 'center',
                        'margin': '0.25em',
                        'padding': '0.25em',
                    })
                    .r('span', {
                        'margin': '0.25em',
                    })
                    .r('span::after', {
                        'content': '":"',
                    })
                    .r('input', {
                        'margin': '0.25em',
                        'width': '46px',
                    })
                )
            )
        )
        .n('.algo[data-active="false"]', $ => $
            .r('canvas', '.parameters', {
                'display': 'none',
            })
        )
    )
);

module.exports = {
    styleSheet,
    createStyleElement: () => {
        const styleElement = document.createElement('style');
        styleElement.innerHTML = styleSheet.renderCSS();
        return styleElement;
    }
};