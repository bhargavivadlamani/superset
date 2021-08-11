/* eslint-disable no-only-tests/no-only-tests */
/* eslint-disable jest/no-focused-tests */
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
import { render, screen } from 'spec/helpers/testing-library';
// import userEvent from '@testing-library/user-event';
// import sinon from 'sinon';
// import fetchMock from 'fetch-mock';
// import * as actions from 'src/reports/actions/reports';
import * as featureFlags from 'src/featureFlags';
import { shallow } from 'enzyme';

import { ExploreChartHeader } from 'src/explore/components/ExploreChartHeader';
import ExploreActionButtons from 'src/explore/components/ExploreActionButtons';
import EditableTitle from 'src/components/EditableTitle';

const saveSliceStub = jest.fn();
const updateChartTitleStub = jest.fn();
const fetchUISpecificReportStub = jest.fn();
const mockProps = {
  actions: {
    saveSlice: saveSliceStub,
    updateChartTitle: updateChartTitleStub,
  },
  can_overwrite: true,
  can_download: true,
  isStarred: true,
  slice: {
    form_data: {
      viz_type: 'line',
    },
  },
  table_name: 'foo',
  form_data: {
    viz_type: 'table',
  },
  user: {
    createdOn: '2021-04-27T18:12:38.952304',
    email: 'admin@test.com',
    firstName: 'admin',
    isActive: true,
    lastName: 'admin',
    permissions: {},
    roles: { Admin: [['can_add', 'AlertModelView']] },
    userId: 1,
    username: 'admin',
  },
  reports: {},
  timeout: 1000,
  chart: {
    id: 0,
    queryResponse: {},
  },
  fetchUISpecificReport: fetchUISpecificReportStub,
  chartHeight: '30px',
};

describe('ExploreChartHeader', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = shallow(<ExploreChartHeader {...mockProps} />);
  });

  it('is valid', () => {
    expect(React.isValidElement(<ExploreChartHeader {...mockProps} />)).toBe(
      true,
    );
  });

  it('renders', () => {
    expect(wrapper.find(EditableTitle)).toExist();
    expect(wrapper.find(ExploreActionButtons)).toExist();
  });

  it('should update title but not save', () => {
    const editableTitle = wrapper.find(EditableTitle);
    expect(editableTitle.props().onSaveTitle).toBe(updateChartTitleStub);
  });
});

describe('RTL', () => {
  // TODO (lyndsiWilliams): Cannot get ExploreChartHeader to render at all - errors in both RTL and enzyme
  // ERROR: TypeError: Cannot read property 'datasource' of undefined (also cannot find 'userId' nor 'find')
  // Possible an issue mocking redux/state?

  let isFeatureEnabledMock;
  // let dispatch;
  beforeEach(async () => {
    isFeatureEnabledMock = jest
      .spyOn(featureFlags, 'isFeatureEnabled')
      .mockImplementation(() => true);
    // dispatch = sinon.spy();
  });

  afterAll(() => {
    isFeatureEnabledMock.mockRestore();
  });

  it('renders the calendar icon', () => {
    render(<ExploreChartHeader {...mockProps} />, { useRedux: true });
    screen.logTestingPlaygroundURL();
    expect.anything();
  });
});
