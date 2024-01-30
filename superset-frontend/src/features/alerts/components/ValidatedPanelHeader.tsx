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
import React from 'react';
import { t } from '@superset-ui/core';
import { CheckCircleOutlined } from '@ant-design/icons';

const ValidatedPanelHeader = ({
  title,
  subtitle,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  required,
  validateCheckStatus,
  testId,
}: {
  title: string;
  subtitle: string;
  required: boolean;
  validateCheckStatus: boolean;
  testId?: string;
}): JSX.Element => {
  const asterisk = ' *';
  const checkmark = <CheckCircleOutlined />;

  return (
    <div className="collapse-panel-header">
      <div className="collapse-panel-title" data-test={testId}>
        <span>{t(title)}</span>
        {validateCheckStatus ? (
          <span className="validation-checkmark">{checkmark}</span>
        ) : (
          <span className="collapse-panel-asterisk">{asterisk}</span>
        )}
      </div>
      <p className="collapse-panel-subtitle">
        {subtitle ? t(subtitle) : undefined}
      </p>
    </div>
  );
};

export default ValidatedPanelHeader;
