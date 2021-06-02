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
import React, { useEffect, useState } from 'react';
import { NativeSelect as Select } from 'src/components/Select';
import { t, SupersetClient, styled, JsonObject } from '@superset-ui/core';
import {
  Operators,
  OPERATORS_OPTIONS,
  TABLE_ONLY_OPERATORS,
  DRUID_ONLY_OPERATORS,
  HAVING_OPERATORS,
  MULTI_OPERATORS,
  CUSTOM_OPERATORS,
  DISABLE_INPUT_OPERATORS,
  AGGREGATES,
  OPERATOR_MAPPING,
} from 'src/explore/constants';
import FilterDefinitionOption from 'src/explore/components/controls/MetricControl/FilterDefinitionOption';
import AdhocFilter, {
  EXPRESSION_TYPES,
  CLAUSES,
} from 'src/explore/components/controls/FilterControl/AdhocFilter';
import { Input } from 'src/common/components';

const SelectWithLabel = styled(Select)`
  .ant-select-selector {
    margin-bottom: ${({ theme }) => theme.gridUnit * 4}px;
  }

  .ant-select-selector::after {
    content: '${({ labelText }) => labelText || '\\A0'}';
    display: inline-block;
    white-space: nowrap;
    color: ${({ theme }) => theme.colors.grayscale.light1};
    width: max-content;
  }
`;

interface ColumnType {
  id: number;
  column_name: string;
  verbose_name: string | null;
  description: string | null;
  expression: string | null;
  filterable: boolean;
  groupby: boolean;
  is_dttm: boolean;
  type: string;
  type_generic: number;
  python_date_format: string | null;
  filterOptionName: string;
}

interface SimpleExpressionType {
  expressionType: keyof typeof EXPRESSION_TYPES;
  column: ColumnType;
  aggregate: keyof typeof AGGREGATES;
  label: string;
}
interface SQLExpressionType {
  expressionType: keyof typeof EXPRESSION_TYPES;
  sqlExpression: ColumnType;
  label: string;
}
interface Props {
  adhocFilter: AdhocFilter;
  onChange: (filter: AdhocFilter) => void;
  options: (
    | ColumnType
    | SimpleExpressionType
    | SQLExpressionType
    | { [saved_metric_name: string]: string }
  )[];
  onHeightChange: () => void;
  datasource: {
    columns: ColumnType[];
    type: string;
    filter_select: boolean;
  };
  partitionColumn: string;
  popoverRef: object;
}

