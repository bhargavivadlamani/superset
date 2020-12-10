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
import { t } from '@superset-ui/core';
import React from 'react';
import { Tooltip } from 'src/common/components/Tooltip';
import Icon, { IconName } from 'src/components/Icon';
import { RecipientIconName } from '../types';

export default function RecipientIcon({ type }: { type: string }) {
  const recipientIconConfig = {
    name: '',
    label: '',
  };
  switch (type) {
    case RecipientIconName.email:
      recipientIconConfig.name = 'email';
      recipientIconConfig.label = t(`${RecipientIconName.email}`);
      break;
    case RecipientIconName.slack:
      recipientIconConfig.name = 'slack';
      recipientIconConfig.label = t(`${RecipientIconName.slack}`);
      break;
    default:
      recipientIconConfig.name = '';
      recipientIconConfig.label = '';
  }
  return recipientIconConfig.name.length ? (
    <Tooltip title={recipientIconConfig.label} placement="bottom">
      <Icon name={recipientIconConfig.name as IconName} />
    </Tooltip>
  ) : null;
}
