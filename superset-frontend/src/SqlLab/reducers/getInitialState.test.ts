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

import getInitialState, { dedupeTabHistory } from './getInitialState';

const apiData = {
  defaultDbId: 1,
  common: {
    conf: {
      DEFAULT_SQLLAB_LIMIT: 1,
    },
  },
  active_tab: null,
  tab_state_ids: [],
  databases: [],
  queries: [],
  requested_query: null,
  user: {
    userId: 1,
    username: 'some name',
  },
};
const apiDataWithTabState = {
  ...apiData,
  tab_state_ids: [{ id: 1 }],
  active_tab: { id: 1, table_schemas: [] },
};
describe('getInitialState', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('should output the user that is passed in', () => {
    expect(getInitialState(apiData).sqlLab.user.userId).toEqual(1);
  });
  it('should return undefined instead of null for templateParams', () => {
    expect(
      getInitialState(apiDataWithTabState).sqlLab.queryEditors[0]
        .templateParams,
    ).toBeUndefined();
  });

  describe('dedupeTabHistory', () => {
    it('should dedupe the tab history', () => {
      [
        { value: [], expected: [] },
        { value: [12, 3, 4, 5, 6], expected: [12, 3, 4, 5, 6] },
        { value: [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2], expected: [1, 2] },
        {
          value: [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3],
          expected: [1, 2, 3],
        },
        { value: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3], expected: [2, 3] },
      ].forEach(({ value, expected }) => {
        expect(dedupeTabHistory(value)).toEqual(expected);
      });
    });
  });

  describe('dedupe tables schema', () => {
    it('should dedupe the table schema', () => {
      localStorage.setItem(
        'redux',
        JSON.stringify({
          sqlLab: {
            tables: [
              { id: 1, name: 'test1' },
              { id: 6, name: 'test6' },
            ],
            queryEditors: [{ id: 1, title: 'editor1' }],
            queries: {},
            tabHistory: [],
          },
        }),
      );
      const initializedTables = getInitialState({
        ...apiData,
        active_tab: {
          id: 1,
          table_schemas: [
            {
              id: 1,
              table: 'table1',
              tab_state_id: 1,
              description: {
                columns: [
                  { name: 'id', type: 'INT' },
                  { name: 'column2', type: 'STRING' },
                ],
              },
            },
            {
              id: 2,
              table: 'table2',
              tab_state_id: 1,
              description: {
                columns: [
                  { name: 'id', type: 'INT' },
                  { name: 'column2', type: 'STRING' },
                ],
              },
            },
          ],
        },
      }).sqlLab.tables;
      expect(initializedTables.map(({ id }) => id)).toEqual([1, 2, 6]);
    });
  });

  describe('restore unsaved changes for PERSISTENCE mode', () => {
    const lastUpdatedTime = Date.now();
    const expectedValue = 'updated editor value';
    beforeEach(() => {
      localStorage.setItem(
        'redux',
        JSON.stringify({
          sqlLab: {
            queryEditors: [
              {
                // restore cached value since updates are after server update time
                id: '1',
                name: expectedValue,
                updatedAt: lastUpdatedTime + 100,
              },
              {
                // out of update since last updated time is before server update time
                id: '2',
                name: expectedValue,
                updatedAt: lastUpdatedTime - 100,
              },
              {
                // out of update since no updatedAt
                id: '3',
                name: expectedValue,
              },
            ],
          },
        }),
      );
    });

    it('restore unsaved changes for PERSISTENCE mode', () => {
      const apiDataWithLocalStorage = {
        ...apiData,
        active_tab: {
          id: 1,
          label: 'persisted tab',
          table_schemas: [],
          extra_json: {
            updatedAt: lastUpdatedTime,
          },
        },
        tab_state_ids: [{ id: 1 }],
      };
      expect(
        getInitialState(apiDataWithLocalStorage).sqlLab.queryEditors[0],
      ).toEqual(
        expect.objectContaining({
          id: '1',
          name: expectedValue,
        }),
      );
    });

    it('skip unsaved changes for expired data', () => {
      const apiDataWithLocalStorage = {
        ...apiData,
        active_tab: {
          id: 2,
          label: 'persisted tab',
          table_schemas: [],
          extra_json: {
            updatedAt: lastUpdatedTime,
          },
        },
        tab_state_ids: [{ id: 2 }],
      };
      expect(
        getInitialState(apiDataWithLocalStorage).sqlLab.queryEditors[1],
      ).toEqual(
        expect.objectContaining({
          id: '2',
          name: apiDataWithLocalStorage.active_tab.label,
        }),
      );
    });

    it('skip unsaved changes for legacy cache data', () => {
      const apiDataWithLocalStorage = {
        ...apiData,
        active_tab: {
          id: 3,
          label: 'persisted tab',
          table_schemas: [],
          extra_json: {
            updatedAt: lastUpdatedTime,
          },
        },
        tab_state_ids: [{ id: 3 }],
      };
      expect(
        getInitialState(apiDataWithLocalStorage).sqlLab.queryEditors[2],
      ).toEqual(
        expect.objectContaining({
          id: '3',
          name: apiDataWithLocalStorage.active_tab.label,
        }),
      );
    });
  });
});
