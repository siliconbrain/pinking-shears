const {makeStyleSheet} = require('fluent-style-sheets');

const middleGray = 'rgb(119, 119, 119)';

const styleSheet = makeStyleSheet()
.i('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css')
.r('html', {
    'background-color': '#333',
    'font-family': 'sans-serif',
    'font-size': '11pt',
})
.n('#workspace', $ => $
    .r({
        'position': 'relative',
    })
    .n('.block', $ => $
        .r({
            'background-color': '#666',
            'border': '1px solid #eee',
            'border-radius': '5px',
            'cursor': 'pointer',
            'display': 'inline-block',
            'margin': '10px',
            'max-width': '200px',
            'padding': '5px',
            'position': 'absolute',
        })
        .r('header', {
            'border-bottom': '1px solid #999',
            'text-align': 'center',
        })
        .n('.slots', $ => $
            .r({
                'display': 'flex',
                'flex-wrap': 'wrap',
            })
            .r('.inputs', '.outputs', {
                'display': 'flex',
                'flex-direction': 'column',
                'flex-grow': '1',
            })
            .r('.inputs', {
                'border-right': '1px solid #999',
            })
        )
    )
    .r('.block:hover', {
        'border-color': '#ff0',
    })
    .r('.block.selected', {
        'border-color': '#fa0',
        'border-width': '2px',
    })
);

module.exports = {
    styleSheet,
    createStyleElement: () => {
        const styleElement = document.createElement('style');
        styleElement.innerHTML = styleSheet.renderCSS();
        return styleElement;
    }
};