const AdhocFilterEditPopoverSimpleTabContent: React.FC<Props> = props => {
  const selectProps = {
    name: 'select-column',
    showSearch: true,
  };
  const [suggestions, setSuggestions] = useState<JsonObject>([]);
  const [abortActiveRequest, setAbortActiveRequest] = useState<
    (() => void) | null
  >(null);
  const [currentSuggestionSearch, setCurrentSuggestionSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshComparatorSuggestions();
  }, [props.adhocFilter.subject]);

  const onSubjectChange = (id: string) => {
    const option = props.options.find(
      // @ts-ignore
      option => option.id === id || option.optionName === id,
    );

    let subject = '';
    let clause;
    // infer the new clause based on what subject was selected.
    if (option && 'column_name' in option) {
      subject = option.column_name;
      clause = CLAUSES.WHERE;
    } else if (option && 'saved_metric_name' in option) {
      subject = option.saved_metric_name;
      clause = CLAUSES.HAVING;
    } else if (option && option.label) {
      subject = option.label;
      clause = CLAUSES.HAVING;
    }
    const { operator, operatorId } = props.adhocFilter;
    props.onChange(
      props.adhocFilter.duplicateWith({
        subject,
        clause,
        operator:
          operator && isOperatorRelevant(operatorId, subject)
            ? OPERATOR_MAPPING[operatorId]
            : null,
        expressionType: EXPRESSION_TYPES.SIMPLE,
        operatorId,
      }),
    );
  };

  const onOperatorChange = (operator: Operators) => {
    const currentComparator = props.adhocFilter.comparator;
    let newComparator;
    // convert between list of comparators and individual comparators
    // (e.g. `in ('North America', 'Africa')` to `== 'North America'`)
    if (MULTI_OPERATORS.has(operator)) {
      newComparator = Array.isArray(currentComparator)
        ? currentComparator
        : [currentComparator].filter(element => element);
    } else {
      newComparator = Array.isArray(currentComparator)
        ? currentComparator[0]
        : currentComparator;
    }
    if (operator == Operators.IS_TRUE || operator == Operators.IS_FALSE) {
      newComparator = Operators.IS_TRUE == operator;
    }
    if (operator && CUSTOM_OPERATORS.has(operator)) {
      props.onChange(
        props.adhocFilter.duplicateWith({
          subject: props.adhocFilter.subject,
          clause: CLAUSES.WHERE,
          operatorId: operator,
          operator: OPERATOR_MAPPING[operator].operation,
          expressionType: EXPRESSION_TYPES.SQL,
          datasource: props.datasource,
        }),
      );
    } else {
      props.onChange(
        props.adhocFilter.duplicateWith({
          operatorId: operator,
          operator: OPERATOR_MAPPING[operator].operation,
          comparator: newComparator,
          expressionType: EXPRESSION_TYPES.SIMPLE,
        }),
      );
    }
  };

  const onInputComparatorChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    onComparatorChange(event.target.value);
  };

  const onComparatorChange = (comparator: string) => {
    props.onChange(
      props.adhocFilter.duplicateWith({
        comparator,
        expressionType: EXPRESSION_TYPES.SIMPLE,
      }),
    );
  };

  const refreshComparatorSuggestions = () => {
    const { datasource } = props;
    const col = props.adhocFilter.subject;
    const having = props.adhocFilter.clause === CLAUSES.HAVING;

    if (col && datasource && datasource.filter_select && !having) {
      if (abortActiveRequest) {
        abortActiveRequest();
      }

      const controller = new AbortController();
      const { signal } = controller;
      setAbortActiveRequest(controller.abort);
      setLoading(true);

      SupersetClient.get({
        signal,
        endpoint: `/superset/filter/${datasource.type}/${datasource.id}/${col}/`,
      })
        .then(({ json }) => {
          setSuggestions(json);
          setAbortActiveRequest(null);
          setLoading(false);
        })
        .catch(() => {
          setSuggestions([]);
          setAbortActiveRequest(null);
          setLoading(false);
        });
    }
  };

  const isOperatorRelevant = (
    operator: Operators,

    subject: string,
  ) => {
    const column = props.datasource.columns?.find(
      col => col.column_name === subject,
    );
    const isColumnBoolean =
      !!column && (column.type === 'BOOL' || column.type === 'BOOLEAN');
    const isColumnNumber = !!column && column.type === 'INT';
    const isColumnFunction = !!column && !!column.expression;

    if (operator && CUSTOM_OPERATORS.has(operator)) {
      const { partitionColumn } = props;
      return partitionColumn && subject && subject === partitionColumn;
    }
    if (operator === Operators.IS_TRUE || operator === Operators.IS_FALSE) {
      return isColumnBoolean || isColumnNumber || isColumnFunction;
    }
    if (isColumnBoolean) {
      return (
        operator === Operators.IS_NULL || operator === Operators.IS_NOT_NULL
      );
    }
    return !(
      (props.datasource.type === 'druid' &&
        TABLE_ONLY_OPERATORS.indexOf(operator) >= 0) ||
      (props.datasource.type === 'table' &&
        DRUID_ONLY_OPERATORS.indexOf(operator) >= 0) ||
      (props.adhocFilter.clause === CLAUSES.HAVING &&
        HAVING_OPERATORS.indexOf(operator) === -1)
    );
  };

  const focusComparator = (
    ref: HTMLInputElement | null,
    shouldFocus: boolean,
  ) => {
    if (ref && shouldFocus) {
      ref.focus();
    }
  };

  const renderSubjectOptionLabel = option => (
    <FilterDefinitionOption option={option} />
  );

  const clearSuggestionSearch = () => {
    setCurrentSuggestionSearch('');
  };

  const getOptionsRemaining = () => {
    const { comparator } = props.adhocFilter;
    // if select is multi/value is array, we show the options not selected
    const valuesFromSuggestionsLength = Array.isArray(comparator)
      ? comparator.filter(v => suggestions.includes(v)).length
      : 0;
    return suggestions?.length - valuesFromSuggestionsLength ?? 0;
  };
  const createSuggestionsPlaceholder = () => {
    const optionsRemaining = getOptionsRemaining();
    const placeholder = t('%s option(s)', optionsRemaining);
    return optionsRemaining ? placeholder : '';
  };

  let columns = props.options;
  const { subject, operator, comparator, operatorId } = props.adhocFilter;
  const subjectSelectProps = {
    value: subject ?? undefined,
    onChange: onSubjectChange,
    notFoundContent: t(
      'No such column found. To filter on a metric, try the Custom SQL tab.',
    ),
    filterOption: (input, option) =>
      option.filterBy.toLowerCase().indexOf(input.toLowerCase()) >= 0,
    autoFocus: !subject,
    placeholder: '',
  };

  if (props.datasource.type === 'druid') {
    subjectSelectProps.placeholder = t(
      '%s column(s) and metric(s)',
      columns.length,
    );
  } else {
    // we cannot support simple ad-hoc filters for metrics because we don't know what type
    // the value should be cast to (without knowing the output type of the aggregate, which
    // becomes a rather complicated problem)
    subjectSelectProps.placeholder =
      props.adhocFilter.clause === CLAUSES.WHERE
        ? t('%s column(s)', columns.length)
        : t('To filter on a metric, use Custom SQL tab.');
    columns = props.options.filter(option => option.column_name);
  }

  const operatorSelectProps = {
    placeholder: t(
      '%s operator(s)',
      OPERATORS_OPTIONS.filter(op => isOperatorRelevant(op, subject)).length,
    ),
    value: OPERATOR_MAPPING[operatorId]?.display,
    onChange: onOperatorChange,
    filterOption: (input, option) =>
      option.value.toLowerCase().indexOf(input.toLowerCase()) >= 0,
    autoFocus: !!subjectSelectProps.value && !operator,
  };

  const shouldFocusComparator =
    !!subjectSelectProps.value && !!operatorSelectProps.value;

  const comparatorSelectProps = {
    allowClear: true,
    showSearch: true,
    mode: MULTI_OPERATORS.has(operatorId) ? 'tags' : undefined,
    tokenSeparators: [',', '\n', '\t', ';'],
    loading,
    value: comparator,
    onChange: onComparatorChange,
    notFoundContent: t('Type a value here'),
    disabled: DISABLE_INPUT_OPERATORS.includes(operatorId),
    placeholder: createSuggestionsPlaceholder(),
    labelText: comparator?.length > 0 && createSuggestionsPlaceholder(),
    autoFocus: focusComparator,
  };

  return (
    <>
      <Select
        css={theme => ({
          marginTop: theme.gridUnit * 4,
          marginBottom: theme.gridUnit * 4,
        })}
        {...selectProps}
        {...subjectSelectProps}
        getPopupContainer={triggerNode => triggerNode.parentNode}
      >
        {columns.map(column => (
          <Select.Option
            value={
              ('id' in column && column.id) ||
              ('optionName' in column && column.optionName)
            }
            filterBy={
              column.saved_metric_name || column.column_name || column.label
            }
            key={column.id || column.optionName}
          >
            {renderSubjectOptionLabel(column)}
          </Select.Option>
        ))}
      </Select>
      <Select
        css={theme => ({ marginBottom: theme.gridUnit * 4 })}
        {...selectProps}
        {...operatorSelectProps}
        getPopupContainer={triggerNode => triggerNode.parentNode}
      >
        {OPERATORS_OPTIONS.filter(op => isOperatorRelevant(op, subject)).map(
          option => (
            <Select.Option value={option} key={option}>
              {OPERATOR_MAPPING[option].display}
            </Select.Option>
          ),
        )}
      </Select>
      {MULTI_OPERATORS.has(operator) || suggestions.length > 0 ? (
        <SelectWithLabel
          data-test="adhoc-filter-simple-value"
          {...comparatorSelectProps}
          getPopupContainer={triggerNode => triggerNode.parentNode}
          onSearch={val => setCurrentSuggestionSearch(val)}
          onSelect={clearSuggestionSearch}
          onBlur={clearSuggestionSearch}
        >
          {suggestions.map(suggestion => (
            <Select.Option value={suggestion} key={suggestion}>
              {suggestion}
            </Select.Option>
          ))}

          {/* enable selecting an option not included in suggestions */}
          {currentSuggestionSearch &&
            !suggestions.some(
              suggestion => suggestion === currentSuggestionSearch,
            ) && (
              <Select.Option value={currentSuggestionSearch}>
                {currentSuggestionSearch}
              </Select.Option>
            )}
        </SelectWithLabel>
      ) : (
        <Input
          data-test="adhoc-filter-simple-value"
          name="filter-value"
          ref={ref =>
            focusComparator(
              ref as HTMLInputElement | null,
              shouldFocusComparator,
            )
          }
          onChange={onInputComparatorChange}
          value={comparator}
          placeholder={t('Filter value (case sensitive)')}
          disabled={DISABLE_INPUT_OPERATORS.includes(operatorId)}
        />
      )}
    </>
  );
};

export default AdhocFilterEditPopoverSimpleTabContent;
