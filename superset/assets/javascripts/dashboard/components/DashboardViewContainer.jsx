import React from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import urlLib from 'url';

import * as dashboardActions from '../actions';
import * as chartActions from '../../chart/chartAction';
import Dashboard from './Dashboard';
import { getExploreUrl } from '../../explore/exploreUtils';
import { areObjectsEqual } from '../../reduxUtils';

const propTypes = {
  actions: PropTypes.object,
  initMessages: PropTypes.array,
  dashboard: PropTypes.object.isRequired,
  slices: PropTypes.object,
  datasources: PropTypes.object,
  filters: PropTypes.object,
  refresh: PropTypes.bool,
  timeout: PropTypes.number,
  user_id: PropTypes.string,
  isStarred: PropTypes.bool,
};

class DashboardViewContainer extends React.PureComponent {
  constructor(props) {
    super(props);
    this.refreshTimer = null;
    this.firstLoad = true;
  }

  componentDidMount() {
    this.loadPreSelectFilters();
    this.firstLoad = false;
    this.bindResizeToWindowResize();
  }

  componentDidUpdate(prevProps) {
    // check filters is changed
    if (!areObjectsEqual(prevProps.filters, this.props.filters)) {
      this.updateFilterParamsInUrl();

      if (this.props.refresh) {
        Object.keys(this.props.filters).forEach(sliceId => (this.refreshExcept(sliceId)));
      }
    }
  }

  // return charts in array
  getAllSlices() {
    return Object.keys(this.props.slices).map(key => (this.props.slices[key]));
  }

  getFormDataExtra(slice) {
    const formDataExtra = Object.assign({}, slice.formData);
    const extraFilters = this.effectiveExtraFilters(slice.slice_id);
    formDataExtra.filters = formDataExtra.filters.concat(extraFilters);
    return formDataExtra;
  }

  fetchSlice(slice, force = false) {
    return this.props.actions.runQuery(
      this.getFormDataExtra(slice), force, this.props.timeout, slice.chartKey);
  }

  effectiveExtraFilters(sliceId) {
    const metadata = this.props.dashboard.metadata;
    const filters = this.props.filters;
    const f = [];
    const immuneSlices = metadata.filter_immune_slices || [];
    if (sliceId && immuneSlices.includes(sliceId)) {
      // The slice is immune to dashboard filters
      return f;
    }

    // Building a list of fields the slice is immune to filters on
    let immuneToFields = [];
    if (
      sliceId &&
      metadata.filter_immune_slice_fields &&
      metadata.filter_immune_slice_fields[sliceId]) {
      immuneToFields = metadata.filter_immune_slice_fields[sliceId];
    }
    for (const filteringSliceId in filters) {
      if (filteringSliceId === sliceId.toString()) {
        // Filters applied by the slice don't apply to itself
        continue;
      }
      for (const field in filters[filteringSliceId]) {
        if (!immuneToFields.includes(field)) {
          f.push({
            col: field,
            op: 'in',
            val: filters[filteringSliceId][field],
          });
        }
      }
    }
    return f;
  }

  jsonEndpoint(data, force = false) {
    let endpoint = getExploreUrl(data, 'json', force);
    if (endpoint.charAt(0) !== '/') {
      // Known issue for IE <= 11:
      // https://connect.microsoft.com/IE/feedbackdetail/view/1002846/pathname-incorrect-for-out-of-document-elements
      endpoint = '/' + endpoint;
    }
    return endpoint;
  }

  loadPreSelectFilters() {
    for (const key in this.props.filters) {
      for (const col in this.props.filters[key]) {
        const sliceId = parseInt(key, 10);
        this.props.actions.addFilter(sliceId, col,
          this.props.filters[key][col], false, false);
      }
    }
  }

  refreshExcept(sliceId) {
    const immune = this.props.dashboard.metadata.filter_immune_slices || [];
    const slices = this.getAllSlices()
      .filter(slice => slice.slice_id !== sliceId && immune.indexOf(slice.slice_id) === -1);
    this.renderSlices(slices);
  }

  updateFilterParamsInUrl() {
    const urlObj = urlLib.parse(location.href, true);
    urlObj.query = urlObj.query || {};
    urlObj.query.preselect_filters = this.readFilters();
    urlObj.search = null;
    history.pushState(urlObj.query, window.title, urlLib.format(urlObj));
  }

  stopPeriodicRender() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  startPeriodicRender(interval) {
    this.stopPeriodicRender();
    const dash = this;
    const immune = this.props.dashboard.metadata.timed_refresh_immune_slices || [];
    const refreshAll = () => {
      const affectedSlices = this.getAllSlices()
        .filter(slice => immune.indexOf(slice.slice_id) === -1);
      dash.renderSlices(affectedSlices, true, interval * 0.2);
    };
    const fetchAndRender = function () {
      refreshAll();
      if (interval > 0) {
        dash.refreshTimer = setTimeout(fetchAndRender, interval);
      }
    };

    fetchAndRender();
  }

