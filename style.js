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
.r('#input', $ => $
    .r({
        'align-items': 'center',
        'display': 'inline-flex',
        'flex-direction': 'column',
        'margin': '1em',
    })
    .r('.file-input', {
        'background-color': '#999',
        'border-radius': '3px',
        'padding': '0.5em',
    })
    .r('.preview', $ => $
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
        .r('.background-color', $ => $
            .r({
                'align-items': 'center',
                'background-color': '#999',
                'border-radius': '3px',
                'display': 'flex',
                'flex-direction': 'column',
                'margin': '0 0.5em',
                'padding': '0.5em',
            })
            .r('label', {
                'margin': '0.25em',
            })
            .r('.color-component-input', $ => $
                .r({
                    'display': 'inline-block',
                    'margin': '0 0.25em',
                })
                .r('input', {
                    'border': '1px solid #888',
                    'padding': '0',
                    'width': '45px',
                })
            )
            .r('.color-component-red input', {
                'background-color': 'rgba(255, 0, 0, 0.33)',
            })
            .r('.color-component-green input', {
                'background-color': 'rgba(0, 255, 0, 0.33)',
            })
            .r('.color-component-blue input', {
                'background-color': 'rgba(0, 0, 255, 0.33)',
            })
            .r('.color-component-alpha input', {
                'background-color': 'rgba(0, 0, 0, 0.33)',
            })
        )
    )
)
.r('#output', $ => $
    .r({
        'display': 'inline-block',
        'margin': '1em',
        'max-width': '50vw',
    })
    .r('.output-param', $ => $
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
    .r('#algos', $ => $
        .r({
            'display': 'flex',
            'flex-wrap': 'wrap',
        })
        .r('.algo', $ => $
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
            .r('header', $ => $
                .r('label', $ => $
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
            .r('.parameters', $ => $
                .r({
                    'display': 'flex',
                    'flex-wrap': 'wrap',
                })
                .r('.parameter[data-inputtype="range"]', $ => $
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
            )
        )
        .r('.algo[data-active="false"]', $ => $
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