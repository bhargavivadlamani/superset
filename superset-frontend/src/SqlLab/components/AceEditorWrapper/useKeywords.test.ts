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
import fetchMock from 'fetch-mock';
import { act, renderHook } from '@testing-library/react-hooks';
import {
  createWrapper,
  defaultStore as store,
  createStore,
} from 'spec/helpers/testing-library';
import { api } from 'src/hooks/apiResources/queryApi';
import { tableApiUtil } from 'src/hooks/apiResources/tables';
import { addTable } from 'src/SqlLab/actions/sqlLab';
import { initialState } from 'src/SqlLab/fixtures';
import { reducers } from 'src/SqlLab/reducers';
import {
  SCHEMA_AUTOCOMPLETE_SCORE,
  TABLE_AUTOCOMPLETE_SCORE,
  COLUMN_AUTOCOMPLETE_SCORE,
  SQL_FUNCTIONS_AUTOCOMPLETE_SCORE,
} from 'src/SqlLab/constants';
import { useKeywords } from './useKeywords';

const fakeSchemaApiResult = ['schema1', 'schema2'];
const fakeTableApiResult = {
  count: 2,
  result: [
    {
      id: 1,
      value: 'fake api result1',
      label: 'fake api label1',
    },
    {
      id: 2,
      value: 'fake api result2',
      label: 'fake api label2',
    },
  ],
};
const fakeFunctionNamesApiResult = {
  function_names: ['abs', 'avg', 'sum'],
};

afterEach(() => {
  fetchMock.reset();
  act(() => {
    store.dispatch(api.util.resetApiState());
  });
});

test('returns keywords including fetched data', async () => {
  const expectDbId = 1;
  const expectSchema = 'schema1';

  const schemaApiRoute = `glob:*/api/v1/database/${expectDbId}/schemas/*`;
  const tableApiRoute = `glob:*/api/v1/database/${expectDbId}/tables/?q=*`;
  const dbFunctionNamesApiRoute = `glob:*/api/v1/database/${expectDbId}/function_names/`;

  fetchMock.get(schemaApiRoute, {
    result: fakeSchemaApiResult,
  });
  fetchMock.get(tableApiRoute, fakeTableApiResult);
  fetchMock.get(dbFunctionNamesApiRoute, fakeFunctionNamesApiResult);

  const { result, waitFor } = renderHook(
    () =>
      useKeywords({
        queryEditorId: 'testqueryid',
        dbId: expectDbId,
        schema: expectSchema,
      }),
    {
      wrapper: createWrapper({
        useRedux: true,
        store,
      }),
    },
  );

  await waitFor(() => expect(fetchMock.calls(schemaApiRoute).length).toBe(1));
  await waitFor(() => expect(fetchMock.calls(tableApiRoute).length).toBe(1));
  await waitFor(() =>
    expect(fetchMock.calls(dbFunctionNamesApiRoute).length).toBe(1),
  );
  fakeSchemaApiResult.forEach(schema => {
    expect(result.current).toContainEqual(
      expect.objectContaining({
        name: schema,
        score: SCHEMA_AUTOCOMPLETE_SCORE,
        meta: 'schema',
      }),
    );
  });
  fakeTableApiResult.result.forEach(({ value }) => {
    expect(result.current).toContainEqual(
      expect.objectContaining({
        value,
        score: TABLE_AUTOCOMPLETE_SCORE,
        meta: 'table',
      }),
    );
  });
  fakeFunctionNamesApiResult.function_names.forEach(func => {
    expect(result.current).toContainEqual(
      expect.objectContaining({
        name: func,
        value: func,
        meta: 'function',
        score: SQL_FUNCTIONS_AUTOCOMPLETE_SCORE,
      }),
    );
  });
});

test('skip fetching if autocomplete skipped', () => {
  const expectDbId = 1;
  const expectSchema = 'schema1';
  const { result } = renderHook(
    () =>
      useKeywords(
        {
          queryEditorId: 'testqueryid',
          dbId: expectDbId,
          schema: expectSchema,
        },
        true,
      ),
    {
      wrapper: createWrapper({
        useRedux: true,
        store,
      }),
    },
  );
  expect(result.current).toEqual([]);
  expect(fetchMock.calls()).toEqual([]);
});

test('returns column keywords among selected tables', async () => {
  const expectDbId = 1;
  const expectSchema = 'schema1';
  const expectTable = 'table1';
  const expectColumn = 'column1';
  const expectQueryEditorId = 'testqueryid';

  const unexpectedColumn = 'column2';
  const unexpectedTable = 'table2';

  const schemaApiRoute = `glob:*/api/v1/database/${expectDbId}/schemas/*`;
  const tableApiRoute = `glob:*/api/v1/database/${expectDbId}/tables/?q=*`;
  const dbFunctionNamesApiRoute = `glob:*/api/v1/database/${expectDbId}/function_names/`;
  const storeWithSqlLab = createStore(initialState, reducers);
  fetchMock.get(schemaApiRoute, {
    result: fakeSchemaApiResult,
  });
  fetchMock.get(tableApiRoute, fakeTableApiResult);
  fetchMock.get(dbFunctionNamesApiRoute, fakeFunctionNamesApiResult);

  act(() => {
    storeWithSqlLab.dispatch(
      tableApiUtil.upsertQueryData(
        'tableMetadata',
        { dbId: expectDbId, schema: expectSchema, table: expectTable },
        {
          name: expectTable,
          columns: [
            {
              name: expectColumn,
              type: 'VARCHAR',
            },
          ],
        },
      ),
    );

    storeWithSqlLab.dispatch(
      tableApiUtil.upsertQueryData(
        'tableMetadata',
        { dbId: expectDbId, schema: expectSchema, table: unexpectedTable },
        {
          name: unexpectedTable,
          columns: [
            {
              name: unexpectedColumn,
              type: 'VARCHAR',
            },
          ],
        },
      ),
    );
    storeWithSqlLab.dispatch(
      addTable({ id: expectQueryEditorId }, expectTable, expectSchema),
    );
  });

  const { result, waitFor } = renderHook(
    () =>
      useKeywords({
        queryEditorId: expectQueryEditorId,
        dbId: expectDbId,
        schema: expectSchema,
      }),
    {
      wrapper: createWrapper({
        useRedux: true,
        store: storeWithSqlLab,
      }),
    },
  );

  await waitFor(() =>
    expect(result.current).toContainEqual(
      expect.objectContaining({
        name: expectColumn,
        value: expectColumn,
        score: COLUMN_AUTOCOMPLETE_SCORE,
        meta: 'column',
      }),
    ),
  );

  expect(result.current).not.toContainEqual(
    expect.objectContaining({
      name: unexpectedColumn,
    }),
  );

  act(() => {
    storeWithSqlLab.dispatch(
      addTable({ id: expectQueryEditorId }, unexpectedTable, expectSchema),
    );
  });

  await waitFor(() =>
    expect(result.current).toContainEqual(
      expect.objectContaining({
        name: unexpectedColumn,
      }),
    ),
  );
});
