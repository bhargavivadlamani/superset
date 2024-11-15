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
import { useCallback, memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { useSelector, useDispatch } from 'react-redux';
import { logEvent } from 'src/logger/actions';
import { addDangerToast } from 'src/components/MessageToasts/actions';
import { componentLookup } from 'src/dashboard/components/gridComponents';
import getDetailedComponentWidth from 'src/dashboard/util/getDetailedComponentWidth';
import { getActiveFilters } from 'src/dashboard/util/activeDashboardFilters';
import { componentShape } from 'src/dashboard/util/propShapes';
import { COLUMN_TYPE, ROW_TYPE } from 'src/dashboard/util/componentTypes';
import {
  createComponent,
  deleteComponent,
  updateComponents,
  handleComponentDrop,
} from 'src/dashboard/actions/dashboardLayout';
import {
  setDirectPathToChild,
  setActiveTab,
  setFullSizeChartId,
} from 'src/dashboard/actions/dashboardState';

const propTypes = {
  id: PropTypes.string,
  parentId: PropTypes.string,
  depth: PropTypes.number,
  index: PropTypes.number,
  renderHoverMenu: PropTypes.bool,
  renderTabContent: PropTypes.bool,
  onChangeTab: PropTypes.func,
  component: componentShape.isRequired,
  parentComponent: componentShape.isRequired,
  createComponent: PropTypes.func.isRequired,
  deleteComponent: PropTypes.func.isRequired,
  updateComponents: PropTypes.func.isRequired,
  handleComponentDrop: PropTypes.func.isRequired,
  logEvent: PropTypes.func.isRequired,
  directPathToChild: PropTypes.arrayOf(PropTypes.string),
  directPathLastUpdated: PropTypes.number,
  dashboardId: PropTypes.number.isRequired,
  isComponentVisible: PropTypes.bool,
};

const DashboardComponent = ({ id, parentId, ...rest }) => {
  const dispatch = useDispatch();
  const dashboardLayout = useSelector(state => state.dashboardLayout.present);
  const dashboardInfo = useSelector(state => state.dashboardInfo);
  const editMode = useSelector(state => state.dashboardState.editMode);
  const fullSizeChartId = useSelector(
    state => state.dashboardState.fullSizeChartId,
  );
  const dashboardId = dashboardInfo.id;
  const component = dashboardLayout[id];
  const parentComponent = dashboardLayout[parentId];
  const getComponentById = useCallback(
    id => dashboardLayout[id],
    [dashboardLayout],
  );
  const filters = getActiveFilters();
  const embeddedMode = !dashboardInfo.userId;

  const boundActionCreators = useMemo(
    () =>
      bindActionCreators(
        {
          addDangerToast,
          createComponent,
          deleteComponent,
          updateComponents,
          handleComponentDrop,
          setDirectPathToChild,
          setFullSizeChartId,
          setActiveTab,
          logEvent,
        },
        dispatch,
      ),
    [dispatch],
  );

  // rows and columns need more data about their child dimensions
  // doing this allows us to not pass the entire component lookup to all Components
  const { occupiedColumnCount, minColumnWidth } = useMemo(() => {
    if (component) {
      const componentType = component.type;
      if (componentType === ROW_TYPE || componentType === COLUMN_TYPE) {
        const { occupiedWidth, minimumWidth } = getDetailedComponentWidth({
          id,
          components: dashboardLayout,
        });

        if (componentType === ROW_TYPE) {
          return { occupiedColumnCount: occupiedWidth };
        }
        if (componentType === COLUMN_TYPE) {
          return { minColumnWidth: minimumWidth };
        }
      }
      return {};
    }
    return {};
  }, []);

  const Component = component ? componentLookup[component.type] : null;
  return Component ? (
    <Component
      component={component}
      getComponentById={getComponentById}
      parentComponent={parentComponent}
      editMode={editMode}
      filters={filters}
      dashboardId={dashboardId}
      dashboardInfo={dashboardInfo}
      fullSizeChartId={fullSizeChartId}
      occupiedColumnCount={occupiedColumnCount}
      minColumnWidth={minColumnWidth}
      embeddedMode={embeddedMode}
      {...boundActionCreators}
      {...rest}
    />
  ) : null;
};

DashboardComponent.propTypes = propTypes;

export default memo(DashboardComponent);
