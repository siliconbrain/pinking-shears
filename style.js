const {makeStyleSheet} = require('fluent-style-sheets');

const styleSheet = makeStyleSheet()
.i('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css')
.r('html', {
    'background-color': 'rgb(191,191,191)',
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
        'display': 'inline-block',
    })
    .n('.preview', $ => $
        .r('img', {
            'display': 'none',
        })
        .r('canvas', {
            'max-height': '480px',
            'max-width': '480px',
        })
        .n('.background-color', $ => $
            .r({
                'margin': '0 0.5em',
            })
            .r('label', {
                'margin-right': '0.25em',
            })
            .n('.color-component-input', $ => $
                .r({
                    'display': 'inline-block',
                    'margin': '0 0.25em',
                })
                .r('input', {
                    'text-align': 'right',
                    'width': '45px',
                })
            )
        )
    )
)
.n('#output', $ => $
    .r({
        'display': 'inline-block',
        'max-width': '50vw',
    })
    .n('.output-param', $ => $
        .r({
            'display': 'inline-block',
            'margin': '0 0.5em',
        })
        .r('input', {
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
                'border': '1px solid #888',
                'display': 'inline-block',
            })
            .r('label', {
                'display': 'flex',
                'margin': '0.25em',
            })
            .r('label input', {
                'display': 'none',
            })
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