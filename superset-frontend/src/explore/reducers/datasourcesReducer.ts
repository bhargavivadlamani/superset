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
<<<<<<< HEAD:superset-frontend/src/dashboard/reducers/datasources.ts
import { keyBy } from 'lodash';
import { DatasourcesState } from 'src/dashboard/types';
import {
  DatasourcesActionPayload,
  DatasourcesAction,
} from '../actions/datasources';

export default function datasourcesReducer(
  datasources: DatasourcesState | undefined,
  action: DatasourcesActionPayload,
) {
  if (action.type === DatasourcesAction.SET_DATASOURCES) {
    return {
      ...datasources,
      ...keyBy(action.datasources, 'uid'),
    };
  }
  if (action.type === DatasourcesAction.SET_DATASOURCE) {
=======
import { Dataset } from '@superset-ui/chart-controls';
import { getDatasourceUid } from 'src/utils/getDatasourceUid';
import {
  AnyDatasourcesAction,
  SET_DATASOURCE,
} from '../actions/datasourcesActions';
import { HYDRATE_EXPLORE, HydrateExplore } from '../actions/hydrateExplore';

export default function datasourcesReducer(
  // TODO: change type to include other datasource types
  datasources: { [key: string]: Dataset },
  action: AnyDatasourcesAction | HydrateExplore,
) {
  if (action.type === SET_DATASOURCE) {
>>>>>>> 667f4101c30c18b8b2eebe5090204ba060cfd420:superset-frontend/src/explore/reducers/datasourcesReducer.ts
    return {
      ...datasources,
      [action.key]: action.datasource,
    };
  }
  if (action.type === HYDRATE_EXPLORE) {
    return { ...(action as HydrateExplore).data.datasources };
  }
  return datasources || {};
}
