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
import { useSelector } from 'react-redux';
import { FeatureFlag, isFeatureEnabled } from 'src/featureFlags';
import { useEffect, useState } from 'react';
import {
  useFilters,
  useNativeFiltersDataMask,
} from '../nativeFilters/FilterBar/state';
import { Filter } from '../nativeFilters/types';
import { RootState } from '../../types';

// eslint-disable-next-line import/prefer-default-export
export const useNativeFilters = () => {
  const [dashboardFiltersOpen, setDashboardFiltersOpen] = useState(true);
  const showNativeFilters = useSelector<RootState, boolean>(
    state => state.dashboardInfo.metadata?.show_native_filters,
  );
  const canEdit = useSelector<RootState, boolean>(
    ({ dashboardInfo }) => dashboardInfo.dash_edit_perm,
  );

  const filters = useFilters();
  const filterValues = Object.values<Filter>(filters);

  const nativeFiltersEnabled =
    showNativeFilters &&
    isFeatureEnabled(FeatureFlag.DASHBOARD_NATIVE_FILTERS) &&
    (canEdit || (!canEdit && filterValues.length !== 0));

  const requiredFirstFilter = filterValues.filter(
    ({ requiredFirst }) => requiredFirst,
  );
  const dataMask = useNativeFiltersDataMask();
  const showDashboard =
    !nativeFiltersEnabled ||
    !(
      nativeFiltersEnabled &&
      requiredFirstFilter.length &&
      requiredFirstFilter.find(
        ({ id }) => dataMask[id]?.filterState?.value === undefined,
      )
    );

  const toggleDashboardFiltersOpen = (visible?: boolean) => {
    setDashboardFiltersOpen(visible ?? !dashboardFiltersOpen);
  };

  useEffect(() => {
    if (
      filterValues.length === 0 &&
      dashboardFiltersOpen &&
      nativeFiltersEnabled
    ) {
      toggleDashboardFiltersOpen(false);
    }
  }, [filterValues.length]);

  return {
    showDashboard,
    dashboardFiltersOpen,
    toggleDashboardFiltersOpen,
    nativeFiltersEnabled,
  };
};
