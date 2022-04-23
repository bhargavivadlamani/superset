import { getChartAlias, Slice } from 'cypress/utils/vizPlugins';
import {
  dashboardView,
  editDashboardView,
  exploreView,
  nativeFilters,
} from 'cypress/support/directories';
import { FORM_DATA_DEFAULTS } from '../explore/visualizations/shared.helper';

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
export const WORLD_HEALTH_DASHBOARD = '/superset/dashboard/world_health/';
export const TABBED_DASHBOARD = '/superset/dashboard/tabbed_dash/';

export const testItems = {
  dashboard: 'Cypress test Dashboard',
  dataset: 'Vehicle Sales',
  datasetForNativeFilter: 'wb_health_population',
  chart: 'Cypress chart',
  newChart: 'New Cypress Chart',
  createdDashboard: 'New Dashboard',
  defaultNameDashboard: '[ untitled dashboard ]',
  newDashboardTitle: `Test dashboard [NEW TEST]`,
  bulkFirstNameDashboard: 'First Dash',
  bulkSecondNameDashboard: 'Second Dash',
  worldBanksDataCopy: `World Bank's Data [copy]`,
  filterType: {
    value: 'Value',
    numerical: 'Numerical range',
    timeColumn: 'Time column',
    timeGrain: 'Time grain',
    timeRange: 'Time range',
  },
  topTenGamesChart: {
    name: 'Most Populated Countries',
    filterColumn: 'country_name',
    filterColumnYear: 'year',
    filterColumnRegion: 'region',
    filterColumnCountryCode: 'country_code',
  },
  filterDefaultValue: 'United States',
  filterOtherCountry: 'China',
  filterTimeGrain: 'Month',
  filterTimeColumn: 'created',
  filterNumericalColumn: 'SP_RUR_TOTL_ZS',
};

export const CHECK_DASHBOARD_FAVORITE_ENDPOINT =
  '/superset/favstar/Dashboard/*/count';

export const WORLD_HEALTH_CHARTS = [
  { name: '% Rural', viz: 'world_map' },
  { name: 'Most Populated Countries', viz: 'table' },
  { name: 'Region Filter', viz: 'filter_box' },
  { name: "World's Population", viz: 'big_number' },
  { name: 'Growth Rate', viz: 'line' },
  { name: 'Rural Breakdown', viz: 'sunburst' },
  { name: "World's Pop Growth", viz: 'area' },
  { name: 'Life Expectancy VS Rural %', viz: 'bubble' },
  { name: 'Treemap', viz: 'treemap' },
  { name: 'Box plot', viz: 'box_plot' },
] as const;

export const nativeFilterTooltips = {
  searchAllFilterOptions:
    'By default, each filter loads at most 1000 choices at the initial page load. Check this box if you have more than 1000 filter values and want to enable dynamically searching that loads filter values as users type (may add stress to your database).',
  defaultToFirstItem: 'When using this option, default value can’t be set',
  inverseSelection: 'Exclude selected values',
  required: 'User must select a value before applying the filter',
  multipleSelect: 'Allow selecting multiple values',
  defaultValue:
    'Default value must be set when "Filter value is required" is checked',
};

export const nativeFilterOptions = [
  'Filter has default value',
  'Multiple select',
  'Filter value is required',
  'Filter is hierarchical',
  'Default to first item',
  'Inverse selection',
  'Search all filter options',
  'Pre-filter available values',
  'Sort filter values',
];
export const valueNativeFilterOptions = [
  'Pre-filter available values',
  'Sort filter values',
  'Filter has default value',
  'Select first filter value by default',
  'Can select multiple values',
  'Dynamically search all filter values',
  'Inverse selection',
  'Filter value is required',
];

/** Used to specify charts expected by the test suite */
export interface ChartSpec {
  name: string;
  viz: string;
}

export function getChartGridComponent({ name, viz }: ChartSpec) {
  return cy
    .get(`[data-test="chart-grid-component"][data-test-chart-name="${name}"]`)
    .should('have.attr', 'data-test-viz-type', viz);
}

export function waitForChartLoad(chart: ChartSpec) {
  return getChartGridComponent(chart).then(gridComponent => {
    const chartId = gridComponent.attr('data-test-chart-id');
    // the chart should load in under half a minute
    return (
      cy
        // this id only becomes visible when the chart is loaded
        .get(`[data-test="chart-grid-component"] #chart-id-${chartId}`, {
          timeout: 30000,
        })
        .should('be.visible')
        // return the chart grid component
        .then(() => gridComponent)
    );
  });
}

const toSlicelike = ($chart: JQuery<HTMLElement>): Slice => ({
  slice_id: parseInt($chart.attr('data-test-chart-id')!, 10),
  form_data: {
    viz_type: $chart.attr('data-test-viz-type')!,
  },
});

