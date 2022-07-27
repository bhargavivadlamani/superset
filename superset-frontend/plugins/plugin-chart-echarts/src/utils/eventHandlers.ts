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
import { QueryObjectFilterClause } from '@superset-ui/core';
import { EChartTransformedProps, EventHandlers } from '../types';

type Event = {
  name: string;
  event: { stop: () => void; event: PointerEvent };
};

export const defaultEventHandlers = (
  transformedProps: EChartTransformedProps<any>,
  handleChange: (values: string[]) => void,
) => {
  const { groupby, selectedValues, onContextMenu } = transformedProps;
  const eventHandlers: EventHandlers = {
    click: ({ name }: { name: string }) => {
      const values = Object.values(selectedValues);
      if (values.includes(name)) {
        handleChange(values.filter(v => v !== name));
      } else {
        handleChange([name]);
      }
    },
    contextmenu: (e: Event) => {
      if (onContextMenu) {
        e.event.stop();
        const pointerEvent = e.event.event;
        const values = e.name.split(',');
        const filters: QueryObjectFilterClause[] = [];
        groupby.forEach((dimension, i) =>
          filters.push({
            col: dimension,
            op: '==',
            val: values[i],
            formattedVal: values[i],
          }),
        );
        onContextMenu(filters, pointerEvent.offsetX, pointerEvent.offsetY);
      }
    },
  };
  return eventHandlers;
};
