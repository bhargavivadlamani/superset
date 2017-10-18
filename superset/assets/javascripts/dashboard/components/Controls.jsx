import React from 'react';
import PropTypes from 'prop-types';
import { ButtonGroup } from 'react-bootstrap';

import Button from '../../components/Button';
import CssEditor from './CssEditor';
import RefreshIntervalModal from './RefreshIntervalModal';
import SaveModal from './SaveModal';
import CodeModal from './CodeModal';
import SliceAdder from './SliceAdder';
import { t } from '../../locales';

const $ = window.$ = require('jquery');

const propTypes = {
  dashboard: PropTypes.object.isRequired,
  slices: PropTypes.array,
  user_id: PropTypes.string.isRequired,
  addSlicesToDashboard: PropTypes.func,
  onSave: PropTypes.func,
  onChange: PropTypes.func,
  readFilters: PropTypes.func,
  renderSlices: PropTypes.func,
  serialize: PropTypes.func,
  startPeriodicRender: PropTypes.func,
};

class Controls extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      css: props.dashboard.css || '',
      cssTemplates: [],
    };
  }
  componentWillMount() {
    $.get('/csstemplateasyncmodelview/api/read', (data) => {
      const cssTemplates = data.result.map(row => ({
        value: row.template_name,
        css: row.css,
        label: row.template_name,
      }));
      this.setState({ cssTemplates });
    });
  }
  refresh() {
    // Force refresh all slices
    this.props.renderSlices(true);
  }
  changeCss(css) {
    this.setState({ css });
    this.props.onChange();
  }
  render() {
    const dashboard = this.props.dashboard;
    const emailBody = t('Checkout this dashboard: %s', window.location.href);
    const emailLink = 'mailto:?Subject=Superset%20Dashboard%20'
      + `${dashboard.dashboard_title}&Body=${emailBody}`;
    return (
      <ButtonGroup>
        <Button
          tooltip={t('Force refresh the whole dashboard')}
          onClick={this.refresh.bind(this)}
        >
          <i className="fa fa-refresh" />
        </Button>
        <SliceAdder
          dashboard={dashboard}
          addSlicesToDashboard={this.props.addSlicesToDashboard}
          user_id={this.props.user_id}
          triggerNode={
            <i className="fa fa-plus" />
          }
        />
        <RefreshIntervalModal
          onChange={refreshInterval => this.props.startPeriodicRender(refreshInterval * 1000)}
          triggerNode={
            <i className="fa fa-clock-o" />
          }
        />
        <CodeModal
          codeCallback={this.props.readFilters}
          triggerNode={<i className="fa fa-filter" />}
        />
        <CssEditor
          dashboard={dashboard}
          triggerNode={
            <i className="fa fa-css3" />
          }
          initialCss={dashboard.css}
          templates={this.state.cssTemplates}
          onChange={this.changeCss.bind(this)}
        />
        <Button
          onClick={() => { window.location = emailLink; }}
        >
          <i className="fa fa-envelope" />
        </Button>
        <Button
          disabled={!dashboard.dash_edit_perm}
          onClick={() => {
            window.location = `/dashboardmodelview/edit/${dashboard.id}`;
          }}
          tooltip={t('Edit this dashboard\'s properties')}
        >
          <i className="fa fa-edit" />
        </Button>
        <SaveModal
          dashboard={dashboard}
          readFilters={this.props.readFilters}
          serialize={this.props.serialize}
          onSave={this.props.onSave}
          css={this.state.css}
          triggerNode={
            <Button disabled={!dashboard.dash_save_perm}>
              <i className="fa fa-save" />
            </Button>
          }
        />
      </ButtonGroup>
    );
  }
}
Controls.propTypes = propTypes;

export default Controls;
