/* eslint-disable no-param-reassign */
/* eslint-disable camelcase */
/* eslint-disable no-loop-func */
import {
  ROW_TYPE,
  COLUMN_TYPE,
  CHART_TYPE,
  MARKDOWN_TYPE,
  DASHBOARD_ROOT_TYPE,
  DASHBOARD_GRID_TYPE,
} from './componentTypes';

import {
  DASHBOARD_GRID_ID,
  DASHBOARD_ROOT_ID,
  DASHBOARD_VERSION_KEY,
  GRID_MIN_COLUMN_COUNT,
  GRID_MIN_ROW_UNITS,
  GRID_COLUMN_COUNT,
} from './constants';

const MAX_RECURSIVE_LEVEL = 6;
const GRID_RATIO = 4;
const ROW_HEIGHT = 8;
const generateId = (() => {
  let componentId = 1;
  return () => {
    const id = componentId;
    componentId += 1;
    return id;
  };
})();

/**
 *
 * @param positions: single array of slices
 * @returns boundary object {top: number, bottom: number, left: number, right: number}
 */
function getBoundary(positions) {
  let top = Number.MAX_VALUE;
  let bottom = 0;
  let left = Number.MAX_VALUE;
  let right = 1;
  positions.forEach(item => {
    const { row, col, size_x, size_y } = item;
    if (row <= top) top = row;
    if (col <= left) left = col;
    if (bottom <= row + size_y) bottom = row + size_y;
    if (right <= col + size_x) right = col + size_x;
  });

  return {
    top,
    bottom,
    left,
    right,
  };
}

function getRowContainer() {
  return {
    type: ROW_TYPE,
    id: `DASHBOARD_ROW_TYPE-${generateId()}`,
    children: [],
    meta: {
      background: 'BACKGROUND_TRANSPARENT',
    },
  };
}

function getColContainer() {
  return {
    type: COLUMN_TYPE,
    id: `DASHBOARD_COLUMN_TYPE-${generateId()}`,
    children: [],
    meta: {
      background: 'BACKGROUND_TRANSPARENT',
    },
  };
}

function getChartHolder(item) {
  const { size_x, size_y, slice_id, code, slice_name } = item;

  const width = Math.max(
    GRID_MIN_COLUMN_COUNT,
    Math.round(size_x / GRID_RATIO),
  );
  const height = Math.max(
    GRID_MIN_ROW_UNITS,
    Math.round(size_y / GRID_RATIO * 100 / ROW_HEIGHT),
  );
  if (code !== undefined) {
    let markdownContent = '';
    if (slice_name) {
      markdownContent = `##### **${slice_name}**\n`;
    }
    if (code) {
      markdownContent += code;
    }
    return {
      type: MARKDOWN_TYPE,
      id: `DASHBOARD_MARKDOWN_TYPE-${generateId()}`,
      children: [],
      meta: {
        width,
        height,
        code: markdownContent,
      },
    };
  }
  return {
    type: CHART_TYPE,
    id: `DASHBOARD_CHART_TYPE-${generateId()}`,
    children: [],
    meta: {
      width,
      height,
      chartId: parseInt(slice_id, 10),
    },
  };
}

function getChildrenMax(items, attr, layout) {
  return Math.max.apply(null, items.map(child => layout[child].meta[attr]));
}

function getChildrenSum(items, attr, layout) {
  return items.reduce(
    (preValue, child) => preValue + layout[child].meta[attr],
    0,
  );
}

function sortByRowId(item1, item2) {
  return item1.row - item2.row;
}

function sortByColId(item1, item2) {
  return item1.col - item2.col;
}

function hasOverlap(positions, xAxis = true) {
  return positions
    .slice()
    .sort(xAxis ? sortByColId : sortByRowId)
    .some((item, index, arr) => {
      if (index === arr.length - 1) {
        return false;
      }

      if (xAxis) {
        return item.col + item.size_x > arr[index + 1].col;
      }
      return item.row + item.size_y > arr[index + 1].row;
    });
}

function isWideLeafComponent(component) {
  return (
    [CHART_TYPE, MARKDOWN_TYPE].indexOf(component.type) > -1 &&
    component.meta.width > GRID_MIN_COLUMN_COUNT
  );
}

