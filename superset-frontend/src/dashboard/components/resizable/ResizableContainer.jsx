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
import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Resizable } from 're-resizable';
import cx from 'classnames';
import { css, styled } from '@superset-ui/core';
import ResizableHandle from './ResizableHandle';
import resizableConfig from '../../util/resizableConfig';
import { GRID_BASE_UNIT, GRID_GUTTER_SIZE } from '../../util/constants';

const proxyToInfinity = Number.MAX_VALUE;

const propTypes = {
  id: PropTypes.string.isRequired,
  children: PropTypes.node,
  adjustableWidth: PropTypes.bool,
  adjustableHeight: PropTypes.bool,
  gutterWidth: PropTypes.number,
  widthStep: PropTypes.number,
  heightStep: PropTypes.number,
  widthMultiple: PropTypes.number,
  heightMultiple: PropTypes.number,
  minWidthMultiple: PropTypes.number,
  maxWidthMultiple: PropTypes.number,
  minHeightMultiple: PropTypes.number,
  maxHeightMultiple: PropTypes.number,
  staticHeight: PropTypes.number,
  staticHeightMultiple: PropTypes.number,
  staticWidth: PropTypes.number,
  staticWidthMultiple: PropTypes.number,
  onResizeStop: PropTypes.func,
  onResize: PropTypes.func,
  onResizeStart: PropTypes.func,
  editMode: PropTypes.bool.isRequired,
};

const defaultProps = {
  children: null,
  adjustableWidth: true,
  adjustableHeight: true,
  gutterWidth: GRID_GUTTER_SIZE,
  widthStep: GRID_BASE_UNIT,
  heightStep: GRID_BASE_UNIT,
  widthMultiple: null,
  heightMultiple: null,
  minWidthMultiple: 1,
  maxWidthMultiple: proxyToInfinity,
  minHeightMultiple: 1,
  maxHeightMultiple: proxyToInfinity,
  staticHeight: null,
  staticHeightMultiple: null,
  staticWidth: null,
  staticWidthMultiple: null,
  onResizeStop: null,
  onResize: null,
  onResizeStart: null,
};

// because columns are not multiples of a single variable (width = n*cols + (n-1) * gutters)
// we snap to the base unit and then snap to _actual_ column multiples on stop
const SNAP_TO_GRID = [GRID_BASE_UNIT, GRID_BASE_UNIT];
const HANDLE_CLASSES = {
  right: 'resizable-container-handle--right',
  bottom: 'resizable-container-handle--bottom',
};

const StyledResizable = styled(Resizable)`
  ${({ theme }) => css`
    &.resizable-container {
      background-color: transparent;
      position: relative;

      /* re-resizable sets an empty div to 100% width and height, which doesn't
      play well with many 100% height containers we need */

      & ~ div {
        width: auto !important;
        height: auto !important;
      }
    }

    &.resizable-container--resizing {
      /* after ensures border visibility on top of any children */

      &:after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        box-shadow: inset 0 0 0 2px ${theme.colors.primary.base};
      }

      & > span .resize-handle {
        border-color: ${theme.colors.primary.base};
      }
    }

    .resize-handle {
      opacity: 0;
      z-index: 10;

      &--bottom-right {
        position: absolute;
        border-right: 1px solid ${theme.colors.text.label};
        border-bottom: 1px solid ${theme.colors.text.label};
        right: ${theme.gridUnit * 4}px;
        bottom: ${theme.gridUnit * 4}px;
        width: ${theme.gridUnit * 2}px;
        height: ${theme.gridUnit * 2}px;
      }

      &--right {
        width: ${theme.gridUnit / 2}px;
        height: ${theme.gridUnit * 5}px;
        right: ${theme.gridUnit}px;
        top: 50%;
        transform: translate(0, -50%);
        position: absolute;
        border-left: 1px solid ${theme.colors.text.label};
        border-right: 1px solid ${theme.colors.text.label};
      }

      &--bottom {
        height: ${theme.gridUnit / 2}px;
        width: ${theme.gridUnit * 5}px;
        bottom: ${theme.gridUnit}px;
        left: 50%;
        transform: translate(-50%);
        position: absolute;
        border-top: 1px solid ${theme.colors.text.label};
        border-bottom: 1px solid ${theme.colors.text.label};
      }
    }
  `}

  &.resizable-container:hover .resize-handle,
  &.resizable-container--resizing .resize-handle {
    opacity: 1;
  }

  .dragdroppable-column & .resizable-container-handle--right {
    /* override the default because the inner column's handle's mouse target is very small */
    right: 0 !important;
  }

  & .resizable-container-handle--bottom {
    bottom: 0 !important;
  }
`;

