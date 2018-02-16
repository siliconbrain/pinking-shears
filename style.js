const {makeStyleSheet} = require('fluent-style-sheets');

const styleSheet = makeStyleSheet()
.r('html', {
    'background-color': 'rgb(191,191,191)',
    'font-family': 'sans-serif',
    'font-size': '11pt',
})
.r('#input-image-preview', '.algo canvas', {
    'border': '1px solid #888',
    'margin': '0.5em',
})
.r('#controls input', {
    'margin': '0.5em 0',
})
.r('#input-image-preview', {
    'background-color': 'fuchsia',
    'height': '480px',
    'object-fit': 'contain',
    'width': '480px',
})
.r('#output-resolution', '#output-pixel-size', {
    'width': '46px',
})
.r('.algo', {
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