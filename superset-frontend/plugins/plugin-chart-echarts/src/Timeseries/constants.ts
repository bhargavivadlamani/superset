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
import {
  DEFAULT_SORT_SERIES_DATA,
  sections,
} from '@superset-ui/chart-controls';
import { RequiredKeys, t } from '@superset-ui/core';
import {
  OrientationType,
  EchartsTimeseriesSeriesType,
  EchartsTimeseriesFormData,
} from './types';
import {
  DEFAULT_LEGEND_FORM_DATA,
  DEFAULT_TITLE_FORM_DATA,
} from '../constants';

export const DEFAULT_FORM_DATA: Omit<
  EchartsTimeseriesFormData,
  'datasource' | 'viz_type'
> = {
  ...DEFAULT_LEGEND_FORM_DATA,
  ...DEFAULT_TITLE_FORM_DATA,
  ...DEFAULT_SORT_SERIES_DATA,
  annotationLayers: sections.annotationLayers,
  area: false,
  forecastEnabled: sections.FORECAST_DEFAULT_DATA.forecastEnabled,
  forecastInterval: sections.FORECAST_DEFAULT_DATA.forecastInterval,
  forecastPeriods: sections.FORECAST_DEFAULT_DATA.forecastPeriods,
  forecastSeasonalityDaily:
    sections.FORECAST_DEFAULT_DATA.forecastSeasonalityDaily,
  forecastSeasonalityWeekly:
    sections.FORECAST_DEFAULT_DATA.forecastSeasonalityWeekly,
  forecastSeasonalityYearly:
    sections.FORECAST_DEFAULT_DATA.forecastSeasonalityYearly,
  logAxis: false,
  markerEnabled: false,
  markerSize: 6,
  metrics: [],
  minorSplitLine: false,
  opacity: 0.2,
  orderDesc: true,
  rowLimit: 10000,
  seriesType: EchartsTimeseriesSeriesType.Line,
  stack: false,
  tooltipTimeFormat: 'smart_date',
  truncateYAxis: false,
  yAxisBounds: [null, null],
  zoomable: false,
  richTooltip: true,
  xAxisLabelRotation: 0,
  groupby: [],
  showValue: false,
  onlyTotal: false,
  percentageThreshold: 0,
  orientation: OrientationType.vertical,
  sort_series_type: 'sum',
  sort_series_ascending: false,
};

export const TIME_SERIES_DESCRIPTION_TEXT: string = t(
  'When using other than adaptive formatting, labels may overlap',
);

export const FORM_DATA_REQUIRED_PROPERTIES: Record<
  keyof RequiredKeys<EchartsTimeseriesFormData>,
  true
> = {
  annotationLayers: true,
  area: true,
  datasource: true,
  forecastEnabled: true,
  forecastPeriods: true,
  forecastInterval: true,
  forecastSeasonalityDaily: true,
  forecastSeasonalityWeekly: true,
  forecastSeasonalityYearly: true,
  groupby: true,
  legendMargin: true,
  legendOrientation: true,
  legendType: true,
  logAxis: true,
  markerEnabled: true,
  markerSize: true,
  metrics: true,
  minorSplitLine: true,
  onlyTotal: true,
  opacity: true,
  orderDesc: true,
  percentageThreshold: true,
  richTooltip: true,
  rowLimit: true,
  seriesType: true,
  showExtraControls: true,
  showLegend: true,
  showValue: true,
  stack: true,
  truncateYAxis: true,
  viz_type: true,
  xAxisLabelRotation: true,
  xAxisTitle: true,
  xAxisTitleMargin: true,
  yAxisBounds: true,
  yAxisTitle: true,
  yAxisTitleMargin: true,
  yAxisTitlePosition: true,
  zoomable: true,
};
