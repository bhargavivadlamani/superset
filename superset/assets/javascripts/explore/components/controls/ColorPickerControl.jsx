import React from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Popover } from 'react-bootstrap';
import { SketchPicker } from 'react-color';

import ControlHeader from '../ControlHeader';
import { bnbColors } from '../../../modules/colors';

const propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.object,
};

const defaultProps = {
  onChange: () => {},
};

const swatchCommon = {
  position: 'absolute',
  width: '50px',
  height: '20px',
  top: '0px',
  left: '0px',
  right: '0px',
  bottom: '0px',
};

const styles = {
  swatch: {
    width: '50px',
    height: '20px',
    position: 'relative',
    padding: '5px',
    borderRadius: '1px',
    boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
    display: 'inline-block',
    cursor: 'pointer',
    boxShadow: 'rgba(0, 0, 0, 0.15) 0px 0px 0px 1px inset, rgba(0, 0, 0, 0.25) 0px 0px 4px inset',
  },
  color: {
    ...swatchCommon,
    borderRadius: '2px',
  },
  checkboard: {
    ...swatchCommon,
    background: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==") left center',
  },
};
export default class ColorPickerControl extends React.Component {
  constructor(props) {
    super(props);
    this.onChange = this.onChange.bind(this);
  }
  onChange(col) {
    this.props.onChange(col.rgb);
  }
  renderPopover() {
    return (
      <Popover id="filter-popover" className="color-popover">
        <SketchPicker
          color={this.props.value}
          onChange={this.onChange}
          presetColors={bnbColors.filter((s, i) => i < 7)}
        />
      </Popover>);
  }
  render() {
    const c = this.props.value || { r: 0, g: 0, b:0, a: 0 };
    const colStyle = Object.assign(
      {}, styles.color, { background: `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})` });
    return (
      <div>
        <ControlHeader {...this.props} />
        <OverlayTrigger
          container={document.body}
          trigger="click"
          rootClose
          ref="trigger"
          placement="right"
          overlay={this.renderPopover()}
        >
          <div style={styles.swatch}>
            <div style={styles.checkboard} />
            <div style={colStyle} />
          </div>
        </OverlayTrigger>
      </div>
    );
  }
}

ColorPickerControl.propTypes = propTypes;
ColorPickerControl.defaultProps = defaultProps;
