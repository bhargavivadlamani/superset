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
import React, { FunctionComponent, useState } from 'react';
import { styled, t, useTheme } from '@superset-ui/core';
import { Select } from 'src/components';
import Icons from 'src/components/Icons';
import { NotificationMethodOption } from '../types';
import { StyledInputContainer } from '../AlertReportModal';

const StyledNotificationMethod = styled.div`
  margin-bottom: 10px;

  .input-container {
    textarea {
      height: auto;
    }
  }

  .inline-container {
    margin-bottom: 10px;

    .input-container {
      margin-left: 10px;
    }

    > div {
      margin: 0;
    }

    .delete-button {
      margin-left: 10px;
      padding-top: 3px;
    }
  }
`;

type NotificationSetting = {
  method?: NotificationMethodOption;
  recipients: string;
  options: NotificationMethodOption[];
};

interface NotificationMethodProps {
  setting?: NotificationSetting | null;
  index: number;
  onUpdate?: (index: number, updatedSetting: NotificationSetting) => void;
  onRemove?: (index: number) => void;
  onInputChange?: (
    event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => void;
  email_subject: string;
  _default: string;
}

const TRANSLATIONS = {
  EMAIL_SUBJECT_NAME: t('Email subject name (optional)'),
};

export const NotificationMethod: FunctionComponent<NotificationMethodProps> = ({
  setting = null,
  index,
  onUpdate,
  onRemove,
  onInputChange,
  email_subject,
  _default,
}) => {
  const { method, recipients, options } = setting || {};
  const [recipientValue, setRecipientValue] = useState<string>(
    recipients || '',
  );
  const [subjectValue, setSubjectValue] = useState<string>(email_subject || '');
  const theme = useTheme();

  if (!setting) {
    return null;
  }

  const onMethodChange = (method: NotificationMethodOption) => {
    // Since we're swapping the method, reset the recipients
    setRecipientValue('');
    if (onUpdate) {
      const updatedSetting = {
        ...setting,
        method,
        recipients: '',
      };

      onUpdate(index, updatedSetting);
    }
  };

  const onRecipientsChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const { target } = event;

    setRecipientValue(target.value);

    if (onUpdate) {
      const updatedSetting = {
        ...setting,
        recipients: target.value,
      };

      onUpdate(index, updatedSetting);
    }
  };

  const onSubjectChange = (
    event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    const { target } = event;

    setSubjectValue(target.value);

    if (onInputChange) {
      onInputChange(event);
    }
  };

  // Set recipients
  if (!!recipients && recipientValue !== recipients) {
    setRecipientValue(recipients);
  }

  return (
    <StyledNotificationMethod>
      <div className="inline-container">
        <StyledInputContainer>
          <div className="input-container">
            <Select
              ariaLabel={t('Delivery method')}
              data-test="select-delivery-method"
              onChange={onMethodChange}
              placeholder={t('Select Delivery Method')}
              options={(options || []).map(
                (method: NotificationMethodOption) => ({
                  label: method,
                  value: method,
                }),
              )}
              value={method}
            />
          </div>
        </StyledInputContainer>
        {method !== undefined && !!onRemove ? (
          <span
            role="button"
            tabIndex={0}
            className="delete-button"
            onClick={() => onRemove(index)}
          >
            <Icons.Trash iconColor={theme.colors.grayscale.base} />
          </span>
        ) : null}
      </div>
      {method !== undefined ? (
        <StyledInputContainer>
          <div className="control-label">{TRANSLATIONS.EMAIL_SUBJECT_NAME}</div>
          <div className="input-container">
            <input
              type="text"
              name="email_subject"
              value={subjectValue}
              placeholder={`Default: ${_default}`}
              onChange={onSubjectChange}
            />
          </div>
          <div className="control-label">{t(method)}</div>
          <div className="input-container">
            <textarea
              name="recipients"
              value={recipientValue}
              onChange={onRecipientsChange}
            />
          </div>
          <div className="helper">
            {t('Recipients are separated by "," or ";"')}
          </div>
        </StyledInputContainer>
      ) : null}
    </StyledNotificationMethod>
  );
};