export function getChartAliasBySpec(chart: ChartSpec) {
  return getChartGridComponent(chart).then($chart =>
    cy.wrap(getChartAlias(toSlicelike($chart))),
  );
}

export function getChartAliasesBySpec(charts: readonly ChartSpec[]) {
  const aliases: string[] = [];
  charts.forEach(chart =>
    getChartAliasBySpec(chart).then(alias => {
      aliases.push(alias);
    }),
  );
  // Wrapping the aliases is key.
  // That way callers can chain off this function
  // and actually get the list of aliases.
  return cy.wrap(aliases);
}

/**
 * Drag an element and drop it to another element.
 * Usage:
 *    drag(source).to(target);
 */
export function drag(selector: string, content: string | number | RegExp) {
  const dataTransfer = { data: {} };
  return {
    to(target: string | Cypress.Chainable) {
      cy.get('.dragdroppable')
        .contains(selector, content)
        .trigger('mousedown', { which: 1 })
        .trigger('dragstart', { dataTransfer })
        .trigger('drag', {});

      (typeof target === 'string' ? cy.get(target) : target)
        .trigger('dragover', { dataTransfer })
        .trigger('drop', { dataTransfer })
        .trigger('dragend', { dataTransfer })
        .trigger('mouseup', { which: 1 });
    },
  };
}

export function resize(selector: string) {
  return {
    to(cordX: number, cordY: number) {
      cy.get(selector)
        .trigger('mousedown', { which: 1 })
        .trigger('mousemove', { which: 1, cordX, cordY, force: true })
        .trigger('mouseup', { which: 1, force: true });
    },
  };
}

export function cleanUp() {
  cy.deleteDashboardByName(testItems.dashboard);
  cy.deleteDashboardByName(testItems.defaultNameDashboard);
  cy.deleteDashboardByName('');
  cy.deleteDashboardByName(testItems.newDashboardTitle);
  cy.deleteDashboardByName(testItems.bulkFirstNameDashboard);
  cy.deleteDashboardByName(testItems.bulkSecondNameDashboard);
  cy.deleteDashboardByName(testItems.createdDashboard);
  cy.deleteDashboardByName(testItems.worldBanksDataCopy);
  cy.deleteChartByName(testItems.chart);
  cy.deleteChartByName(testItems.newChart);
}

/** ************************************************************************
 * Copy dashboard for testing purpose
 * @returns {None}
 * @summary helper for copy dashboard for testing purpose
 ************************************************************************* */
export function copyTestDashboard(dashboard: string) {
  cy.intercept('POST', '**/copy_dash/**').as('copy');
  cy.intercept('**/api/v1/dashboard/**').as('dashboard');
  cy.intercept('GET', '**/api/v1/dataset/**').as('datasetLoad');
  cy.intercept('**/api/v1/dashboard/?q=**').as('dashboardsList');
  cy.visit('dashboard/list/');
  cy.contains('Actions');
  cy.wait('@dashboardsList').then(xhr => {
    const dashboards = xhr.response?.body.result;
    /* eslint-disable no-unused-expressions */
    expect(dashboards).not.to.be.undefined;
    const testDashboard = dashboards.find(
      (d: { dashboard_title: string }) => d.dashboard_title === `${dashboard}`,
    );
    cy.visit(testDashboard.url);
  });
  cy.get(dashboardView.threeDotsMenuIcon).should('be.visible').click();
  cy.get(dashboardView.saveAsMenuOption).click();
  cy.get(dashboardView.saveModal.dashboardNameInput)
    .should('be.visible')
    .clear()
    .type(testItems.dashboard);
  cy.get(dashboardView.saveModal.saveButton).click();
  cy.wait('@copy', { timeout: 45000 })
    .its('response.statusCode')
    .should('eq', 200);
}

/** ************************************************************************
 * Expend Native filter from the left panel on dashboard
 * @returns {None}
 * @summary helper for expend native filter
 ************************************************************************* */
export function expandFilterOnLeftPanel() {
  return cy
    .get(nativeFilters.filterFromDashboardView.expand)
    .click({ force: true });
}

/** ************************************************************************
 * Collapes Native Filter from the left panel on dashboard
 * @returns {None}
 * @summary helper for collape native filter
 ************************************************************************* */
export function collapseFilterOnLeftPanel() {
  cy.get(nativeFilters.filterFromDashboardView.collapse)
    .should('be.visible')
    .click();
  cy.get(nativeFilters.filterFromDashboardView.collapse).should(
    'not.be.visible',
  );
}

/** ************************************************************************
 * Enter Native Filter edit modal from the left panel on dashboard
 * @returns {None}
 * @summary helper for enter native filter edit modal
 ************************************************************************* */
