const {makeStyleSheet} = require('fluent-style-sheets');

const middleGray = 'rgb(119, 119, 119)';
const selectedColor = 'orange';

const styleSheet = makeStyleSheet()
.i('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css')
.r('html', {
    'background-color': '#333',
    'font-family': 'sans-serif',
    'font-size': '11pt',
})
.r('body', {
    'margin': '0',
})
.r('main', $ => $
    .r({
        'display': 'flex',
        'height': '100%',
        'width': '100%',
    })
    .r('#toolbar', $ => $
        .r({
            'background-color': '#eee',
        })
        .r('.blueprint', $ => $
            .r({
                'margin': '5px 10px',
            })
        )
    )
    .r('#workspace', $ => $
        .r({
            'flex-grow': '1',
            'margin': '5px',
        })
        .r('.constellation', {
            'height': '100%',
            'width': '100%',
        })
        .r('.block', $ => $
            .r('> .back', {
                'fill': 'rgba(127, 127, 127, 0.75)',
                'rx': '2',
            })
            .r('.header', $ => $
                .r('rect', {
                    'fill': '#58f',
                })
                .r('text', {
                    'user-select': 'none',
                })
            )
            .s('.selected .header rect', {
                'stroke': '#fff',
            })
            .r('.slots', $ => $
                .r({
                    'user-select': 'none',
                })
                .r('.junction', {
                    'fill': 'transparent',
                    'stroke-width': '3',
                })
                .r('.input .junction', $ => $
                    .r({
                        'stroke': '#bf0',
                    })
                    .s(':hover', {
                        'fill': '#bf0',
                    })
                )
                .r('.output .junction', $ => $
                    .r({
                        'stroke': '#ec0',
                    })
                    .s(':hover', {
                        'fill': '#ec0',
                    })
                )
            )
        )
        .r('.pending-connection', {
            'fill': 'none',
            'stroke': selectedColor,
            'stroke-width': '2px',
        })
        .r('.connection', $ => $
            .r({
                'fill': 'none',
                'stroke': '#666',
                'stroke-width': '2px',
            })
            .s(':hover', {
                'stroke': 'yellow',
            })
            .s('.selected', {
                'stroke': selectedColor,
                'stroke-width': '2px',
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