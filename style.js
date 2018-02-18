const {makeStyleSheet} = require('fluent-style-sheets');

const styleSheet = makeStyleSheet()
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
.r('#output', {
    'max-width': '50vw',
})
.r('.output-param', {
    'margin': '0 0.5em',
})
.r('.output-param input', {
    'width': '46px',
})
.r('#input', '#output', '.output-param', '.algo', {
    'display': 'inline-block',
});

module.exports = {
    styleSheet,
    createStyleElement: () => {
        const styleElement = document.createElement('style');
        styleElement.innerHTML = styleSheet.renderCSS();
        return styleElement;
    }
};