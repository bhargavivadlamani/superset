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
  buildQueryContext,
  QueryFormData,
  QueryObject,
  normalizeOrderBy,
  PostProcessingPivot,
} from '@superset-ui/core';
import {
  pivotOperator,
  renameOperator,
  flattenOperator,
  isTimeComparison,
  timeComparePivotOperator,
  rollingWindowOperator,
  timeCompareOperator,
  resampleOperator,
} from '@superset-ui/chart-controls';
import {
  removeFormDataSuffix,
  removeUnusedFormData,
} from '../utils/removeFormDataSuffix';

export default function buildQuery(formData: QueryFormData) {
  const baseFormData = {
    ...formData,
    is_timeseries: true,
    columns: formData.groupby,
    columns_b: formData.groupby_b,
  };
  const formData1 = removeUnusedFormData(baseFormData, '_b');
  const formData2 = removeFormDataSuffix(baseFormData, '_b');

  const queryContexts = [formData1, formData2].map(fd =>
    buildQueryContext(fd, baseQueryObject => {
      const queryObject = {
        ...baseQueryObject,
        is_timeseries: true,
      };

      const pivotOperatorInRuntime: PostProcessingPivot = isTimeComparison(
        fd,
        queryObject,
      )
        ? timeComparePivotOperator(fd, queryObject)
        : pivotOperator(fd, queryObject);

      const tmpQueryObject = {
        ...queryObject,
        time_offsets: isTimeComparison(fd, queryObject) ? fd.time_compare : [],
        post_processing: [
          pivotOperatorInRuntime,
          rollingWindowOperator(fd, queryObject),
          timeCompareOperator(fd, queryObject),
          resampleOperator(fd, queryObject),
          renameOperator(fd, queryObject),
          flattenOperator(fd, queryObject),
        ],
      } as QueryObject;
      return [normalizeOrderBy(tmpQueryObject)];
    }),
  );

  return {
    ...queryContexts[0],
    queries: [...queryContexts[0].queries, ...queryContexts[1].queries],
  };
}
