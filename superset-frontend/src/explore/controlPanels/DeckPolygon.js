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
import { t } from '@superset-ui/translation';
import timeGrainSqlaAnimationOverrides from './timeGrainSqlaAnimationOverrides';
import { formatSelectOptions } from '../../modules/utils';
import {
  filterNulls,
  autozoom,
  jsColumns,
  jsDataMutator,
  jsTooltip,
  jsOnclickHref,
  legendFormat,
  legendPosition,
  lineColumn,
  fillColorPicker,
} from './Shared_DeckGL';

export default {
  requiresTime: true,
  controlPanelSections: [
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        [
          Object.assign({}, lineColumn, {
            label: t('Polygon Column'),
          }),
          'line_type',
        ],
        ['adhoc_filters'],
        ['metric', 'point_radius_fixed'],
        ['row_limit', null],
        ['reverse_long_lat', filterNulls],
      ],
    },
    {
      label: t('Map'),
      expanded: true,
      controlSetRows: [
        ['mapbox_style', 'viewport'],
        [autozoom, null],
      ],
    },
    {
      label: t('Polygon Settings'),
      expanded: true,
      controlSetRows: [
        [fillColorPicker, 'stroke_color_picker'],
        ['filled', 'stroked'],
        ['extruded', 'multiplier'],
        ['line_width', null],
        [
          'linear_color_scheme',
          {
            name: 'opacity',
            config: {
              type: 'SliderControl',
              label: t('Opacity'),
              default: 80,
              step: 1,
              min: 0,
              max: 100,
              renderTrigger: true,
              description: t('Opacity, expects values between 0 and 100'),
            },
          },
        ],
        [
          {
            name: 'num_buckets',
            config: {
              type: 'SelectControl',
              multi: false,
              freeForm: true,
              label: t('Number of buckets to group data'),
              default: 5,
              choices: formatSelectOptions([2, 3, 5, 10]),
              description: t('How many buckets should the data be grouped in.'),
              renderTrigger: true,
            },
          },
          {
            name: 'break_points',
            config: {
              type: 'SelectControl',
              multi: true,
              freeForm: true,
              label: t('Bucket break points'),
              choices: formatSelectOptions([]),
              description: t(
                'List of n+1 values for bucketing metric into n buckets.',
              ),
              renderTrigger: true,
            },
          },
        ],
        [
          'table_filter',
          {
            name: 'toggle_polygons',
            config: {
              type: 'CheckboxControl',
              label: t('Multiple filtering'),
              renderTrigger: true,
              default: true,
              description: t(
                'Allow sending multiple polygons as a filter event',
              ),
            },
          },
        ],
        [legendPosition, legendFormat],
      ],
    },
    {
      label: t('Advanced'),
      controlSetRows: [
        [jsColumns],
        [jsDataMutator],
        [jsTooltip],
        [jsOnclickHref],
      ],
    },
  ],
  controlOverrides: {
    metric: {
      validators: [],
    },
    line_type: {
      label: t('Polygon Encoding'),
    },
    point_radius_fixed: {
      label: t('Elevation'),
    },
    time_grain_sqla: timeGrainSqlaAnimationOverrides,
  },
};