function canReduceColumnWidth(columnComponent, root) {
  return (
    columnComponent.type === COLUMN_TYPE &&
    columnComponent.meta.width > GRID_MIN_COLUMN_COUNT &&
    columnComponent.children.every(
      childId =>
        isWideLeafComponent(root[childId]) ||
        (root[childId].type === ROW_TYPE &&
          root[childId].children.every(id => isWideLeafComponent(root[id]))),
    )
  );
}

function reduceRowWidth(rowComponent, root) {
  // find widest free chart and reduce width
  const widestChartId = rowComponent.children
    .filter(childId => isWideLeafComponent(root[childId]))
    .reduce((prev, current) => {
      if (root[prev].meta.width >= root[current].meta.width) {
        return prev;
      }
      return current;
    });

  if (widestChartId) {
    root[widestChartId].meta.width -= 1;
  }
  return getChildrenSum(rowComponent.children, 'width', root);
}

function reduceComponentWidth(component) {
  if (isWideLeafComponent(component)) {
    component.meta.width -= 1;
  }
  return component.meta.width;
}

function doConvert(positions, level, parent, root) {
  if (positions.length === 0) {
    return;
  }

  if (positions.length === 1 || level >= MAX_RECURSIVE_LEVEL) {
    // special treatment for single chart dash, always wrap chart inside a row
    if (parent.type === DASHBOARD_GRID_TYPE) {
      const rowContainer = getRowContainer();
      root[rowContainer.id] = rowContainer;
      parent.children.push(rowContainer.id);
      parent = rowContainer;
    }

    const chartHolder = getChartHolder(positions[0]);
    root[chartHolder.id] = chartHolder;
    parent.children.push(chartHolder.id);
    return;
  }

  let currentItems = positions.slice();
  const { top, bottom, left, right } = getBoundary(positions);
  // find row dividers
  const layers = [];
  let currentRow = top + 1;
  while (currentItems.length && currentRow <= bottom) {
    const upper = [];
    const lower = [];

    const isRowDivider = currentItems.every(item => {
      const { row, size_y } = item;
      if (row + size_y <= currentRow) {
        lower.push(item);
        return true;
      } else if (row >= currentRow) {
        upper.push(item);
        return true;
      }
      return false;
    });

    if (isRowDivider) {
      currentItems = upper.slice();
      layers.push(lower);
    }
    currentRow += 1;
  }

  layers.forEach(layer => {
    if (layer.length === 0) {
      return;
    }

    if (layer.length === 1 && parent.type === COLUMN_TYPE) {
      const chartHolder = getChartHolder(layer[0]);
      root[chartHolder.id] = chartHolder;
      parent.children.push(chartHolder.id);
      return;
    }

    // create a new row
    const rowContainer = getRowContainer();
    root[rowContainer.id] = rowContainer;
    parent.children.push(rowContainer.id);

    currentItems = layer.slice();
    if (!hasOverlap(currentItems)) {
      currentItems.sort(sortByColId).forEach(item => {
        const chartHolder = getChartHolder(item);
        root[chartHolder.id] = chartHolder;
        rowContainer.children.push(chartHolder.id);
      });
    } else {
      // find col dividers for each layer
      let currentCol = left + 1;
      while (currentItems.length && currentCol <= right) {
        const upper = [];
        const lower = [];

        const isColDivider = currentItems.every(item => {
          const { col, size_x } = item;
          if (col + size_x <= currentCol) {
            lower.push(item);
            return true;
          } else if (col >= currentCol) {
            upper.push(item);
            return true;
          }
          return false;
        });

        if (isColDivider) {
          if (lower.length === 1) {
            const chartHolder = getChartHolder(lower[0]);
            root[chartHolder.id] = chartHolder;
            rowContainer.children.push(chartHolder.id);
          } else {
            // create a new column
            const colContainer = getColContainer();
            root[colContainer.id] = colContainer;

            if (!hasOverlap(lower, false)) {
              lower.sort(sortByRowId).forEach(item => {
                const chartHolder = getChartHolder(item);
                root[chartHolder.id] = chartHolder;
                colContainer.children.push(chartHolder.id);
              });
            } else {
              doConvert(lower, level + 2, colContainer, root);
            }

            // add col meta
            if (colContainer.children.length) {
              rowContainer.children.push(colContainer.id);
              // add col meta
              colContainer.meta.width = getChildrenMax(
                colContainer.children,
                'width',
                root,
              );
            }
          }

          currentItems = upper.slice();
        }
        currentCol += 1;
      }
    }

    rowContainer.meta.width = getChildrenSum(
      rowContainer.children,
      'width',
      root,
    );
  });
}

