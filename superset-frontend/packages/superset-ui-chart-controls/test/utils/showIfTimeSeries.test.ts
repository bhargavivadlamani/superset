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
import { showIfTimeSeries } from '../../src';

const mockData = {
  actions: {
    setDatasource: jest.fn(),
  },
  controls: {
    x_axis: {
      type: 'SelectControl' as const,
      value: 'not_temporal',
      options: [
        { column_name: 'not_temporal', is_dttm: false },
        { column_name: 'ds', is_dttm: true },
      ],
    },
  },
  exportState: {},
  form_data: {
    datasource: '22__table',
    viz_type: 'table',
  },
};

describe('showIfTimeSeries', () => {
  it('returns true when no x-axis exists', () => {
    expect(
      showIfTimeSeries({
        ...mockData,
        controls: {
          control_options: {
            type: 'SelectControl',
            value: 'not_temporal',
            options: [],
          },
        },
      }),
    ).toBeTruthy();
  });

  it('returns false when x-axis value is not temporal', () => {
    expect(showIfTimeSeries(mockData)).toBeFalsy();
  });

  it('returns true when x-axis value is temporal', () => {
    expect(
      showIfTimeSeries({
        ...mockData,
        controls: {
          x_axis: {
            ...mockData.controls.x_axis,
            value: 'ds',
          },
        },
      }),
    ).toBeTruthy();
  });

  it('returns true when x-axis is ad-hoc column', () => {
    expect(
      showIfTimeSeries({
        ...mockData,
        controls: {
          x_axis: {
            ...mockData.controls.x_axis,
            value: {
              sqlExpression: 'ds',
              label: 'ds',
              expressionType: 'SQL',
            },
          },
        },
      }),
    ).toBeTruthy();
  });
});