const ResizableContainer = ({
  id,
  children,
  adjustableWidth,
  adjustableHeight,
  widthStep,
  heightStep,
  widthMultiple,
  heightMultiple,
  staticHeight,
  staticHeightMultiple,
  staticWidth,
  staticWidthMultiple,
  minWidthMultiple,
  maxWidthMultiple,
  minHeightMultiple,
  maxHeightMultiple,
  gutterWidth,
  editMode,
  onResizeStop,
  onResize,
  onResizeStart,
}) => {
  const THRESHOLD = 70;

  const [isResizing, setIsResizing] = useState(false);

  const resizableRef = useRef(null);
  const scrollTimer = useRef(null);
  const initialScrollTop = useRef(0);
  const scrollDirection = useRef(null);
  const prevScrollY = useRef(0);

  const handleScroll = mouseY => {
    if (mouseY < THRESHOLD * 2) {
      scrollDirection.current = 'up';
    } else if (mouseY > window.innerHeight - THRESHOLD) {
      scrollDirection.current = 'down';
    } else {
      scrollDirection.current = null;
    }
  };

  const handleResizeStart = (event, direction, ref) => {
    if (onResizeStart) {
      onResizeStart({ id, direction, ref });
    }
    setIsResizing(true);

    initialScrollTop.current = window.scrollY;

    scrollTimer.current = setInterval(() => {
      if (scrollDirection.current) {
        prevScrollY.current = window.scrollY;
        window.scrollBy(0, scrollDirection.current === 'down' ? 1 : -1);
        const scrollDelta = window.scrollY - prevScrollY.current;
        resizableRef.current.updateSize({
          height: resizableRef.current.state.height + scrollDelta,
        });
      }
    }, 1);
  };

  const handleResize = (event, direction, ref) => {
    if (onResize) {
      onResize({ id, direction, ref });
    }
    handleScroll(event.clientY);
    // const scrollDelta = window.scrollY - initialScrollTop.current;
    // resizableRef.current.updateSize({
    //   height: resizableRef.current.state.height + scrollDelta,
    // });
  };

  const handleResizeStop = (event, direction, ref, delta) => {
    if (onResizeStop) {
      const nextWidthMultiple =
        widthMultiple + Math.round(delta.width / (widthStep + gutterWidth));
      const nextHeightMultiple =
        heightMultiple + Math.round(delta.height / heightStep);

      onResizeStop({
        id,
        widthMultiple: adjustableWidth ? nextWidthMultiple : null,
        heightMultiple: adjustableHeight ? nextHeightMultiple : null,
      });

      setIsResizing(false);
    }

    if (scrollTimer.current) clearInterval(scrollTimer.current);
  };

  const size = {
    width: adjustableWidth
      ? (widthStep + gutterWidth) * widthMultiple - gutterWidth
      : (staticWidthMultiple && staticWidthMultiple * widthStep) ||
        staticWidth ||
        undefined,
    height: adjustableHeight
      ? heightStep * heightMultiple
      : (staticHeightMultiple && staticHeightMultiple * heightStep) ||
        staticHeight ||
        undefined,
  };

  let enableConfig = resizableConfig.notAdjustable;

  if (editMode && adjustableWidth && adjustableHeight) {
    enableConfig = resizableConfig.widthAndHeight;
  } else if (editMode && adjustableWidth) {
    enableConfig = resizableConfig.widthOnly;
  } else if (editMode && adjustableHeight) {
    enableConfig = resizableConfig.heightOnly;
  }

  return (
    <StyledResizable
      ref={resizableRef}
      enable={enableConfig}
      grid={SNAP_TO_GRID}
      minWidth={
        adjustableWidth
          ? minWidthMultiple * (widthStep + gutterWidth) - gutterWidth
          : undefined
      }
      minHeight={adjustableHeight ? minHeightMultiple * heightStep : undefined}
      maxWidth={
        adjustableWidth
          ? Math.max(
              size.width,
              Math.min(
                proxyToInfinity,
                maxWidthMultiple * (widthStep + gutterWidth) - gutterWidth,
              ),
            )
          : undefined
      }
      maxHeight={
        adjustableHeight
          ? Math.max(
              size.height,
              Math.min(proxyToInfinity, maxHeightMultiple * heightStep),
            )
          : undefined
      }
      size={size}
      onResizeStart={handleResizeStart}
      onResize={handleResize}
      onResizeStop={handleResizeStop}
      handleComponent={ResizableHandle}
      className={cx(
        'resizable-container',
        isResizing && 'resizable-container--resizing',
      )}
      handleClasses={HANDLE_CLASSES}
    >
      {children}
    </StyledResizable>
  );
};

ResizableContainer.propTypes = propTypes;
ResizableContainer.defaultProps = defaultProps;

export default ResizableContainer;