export function convertToLayout(positions) {
  const root = {
    [DASHBOARD_VERSION_KEY]: 'v2',
    [DASHBOARD_ROOT_ID]: {
      type: DASHBOARD_ROOT_TYPE,
      id: DASHBOARD_ROOT_ID,
      children: [DASHBOARD_GRID_ID],
    },
    [DASHBOARD_GRID_ID]: {
      type: DASHBOARD_GRID_TYPE,
      id: DASHBOARD_GRID_ID,
      children: [],
    },
  };

  doConvert(positions, 0, root[DASHBOARD_GRID_ID], root);

  // remove row's width/height and col's height
  Object.values(root).forEach(item => {
    if (ROW_TYPE === item.type) {
      const meta = item.meta;
      if (meta.width > GRID_COLUMN_COUNT) {
        let currentWidth = meta.width;
        while (
          currentWidth > GRID_COLUMN_COUNT &&
          item.children.filter(id => isWideLeafComponent(root[id])).length
        ) {
          currentWidth = reduceRowWidth(item, root);
        }

        // reduce column width
        if (currentWidth > GRID_COLUMN_COUNT) {
          // find column that: width > 2 and each row has at least 1 chart can reduce
          // 2 loops: same column may reduce multiple times
          let colIds;
          do {
            colIds = item.children.filter(colId =>
              canReduceColumnWidth(root[colId], root),
            );
            let idx = 0;
            while (idx < colIds.length && currentWidth > GRID_COLUMN_COUNT) {
              const currentColumn = colIds[idx];
              root[currentColumn].children.forEach(childId => {
                if (root[childId].type === ROW_TYPE) {
                  root[childId].meta.width = reduceRowWidth(
                    root[childId],
                    root,
                  );
                } else {
                  root[childId].meta.width = reduceComponentWidth(
                    root[childId],
                  );
                }
              });
              root[currentColumn].meta.width = getChildrenMax(
                root[currentColumn].children,
                'width',
                root,
              );
              currentWidth = getChildrenSum(item.children, 'width', root);
              idx += 1;
            }
          } while (colIds.length && currentWidth > GRID_COLUMN_COUNT);
        }
      }
      delete meta.width;
    }
  });

  // console.log(JSON.stringify(root));
  return root;
}

export default function(dashboard) {
  const positions = [];

  // position data clean up. some dashboard didn't have position_json
  let { position_json } = dashboard;
  const positionDict = {};
  if (Array.isArray(position_json)) {
    position_json.forEach(position => {
      positionDict[position.slice_id] = position;
    });
  } else {
    position_json = [];
  }

  const lastRowId = Math.max(
    0,
    Math.max.apply(null, position_json.map(pos => pos.row + pos.size_y)),
  );
  let newSliceCounter = 0;
  dashboard.slices.forEach(({ slice_id, form_data, slice_name }) => {
    let position = positionDict[slice_id];
    if (!position) {
      // append new slices to dashboard bottom, 3 slices per row
      position = {
        col: (newSliceCounter % 3) * 16 + 1,
        row: lastRowId + Math.floor(newSliceCounter / 3) * 16,
        size_x: 16,
        size_y: 16,
        slice_id,
      };
      newSliceCounter += 1;
    }
    if (form_data && ['markup', 'separator'].indexOf(form_data.viz_type) > -1) {
      position = {
        ...position,
        code: form_data.code,
        slice_name,
      };
    }
    positions.push(position);
  });

  return convertToLayout(positions);
}
