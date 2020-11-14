import React from 'react';
import { toType } from './../helpers/util';

//clibboard icon
import { Clippy } from './icons';

//theme
import Theme from './../themes/getStyle';

export default class extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            copied: false
        };
    }

    copiedTimer = null;

    componentWillUnmount() {
        if (this.copiedTimer) {
            clearTimeout(this.copiedTimer);
            this.copiedTimer = null;
        }
    }

    handleCopy = () => {
        const { clickCallback, src, namespace } = this.props;
        navigator.clipboard.writeText(JSON.stringify(this.clipboardValue(src), null, '  '));

        this.copiedTimer = setTimeout(() => {
            this.setState({
                copied: false
            });
        }, 5500);


        this.setState({ copied: true }, () => {
            if (typeof clickCallback !== 'function') {
                return;
            }

            clickCallback({
                src: src,
                namespace: namespace,
                name: namespace[namespace.length - 1]
            });
        });
    }

    getClippyIcon = () => {
        const { theme } = this.props;

        if (this.state.copied) {
            return (
                <span>
                    <Clippy class="copy-icon" {...Theme(theme, 'copy-icon')} />
                    <span {...Theme(theme, 'copy-icon-copied')}>✔</span>
                </span>
            );
        }

        return <Clippy class="copy-icon" {...Theme(theme, 'copy-icon')} />;
    }

    clipboardValue = value => {
        const type = toType(value);
        switch (type) {
        case 'function':
        case 'regexp':
            return value.toString();
        default:
            return value;
        }
    }

    render() {
        const { src, theme, hidden } = this.props;
        let style = Theme(theme, 'copy-to-clipboard').style;
        let display = 'inline';

        if (hidden) {
            display = 'none';
        }

        return (
            <span class="copy-to-clipboard-container" title="Copy to clipboard">
                <span
                    style={{
                        ...style,
                        display: display
                    }}
                    onClick={this.handleCopy}
                >
                    {this.getClippyIcon()}
                </span>
            </span>
        );
    }
}
