/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import PropTypes from 'prop-types';
import { css } from '@superset-ui/core';
import { Tooltip } from 'src/components/Tooltip';
import { FormItem, FormLabel } from 'src/components/Form';
import './crud.less';

const formItemInlineCss = css`
  .ant-form-item-control-input-content {
    display: flex;
    flex-direction: row;
  }
`;

const propTypes = {
  value: PropTypes.any,
  label: PropTypes.string.isRequired,
  description: PropTypes.node,
  fieldKey: PropTypes.string.isRequired,
  control: PropTypes.node.isRequired,
  onChange: PropTypes.func,
  compact: PropTypes.bool,
  inline: PropTypes.bool,
};
const defaultProps = {
  onChange: () => {},
  compact: false,
  description: null,
};

export default class Field extends React.PureComponent {
  constructor(props) {
    super(props);
    this.onChange = this.onChange.bind(this);
  }

  onChange(newValue) {
    this.props.onChange(this.props.fieldKey, newValue);
  }

  render() {
    const {
      compact,
      value,
      label,
      control,
      description,
      fieldKey,
      inline,
    } = this.props;
    const hookedControl = React.cloneElement(control, {
      value,
      onChange: this.onChange,
    });
    return (
      <FormItem
        controlId={fieldKey}
        label={
          <FormLabel className="m-r-5">
            {label || fieldKey}
            {compact && description && (
              <Tooltip id="field-descr" placement="right" title={description}>
                <i className="fa fa-info-circle m-l-5" />
              </Tooltip>
            )}
          </FormLabel>
        }
        css={inline && formItemInlineCss}
      >
        {hookedControl}
        {!compact && description && (
          <div
            css={theme => ({
              color: theme.colors.grayscale.base,
              [inline ? 'marginLeft' : 'marginTop']: theme.gridUnit,
            })}
          >
            {description}
          </div>
        )}
      </FormItem>
    );
  }
}
Field.propTypes = propTypes;
Field.defaultProps = defaultProps;