  readFilters() {
    // Returns a list of human readable active filters
    return JSON.stringify(this.props.filters, null, '  ');
  }

  updateDashboardTitle(title) {
    this.props.actions.updateDashboardTitle(title);
  }

  fetchFaveStar(id) {
    this.props.actions.fetchFaveStar(id);
  }

  saveFaveStar(id, isStarred) {
    this.props.actions.saveFaveStar(id, isStarred);
  }

  saveSlice(currentSlice, sliceName) {
    this.props.actions.saveSlice(currentSlice, sliceName);
  }

  removeSlice(slice) {
    this.props.actions.removeSlice(slice);
  }

  removeChart(chartKey) {
    this.props.actions.removeChart(chartKey);
  }

  updateDashboardLayout(layout) {
    this.props.actions.updateDashboardLayout(layout);
  }

  addSlicesToDashboard(sliceIds) {
    return this.props.actions.addSlicesToDashboard(this.props.dashboard.id, sliceIds);
  }

  toggleExpandSlice(slice, isExpanded) {
    this.props.actions.toggleExpandSlice(slice, !isExpanded);
  }

  addFilter(sliceId, col, vals, merge, refresh) {
    this.props.actions.addFilter(sliceId, col, vals, merge, refresh);
  }

  clearFilter(sliceId) {
    this.props.actions.clearFilter(sliceId);
  }

  removeFilter(sliceId, col, vals) {
    this.props.actions.removeFilter(sliceId, col, vals);
  }

  bindResizeToWindowResize() {
    let resizeTimer;
    const dash = this;
    const allSlices = this.getAllSlices();
    $(window).on('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(dash.renderSlices(allSlices), 500);
    });
  }

  // render an list of slices
  renderSlices(slc, force = false, interval = 0) {
    const dash = this;
    const slices = slc || this.getAllSlices();
    if (!interval) {
      slices.forEach(slice => (dash.fetchSlice(slice, force)));
      return;
    }

    const meta = this.props.dashboard.metadata;
    const refreshTime = Math.max(interval, meta.stagger_time || 5000); // default 5 seconds
    if (typeof meta.stagger_refresh !== 'boolean') {
      meta.stagger_refresh = meta.stagger_refresh === undefined ?
        true : meta.stagger_refresh === 'true';
    }
    const delay = meta.stagger_refresh ? refreshTime / (slices.length - 1) : 0;
    slices.forEach((slice, i) => {
      setTimeout(() => dash.fetchSlice(slice, force), delay * i);
    });
  }

  render() {
    return (
      <Dashboard
        initMessages={this.props.initMessages}
        dashboard={this.props.dashboard}
        slices={this.props.slices}
        datasources={this.props.datasources}
        filters={this.props.filters}
        refresh={this.props.refresh}
        timeout={this.props.timeout}
        user_id={this.props.user_id}
        isStarred={this.props.isStarred}
        getFormDataExtra={this.getFormDataExtra.bind(this)}
        fetchSlice={this.fetchSlice.bind(this)}
        renderSlices={this.renderSlices.bind(this, this.getAllSlices())}
        startPeriodicRender={this.startPeriodicRender.bind(this)}
        updateDashboardTitle={this.updateDashboardTitle.bind(this)}
        readFilters={this.readFilters.bind(this)}
        fetchFaveStar={this.fetchFaveStar.bind(this)}
        saveFaveStar={this.saveFaveStar.bind(this)}
        saveSlice={this.saveSlice.bind(this)}
        removeSlice={this.removeSlice.bind(this)}
        removeChart={this.removeChart.bind(this)}
        updateDashboardLayout={this.updateDashboardLayout.bind(this)}
        addSlicesToDashboard={this.addSlicesToDashboard.bind(this)}
        toggleExpandSlice={this.toggleExpandSlice.bind(this)}
        addFilter={this.addFilter.bind(this)}
        clearFilter={this.clearFilter.bind(this)}
        removeFilter={this.removeFilter.bind(this)}
      />
    );
  }
}

DashboardViewContainer.propTypes = propTypes;

function mapStateToProps({ charts, dashboard }) {
  return {
    initMessages: dashboard.common.flash_messages,
    timeout: dashboard.common.conf.SUPERSET_WEBSERVER_TIMEOUT,
    dashboard: dashboard.dashboard,
    slices: charts,
    datasources: dashboard.datasources,
    filters: dashboard.filters,
    refresh: dashboard.refresh,
    user_id: dashboard.user_id,
    isStarred: !!dashboard.isStarred,
  };
}

function mapDispatchToProps(dispatch) {
  const actions = Object.assign({}, chartActions, dashboardActions);
  return {
    actions: bindActionCreators(actions, dispatch),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(DashboardViewContainer);
