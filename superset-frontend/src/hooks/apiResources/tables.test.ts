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
import { act, renderHook } from '@testing-library/react-hooks';
import { SupersetClient } from '@superset-ui/core';
import QueryProvider, { queryClient } from 'src/views/QueryProvider';
import { useTables } from './tables';

const fakeApiResult = {
  json: {
    options: [
      {
        id: 1,
        name: 'fake api result1',
        label: 'fake api label1',
      },
      {
        id: 2,
        name: 'fake api result2',
        label: 'fake api label2',
      },
    ],
  },
};

jest.mock('@superset-ui/core', () => ({
  SupersetClient: {
    get: jest.fn().mockResolvedValue(fakeApiResult),
  },
}));

describe('useTables hook', () => {
  beforeEach(() => {
    (SupersetClient.get as jest.Mock).mockClear();
    queryClient.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns api response mapping json options', async () => {
    const expectDbId = 'db1';
    const expectedSchema = 'schemaA';
    const forceRefresh = false;
    const { result } = renderHook(
      () => useTables(expectDbId, expectedSchema, {}),
      {
        wrapper: QueryProvider,
      },
    );
    await act(async () => {
      jest.runAllTimers();
    });
    expect(SupersetClient.get).toHaveBeenCalledTimes(1);
    expect(SupersetClient.get).toHaveBeenCalledWith({
      endpoint: `/superset/tables/${expectDbId}/${expectedSchema}/undefined/${forceRefresh}/`,
    });
    expect(result.current.data).toEqual(fakeApiResult.json.options);
    await act(async () => {
      result.current.refetch();
    });
    expect(SupersetClient.get).toHaveBeenCalledTimes(2);
    expect(SupersetClient.get).toHaveBeenCalledWith({
      endpoint: `/superset/tables/${expectDbId}/${expectedSchema}/undefined/true/`,
    });
    expect(result.current.data).toEqual(fakeApiResult.json.options);
  });

  it('returns cached data without api request', async () => {
    const expectDbId = 'db1';
    const expectedSchema = 'schemaA';
    const { result, rerender } = renderHook(
      () => useTables(expectDbId, expectedSchema, {}),
      {
        wrapper: QueryProvider,
      },
    );
    await act(async () => {
      jest.runAllTimers();
    });
    expect(SupersetClient.get).toHaveBeenCalledTimes(1);
    rerender();
    expect(SupersetClient.get).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(fakeApiResult.json.options);
  });

  it('returns refreshed data after expires', async () => {
    const expectDbId = 'db1';
    const expectedSchema = 'schemaA';
    jest.setSystemTime(new Date('2021-01-01 00:00:00'));
    const { result, rerender } = renderHook(
      () => useTables(expectDbId, expectedSchema, {}),
      {
        wrapper: QueryProvider,
      },
    );
    await act(async () => {
      jest.runAllTimers();
    });
    expect(SupersetClient.get).toHaveBeenCalledTimes(1);
    rerender();
    await act(async () => {
      jest.runAllTimers();
    });
    expect(SupersetClient.get).toHaveBeenCalledTimes(1);
    queryClient.clear();
    rerender();
    await act(async () => {
      jest.runAllTimers();
    });
    expect(SupersetClient.get).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual(fakeApiResult.json.options);
  });
});
