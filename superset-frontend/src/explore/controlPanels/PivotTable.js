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
import { formatSelectOptions } from '../../modules/utils';

export default {
  controlPanelSections: [
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        ['metrics'],
        ['adhoc_filters'],
        ['groupby'],
        ['columns'],
        ['row_limit', null],
      ],
    },
    {
      label: t('Pivot Options'),
      controlSetRows: [
        [
          {
            name: 'pandas_aggfunc',
            config: {
              type: 'SelectControl',
              label: t('Aggregation function'),
              clearable: false,
              choices: formatSelectOptions([
                'sum',
                'mean',
                'min',
                'max',
                'std',
                'var',
              ]),
              default: 'sum',
              description: t(
                'Aggregate function to apply when pivoting and ' +
                  'computing the total rows and columns',
              ),
            },
          },
          {
            name: 'pivot_margins',
            config: {
              type: 'CheckboxControl',
              label: t('Show totals'),
              renderTrigger: false,
              default: true,
              description: t('Display total row/column'),
            },
          },
        ],
        [
          'number_format',
          {
            name: 'combine_metric',
            config: {
              type: 'CheckboxControl',
              label: t('Combine Metrics'),
              default: false,
              description: t(
                'Display metrics side by side within each column, as ' +
                  'opposed to each column being displayed side by side for each metric.',
              ),
            },
          },
        ],
        [
          {
            name: 'transpose_pivot',
            config: {
              type: 'CheckboxControl',
              label: t('Transpose Pivot'),
              default: false,
              description: t('Swap Groups and Columns'),
            },
          },
        ],
      ],
    },
  ],
  controlOverrides: {
    groupby: { includeTime: true },
    columns: { includeTime: true },
  },
  sectionOverrides: {
    druidTimeSeries: {
      controlSetRows: [['granularity', 'druid_time_origin'], ['time_range']],
    },
    sqlaTimeSeries: {
      controlSetRows: [['granularity_sqla', 'time_grain_sqla'], ['time_range']],
    },
  },
};