export function enterNativeFilterEditModal() {
  cy.get(nativeFilters.filterFromDashboardView.createFilterButton)
    .should('be.visible')
    .click();
  cy.get(nativeFilters.modal.container).should('be.visible');
}

/** ************************************************************************
 * Clicks on new filter button
 * @returns {None}
 * @summary helper for adding new filter
 ************************************************************************* */
export function clickOnAddFilterInModal() {
  return cy
    .get(nativeFilters.addFilterButton.button)
    .first()
    .click()
    .then(() => {
      cy.get(nativeFilters.addFilterButton.dropdownItem)
        .contains('Filter')
        .click({ force: true });
    });
}

/** ************************************************************************
 * Fills value native filter form with basic information
 * @param {string} type type for filter: Value, Numerical range,Time column,Time grain,Time range
 * @param {string} name name for filter
 * @param {string} dataset which dataset should be used
 * @param {string} filterColumn which column should be used
 * @returns {None}
 * @summary helper for filling value native filter form
 ************************************************************************* */
export function fillNativeFilterForm(
  type: string,
  name: string,
  dataset?: string,
  filterColumn?: string,
) {
  cy.get(nativeFilters.filtersPanel.filterTypeInput)
    .find(nativeFilters.filtersPanel.filterTypeItem)
    .click({ multiple: true, force: true });
  cy.get(`[label="${type}"]`).click({ multiple: true, force: true });
  cy.get(nativeFilters.modal.container)
    .find(nativeFilters.filtersPanel.filterName)
    .last()
    .click({ scrollBehavior: false })
    .type(name, { scrollBehavior: false });
  if (dataset) {
    cy.get(nativeFilters.modal.container)
      .find(nativeFilters.filtersPanel.datasetName)
      .last()
      .click({ force: true, scrollBehavior: false })
      .type(`${dataset}`, { scrollBehavior: false });
    cy.get(nativeFilters.silentLoading).should('not.exist');
    cy.get(`[label="${dataset}"]`).click({ multiple: true, force: true });
  }
  cy.get(nativeFilters.silentLoading).should('not.exist');
  if (filterColumn) {
    cy.get(nativeFilters.filtersPanel.filterInfoInput)
      .last()
      .should('be.visible')
      .click({ force: true });
    cy.get(nativeFilters.filtersPanel.filterInfoInput)
      .last()
      .type(filterColumn);
    cy.get(nativeFilters.filtersPanel.inputDropdown)
      .should('be.visible', { timeout: 20000 })
      .last()
      .click();
  }
  cy.get(nativeFilters.silentLoading).should('not.exist');
}

/** ************************************************************************
 * Get native filter placeholder e.g 9 options
 * @param {number} index which input it fills
 * @returns cy object for assertions
 * @summary helper for getting placeholder value
 ************************************************************************* */
export function getNativeFilterPlaceholderWithIndex(index: number) {
  return cy.get(nativeFilters.filtersPanel.columnEmptyInput).eq(index);
}

/** ************************************************************************
 * Apply native filter value from dashboard view
 * @param {number} index which input it fills
 * @param {string} value what is filter value
 * @returns {null}
 * @summary put value to nth native filter input in view
 ************************************************************************* */
export function applyNativeFilterValueWithIndex(index: number, value: string) {
  cy.get(nativeFilters.filterFromDashboardView.filterValueInput)
    .eq(index)
    .parent()
    .should('be.visible', { timeout: 10000 })
    .type(`${value}{enter}`);
  // click the title to dismiss shown options
  cy.get(nativeFilters.filterFromDashboardView.filterName).eq(index).click();
}

/** ************************************************************************
 * Fills parent filter input
 * @param {number} index which input it fills
 * @param {string} value on which filter it depends on
 * @returns {null}
 * @summary takes first or second input and modify the depends on filter value
 ************************************************************************* */
export function addParentFilterWithValue(index: number, value: string) {
  return cy
    .get(nativeFilters.filterConfigurationSections.displayedSection)
    .within(() => {
      cy.get('input[aria-label="Limit type"]')
        .eq(index)
        .click({ force: true })
        .type(`${value}{enter}`, { delay: 30, force: true });
    });
}

/** ************************************************************************
 * Save Native Filter Settings
 * @returns {None}
 * @summary helper for save native filters settings
 ************************************************************************* */
export function saveNativeFilterSettings() {
  cy.get(nativeFilters.modal.footer)
    .contains('Save')
    .should('be.visible')
    .click();
  cy.get(nativeFilters.modal.container).should('not.exist');
}

/** ************************************************************************
 * Cancel Native fitler settings
 * @returns {None}
 * @summary helper for cancel native filters settings
 ************************************************************************* */
