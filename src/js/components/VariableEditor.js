import React from 'react';
import AutosizeTextarea from 'react-textarea-autosize';

import dispatcher from './../helpers/dispatcher';
import parseInput from './../helpers/parseInput';
import stringifyVariable from './../helpers/stringifyVariable';
import CopyToClipboard from './CopyToClipboard';
import PasteToJson from './PasteToJson';
import CutFromJson from './CutFromJson';
import highlightedString from './../helpers/highlightedString';
import MDEditor from './MarkdownEditor';
import { Markdown, ArrowLeft } from './icons';

//data type components
import {
    JsonBoolean,
    JsonDate,
    JsonFloat,
    JsonFunction,
    JsonInteger,
    JsonNan,
    JsonNull,
    JsonRegexp,
    JsonString,
    JsonUndefined,
    JsonColor
} from './DataTypes/DataTypes';

//clibboard icon
import {
    Edit,
    CheckCircle,
    RemoveIcon as Remove,
    CancelIcon as Cancel
} from './icons';

//theme
import Theme from './../themes/getStyle';
import ExternalPaste from './ExternalPaste';

export const editModes = {
    MARKDOWN: 'MARKDOWN',
    REGULAR: 'REGULAR',
};

class VariableEditor extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            editMode: null,
            editValue: '',
            renameKey: false,
            parsedInput: {
                type: false,
                value: null
            },
            allowDragging: true,
            canPaste: false,
            hoveredOver: false
        };
    }

    highlightString = () => {
        const { variable, search, type, theme } = this.props;
        let variableName = variable.name;
        if (typeof variableName === 'string' && search && type !== 'array') {
            //ignore uppercase
            const start = variableName
                .toLowerCase()
                .indexOf(search.toLowerCase());
            if (start > -1) {
                variableName = highlightedString(
                    variable.name,
                    start,
                    search.length,
                    theme
                );
            }
        }
        return variableName;
    };

    renderArrayKeys = () => {
        const { displayArrayKey, variable, namespace, theme } = this.props;
        let variableName = this.highlightString();
        return (
            displayArrayKey && (
                <span
                    className="array-key"
                    {...Theme(theme, 'array-key')}
                    key={variable.name + '_' + namespace}
                >
                    {variableName}
                    <div {...Theme(theme, 'colon')}>:</div>
                </span>
            )
        );
    };

    renderObjectKeys = () => {
        const { theme, namespace, variable, quotesOnKeys } = this.props;
        let variableName = this.highlightString();
        return (
            <span>
                <span
                    {...Theme(theme, 'object-name')}
                    className="object-key"
                    key={variable.name + '_' + namespace}
                >
                    {!!quotesOnKeys && (
                        <span style={{ verticalAlign: 'top' }}>"</span>
                    )}
                    <span style={{ display: 'inline-block' }}>
                        {variableName}
                    </span>
                    {!!quotesOnKeys && (
                        <span style={{ verticalAlign: 'top' }}>"</span>
                    )}
                </span>
                <span {...Theme(theme, 'colon')}>:</span>
            </span>
        );
    };

    render() {
        const {
            variable,
            singleIndent,
            type,
            theme,
            namespace,
            indentWidth,
            enableClipboard,
            onEdit,
            onDelete,
            onSelect,
            rjvId,
            parent_type,
        } = this.props;
        const { editMode, hoveredOver } = this.state;
        const disableEditingArrayKeys =
            parent_type !== 'array' && onEdit !== false && editMode == false;
        return (
            <div
                {...Theme(theme, 'objectKeyVal', {
                    paddingLeft: indentWidth * singleIndent
                })}
                onMouseEnter={() =>
                    this.setState({ ...this.state, hoveredOver: true })
                }
                class="variable-row"
                onMouseOver={() => this.setState({ hoveredOver: true })}
                onMouseLeave={() => this.setState({ hoveredOver: false })}
                key={variable.name}
            >
                {disableEditingArrayKeys &&
                    hoveredOver &&
                    this.renderKeyRenameButton()}
                {type === 'array'
                    ? this.renderArrayKeys()
                    : this.renderObjectKeys()}
                <div
                    class="variable-value"
                    onMouseDown={
                        onSelect === false && onEdit === false
                            ? null
                            : () => {
                                  let location = [...namespace];
                                  if (onSelect !== false) {
                                      location.shift();
                                      onSelect({
                                          ...variable,
                                          namespace: location
                                      });
                                  }
                              }
                    }
                    onDoubleClick={
                        onSelect === false && onEdit === false
                            ? null
                            : () => {
                                  if (onEdit !== false) {
                                      this.prepopInput(variable);
                                  }
                              }
                    }
                    {...Theme(theme, 'variableValue', {
                        cursor: 'pointer'
                    })}
                >
                    {this.getValue(variable, editMode)}
                </div>
                {enableClipboard && hoveredOver && (
                    <CopyToClipboard
                        rowHovered={this.state.hoveredOver}
                        hidden={editMode}
                        src={variable.value}
                        name={variable.name}
                        clickCallback={enableClipboard}
                        {...{ theme, namespace, rjvId }}
                    />
                )}
                {enableClipboard && editMode === false && hoveredOver && (
                    <span>
                        <CutFromJson
                            hidden={editMode}
                            src={variable.value}
                            name={variable.name}
                            {...{ theme, namespace, rjvId }}
                        />
                        <PasteToJson name={variable.name} {...this.props} />
                        <ExternalPaste name={variable.name} {...this.props} />
                    </span>
                )}
                {onEdit !== false &&
                    editMode === false &&
                    hoveredOver &&
                    this.renderValueRenameButton()}
                {onDelete !== false &&
                    editMode === false &&
                    hoveredOver &&
                    this.getRemoveIcon()}
            </div>
        );
    }

    renderValueRenameButton = () => {
        const { variable, theme } = this.props;

        return (
            <div class="click-to-edit" title="Edit">
                <Edit
                    class="click-to-edit-icon"
                    {...Theme(theme, 'editVarIcon')}
                    onClick={() => {
                        this.prepopInput(variable);
                    }}
                />
            </div>
        );
    };

    updateVariableKeyRequest = e => {
        const {
            variable: { name },
            namespace,
            rjvId,
            depth,
            src
        } = this.props;
        e.stopPropagation();
        dispatcher.dispatch({
            name: 'UPDATE_VARIABLE_KEY_REQUEST',
            rjvId: rjvId,
            data: {
                name: namespace[depth],
                namespace: namespace.splice(0, namespace.length - 1),
                existing_value: src,
                variable_removed: false,
                key_name: name
            }
        });
    };

    renderKeyRenameButton = () => {
        const { theme } = this.props;
        return (
            <span class="click-to-edit-key" title="Edit value">
                <Edit
                    class="click-to-edit-key-icon"
                    {...Theme(theme, 'editVarIcon')}
                    onClick={e => this.updateVariableKeyRequest(e)}
                />
            </span>
        );
    };

    prepopInput = variable => {
        this.props.isDragAllowed(false);
        if (this.props.onEdit !== false) {
            const stringifiedValue = stringifyVariable(variable.value);
            const detected = parseInput(stringifiedValue);
            this.setState({
                editMode: this.getActiveEditMode(),
                editValue: stringifiedValue,
                parsedInput: {
                    type: detected.type,
                    value: detected.value
                }
            });
        }
    };

    getActiveEditMode = () => {
        switch (this.state.editMode) {
            case editModes.MARKDOWN:
                return editModes.MARKDOWN;
            case editModes.REGULAR:
                return editModes.REGULAR;
            case null:
                return editModes.REGULAR;
            default:
                throw new Error(`Unknown editMode "${this.state.editMode}" set in state`);
        }
    };

    getRemoveIcon = () => {
        const { variable, namespace, theme, rjvId } = this.props;

        return (
            <div class="click-to-remove" title="Remove">
                <Remove
                    class="click-to-remove-icon"
                    {...Theme(theme, 'removeVarIcon')}
                    onClick={() => {
                        dispatcher.dispatch({
                            name: 'VARIABLE_REMOVED',
                            rjvId: rjvId,
                            data: {
                                name: variable.name,
                                namespace: namespace,
                                existing_value: variable.value,
                                variable_removed: true
                            }
                        });
                    }}
                />
            </div>
        );
    };

    getValue = (variable, editMode) => {
        const type = editMode ? false : variable.type;
        const { props } = this;
        switch (type) {
            case false:
                return this.getEditInput();
            case 'string':
                return <JsonString value={variable.value} {...props} />;
            case 'integer':
                return <JsonInteger value={variable.value} {...props} />;
            case 'float':
                return <JsonFloat value={variable.value} {...props} />;
            case 'boolean':
                return <JsonBoolean value={variable.value} {...props} />;
            case 'function':
                return <JsonFunction value={variable.value} {...props} />;
            case 'null':
                return <JsonNull {...props} />;
            case 'nan':
                return <JsonNan {...props} />;
            case 'undefined':
                return <JsonUndefined {...props} />;
            case 'date':
                return <JsonDate value={variable.value} {...props} />;
            case 'regexp':
                return <JsonRegexp value={variable.value} {...props} />;
            case 'color':
                return (
                    <JsonColor
                        value={variable.value}
                        handleChange={this.submitEdit}
                        isOneColorPickerOpen={this.toggleColorEditor}
                        colorType={this.chooseColorCodeType(variable.value)}
                        {...props}
                    />
                );
            default:
                // catch-all for types that weren't anticipated
                return (
                    <div class="object-value">
                        {JSON.stringify(variable.value)}
                    </div>
                );
        }
    };

    getEditInput = () => {
        const { theme } = this.props;
        const { editValue, editMode } = this.state;

        if (editMode === editModes.MARKDOWN) {
            return (
                <div>
                    <MDEditor
                        value={ editValue }
                        onChange={value => this.setState({ editValue: value }) }
                    />
                    <div {...Theme(theme, 'edit-icon-container')}>
                        <button
                            className="editor-toggle"
                            onClick={() => this.setState({ editMode: editModes.REGULAR })}
                            title="Return to simple editor"
                        >
                            <ArrowLeft />
                        </button>
                        <Cancel
                            class="edit-cancel"
                            {...Theme(theme, 'cancel-icon')}
                            onClick={() => {
                                this.setState({ editMode: null, editValue: '' });
                                this.props.isDragAllowed(true);
                            }}
                        />
                        <CheckCircle
                            class="edit-check string-value"
                            {...Theme(theme, 'check-icon')}
                            onClick={() => {
                                this.submitEdit();
                            }}
                        />
                    </div>
                </div>
            )
        }

        return (
            <div>
                <AutosizeTextarea
                    type="text"
                    inputRef={input => input && input.focus()}
                    value={editValue}
                    class="variable-editor"
                    onChange={event => {
                        const value = event.target.value;
                        const detected = parseInput(value);
                        this.setState({
                            editValue: value,
                            parsedInput: {
                                type: detected.type,
                                value: detected.value
                            }
                        });
                    }}
                    onKeyDown={e => {
                        switch (e.key) {
                            case 'Escape': {
                                this.setState({
                                    editMode: null,
                                    editValue: ''
                                });
                                this.props.isDragAllowed(true);
                                break;
                            }
                            case 'Enter': {
                                if (e.ctrlKey || e.metaKey) {
                                    this.submitEdit(true);
                                }
                                this.props.isDragAllowed(true);
                                break;
                            }
                        }
                        e.stopPropagation();
                    }}
                    placeholder="Insert new value"
                    minRows={2}
                    {...Theme(theme, 'edit-input')}
                />
                <div {...Theme(theme, 'edit-icon-container')}>

                    <button
                        className="editor-toggle"
                        onClick={() => this.setState({ editMode: editModes.MARKDOWN })}
                        title="Switch to markdown editor"
                    >
                        <Markdown />
                    </button>

                    <Cancel
                        class="edit-cancel"
                        {...Theme(theme, 'cancel-icon')}
                        onClick={() => {
                            this.setState({ editMode: null, editValue: '' });
                            this.props.isDragAllowed(true);
                        }}
                    />
                    <CheckCircle
                        class="edit-check string-value"
                        {...Theme(theme, 'check-icon')}
                        onClick={() => {
                            this.submitEdit();
                        }}
                    />
                    <div>{this.showDetected()}</div>
                </div>
            </div>
        );
    };

    toggleColorEditor = isColorPickerOpen => {
        this.props.isDragAllowed(isColorPickerOpen);
        this.setState({
            allowDragging: isColorPickerOpen
        });
    };

    chooseColorCodeType = colorCode => {
        if (colorCode.substring(0, 1) === '#') {
            return 'hex';
        } else if (colorCode.substring(0, 4) === 'rgba') {
            return 'rgba';
        } else if (colorCode.substring(0, 3) === 'rgb') {
            return 'rgb';
        } else if (colorCode.substring(0, 4) === 'hsla') {
            return 'hsla';
        } else if (colorCode.substring(0, 3) === 'hsl') {
            return 'hsl';
        }
        return 'hex';
    };

    submitEdit = submit_detected => {
        const { allowDragging } = this.state;
        let newColor;
        if (submit_detected !== undefined && submit_detected['newColorValue']) {
            newColor = submit_detected['newColorValue'];
        }
        const { variable, namespace, rjvId } = this.props;
        const { editValue, parsedInput } = this.state;
        let new_value = editValue;
        if (submit_detected && parsedInput.type) {
            new_value = parsedInput.value;
        }
        if (newColor) {
            new_value = newColor;
        }
        this.setState({
            editMode: null,
            hoveredOver: false
        });
        if (allowDragging) {
            this.props.isDragAllowed(true);
        }
        dispatcher.dispatch({
            name: 'VARIABLE_UPDATED',
            rjvId: rjvId,
            data: {
                name: variable.name,
                namespace: namespace,
                existing_value: variable.value,
                new_value: new_value,
                variable_removed: false
            }
        });
    };

    showDetected = () => {
        const { theme, variable } = this.props;
        const detected = this.getDetectedInput();
        if (detected) {
            return (
                <div>
                    <div {...Theme(theme, 'detected-row')}>
                        {detected}
                        <CheckCircle
                            class="edit-check detected"
                            style={{
                                verticalAlign: 'top',
                                paddingLeft: '3px',
                                ...Theme(theme, 'check-icon').style
                            }}
                            onClick={() => {
                                this.submitEdit(true);
                            }}
                        />
                    </div>
                </div>
            );
        }
    };

    getDetectedInput = () => {
        const { parsedInput } = this.state;
        const { type, value } = parsedInput;
        const { props } = this;
        const { theme } = props;

        if (type !== false) {
            switch (type.toLowerCase()) {
                case 'object':
                    return (
                        <span>
                            <span
                                style={{
                                    ...Theme(theme, 'brace').style,
                                    cursor: 'default'
                                }}
                            >
                                {'{'}
                            </span>
                            <span
                                style={{
                                    ...Theme(theme, 'ellipsis').style,
                                    cursor: 'default'
                                }}
                            >
                                ...
                            </span>
                            <span
                                style={{
                                    ...Theme(theme, 'brace').style,
                                    cursor: 'default'
                                }}
                            >
                                {'}'}
                            </span>
                        </span>
                    );
                case 'array':
                    return (
                        <span>
                            <span
                                style={{
                                    ...Theme(theme, 'brace').style,
                                    cursor: 'default'
                                }}
                            >
                                {'['}
                            </span>
                            <span
                                style={{
                                    ...Theme(theme, 'ellipsis').style,
                                    cursor: 'default'
                                }}
                            >
                                ...
                            </span>
                            <span
                                style={{
                                    ...Theme(theme, 'brace').style,
                                    cursor: 'default'
                                }}
                            >
                                {']'}
                            </span>
                        </span>
                    );
                case 'string':
                    return <JsonString value={value} {...props} />;
                case 'integer':
                    return <JsonInteger value={value} {...props} />;
                case 'float':
                    return <JsonFloat value={value} {...props} />;
                case 'boolean':
                    return <JsonBoolean value={value} {...props} />;
                case 'function':
                    return <JsonFunction value={value} {...props} />;
                case 'null':
                    return <JsonNull {...props} />;
                case 'nan':
                    return <JsonNan {...props} />;
                case 'undefined':
                    return <JsonUndefined {...props} />;
                case 'date':
                    return <JsonDate value={new Date(value)} {...props} />;
            }
        }
    };
}

//export component
export default VariableEditor;
