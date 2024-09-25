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
import { render } from 'spec/helpers/testing-library';
import { IconTooltip } from 'src/components/IconTooltip';

jest.mock('src/components/Tooltip', () => ({
  Tooltip: () => <div data-test="mock-tooltip" />,
}));

const mockedProps = {
  tooltip: 'This is a tooltip',
};
test('renders', () => {
  const { container } = render(<IconTooltip>TEST</IconTooltip>);
  expect(container).toBeInTheDocument();
});
test('renders with props', () => {
  const { container } = render(
    <IconTooltip {...mockedProps}>TEST</IconTooltip>,
  );
  expect(container).toBeInTheDocument();
});
test('renders a tooltip', () => {
  const { getByTestId } = render(
    <IconTooltip {...mockedProps}>TEST</IconTooltip>,
  );
  expect(getByTestId('mock-tooltip')).toBeInTheDocument();
});