export function cancelNativeFilterSettings() {
  cy.get(nativeFilters.modal.footer)
    .find(nativeFilters.modal.cancelButton)
    .should('be.visible')
    .click();
  cy.get(nativeFilters.modal.alertXUnsavedFilters)
    .should('have.text', 'There are unsaved changes.')
    .should('be.visible');
  cy.get(nativeFilters.modal.footer)
    .find(nativeFilters.modal.yesCancelButton)
    .contains('cancel')
    .should('be.visible')
    .click();
  cy.get(nativeFilters.modal.container).should('not.exist');
}

/** ************************************************************************
 * Close dashboard toast message
 * @returns {None}
 * @summary helper for close dashboard toast message in order to make test stable
 ************************************************************************* */
export function closeDashboardToastMessage() {
  cy.get('body').then($body => {
    if ($body.find(dashboardView.dashboardAlert.modal).length > 0) {
      // evaluates as true if button exists at all
      cy.get(dashboardView.dashboardAlert.modal).then($header => {
        if ($header.is(':visible')) {
          cy.get(dashboardView.dashboardAlert.closeButton).click({
            force: true,
          });
          cy.get(dashboardView.dashboardAlert.closeButton).should('not.exist', {
            timeout: 10000,
          });
        }
      });
    }
  });
}

/** ************************************************************************
 * Validate filter name on dashboard
 * @param name: filter name to validate
 * @return {null}
 * @summary helper for validate filter name on dashboard
 ************************************************************************* */
export function validateFilterNameOnDashboard(name: string) {
  cy.get(nativeFilters.filterFromDashboardView.filterName)
    .should('be.visible', { timeout: 40000 })
    .contains(`${name}`);
}

/** ************************************************************************
 * Validate filter content on dashboard
 * @param filterContent: filter content to validate
 * @return {null}
 * @summary helper for validate filter content on dashboard
 ************************************************************************* */
export function validateFilterContentOnDashboard(filterContent: string) {
  cy.get(nativeFilters.filterFromDashboardView.filterContent)
    .contains(`${filterContent}`)
    .should('be.visible');
}

/** ************************************************************************
 * Delete Native filter
 * @return {null}
 * @summary helper for delete native filter
 ************************************************************************* */
export function deleteNativeFilter() {
  cy.get(nativeFilters.filtersList.removeIcon).first().click();
}

/** ************************************************************************
 * Undo delete Native filter
 * @return {null}
 * @summary helper for undo delete native filter
 ************************************************************************* */
export function undoDeleteNativeFilter() {
  deleteNativeFilter();
  cy.contains('Undo?').click();
}

/** ************************************************************************
 * Check Native Filter tooltip content
 * @param index: tooltip indext to check
 * @param value: tooltip value to check
 * @return {null}
 * @summary helper for checking native filter tooltip content by index
 ************************************************************************* */
export function checkNativeFilterTooltip(index: number, value: string) {
  cy.get(nativeFilters.filterConfigurationSections.infoTooltip)
    .eq(index)
    .trigger('mouseover');
  cy.contains(`${value}`);
}

/** ************************************************************************
 * Apply advanced time range filter on dashboard
 * @param startRange: starting time range
 * @param endRange: ending time range
 * @return {null}
 * @summary helper for applying advanced time range filter on dashboard with customize time range
 ************************************************************************* */
export function applyAdvancedTimeRangeFilterOnDashboard(
  startRange?: string,
  endRange?: string,
) {
  cy.get('.control-label').contains('RANGE TYPE').should('be.visible');
  cy.get('.ant-popover-content .ant-select-selector')
    .should('be.visible')
    .click();
  cy.get(`[label="Advanced"]`).should('be.visible').click();
  cy.get('.section-title').contains('Advanced Time Range').should('be.visible');
  if (startRange) {
    cy.get('.ant-popover-inner-content')
      .find('[class^=ant-input]')
      .first()
      .type(`${startRange}`);
  }
  if (endRange) {
    cy.get('.ant-popover-inner-content')
      .find('[class^=ant-input]')
      .last()
      .type(`${endRange}`);
  }
  cy.get(dashboardView.timeRangeModal.applyButton).click();
  cy.get(nativeFilters.applyFilter).click();
}

/** ************************************************************************
 * Input default valule in Native filter in filter settings
 * @param defaultValue: default value for native filter
 * @return {null}
 * @summary helper for input default valule in Native filter in filter settings
 ************************************************************************* */
export function inputNativeFilterDefaultValue(defaultValue: string) {
  cy.contains('Filter has default value').click();
  cy.contains('Default value is required').should('be.visible');
  cy.get(nativeFilters.filterConfigurationSections.filterPlaceholder)
    .contains('options')
    .should('be.visible');
  cy.get(nativeFilters.filterConfigurationSections.collapsedSectionContainer)
    .first()
    .get(nativeFilters.filtersPanel.columnEmptyInput)
    .type(`${defaultValue}{enter}`);
}
