import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import { Panel } from 'react-bootstrap';
import TimeSeriesLineChart from './charts/TimeSeriesLineChart';
import moment from 'moment';
import nvd3Vis from '../../../visualizations/nvd3_vis';
import visMap from '../../../visualizations/main';

const propTypes = {
  data: PropTypes.array.isRequired,
  sliceName: PropTypes.string.isRequired,
  vizType: PropTypes.string.isRequired,
  height: PropTypes.string.isRequired,
  sliceContainerId: PropTypes.string.isRequired,
  jsonEndpoint: PropTypes.string.isRequired,
};

class ChartContainer extends React.Component {
  getMockedSliceObject() {
    return {
      jsonEndpoint: () => {
        return this.props.jsonEndpoint;
      },

      container: {
        html: (string) => {
          //this should be a callback to clear the contents of the slice container
        },

        css: (dimension, pixelString) => {
          // dimension can be 'height'
          // pixel string can be '300px'
          // should call callback to adjust height of chart
        }
      },

      width: () => {
        return this.chartContainerRef.getBoundingClientRect().width;
      },

      height: () => {
        return parseInt(this.props.height, 10) - 100;
      },

      selector: `#${this.props.sliceContainerId}`,

      done: (payload) => {
        // finished rendering callback
      },
    };
  }

  renderVis() {
    const slice = this.getMockedSliceObject();
    visMap[this.props.vizType](slice).render();
  }

  componentDidMount() {
    this.renderVis();
  }

  componentDidUpdate() {
    this.renderVis();
  }

  render() {
    return (
      <div className="chart-container">
        <Panel
          style={{ height: this.props.height }}
          header={
            <div className="panel-title">{this.props.sliceName}</div>
          }
        >
          <div
            id={this.props.sliceContainerId}
            ref={(ref) => { this.chartContainerRef = ref; }}
           />
        </Panel>
      </div>
    );
  }
}

ChartContainer.propTypes = propTypes;

function mapStateToProps(state) {
  return {
    data: state.viz.data,
    sliceName: state.sliceName,
    vizType: state.viz.formData.vizType,
    sliceContainerId: `slice-container-${state.viz.formData.sliceId}`,
    jsonEndpoint: state.viz.jsonEndPoint,
  };
}

function mapDispatchToProps() {
  return {};
}

export default connect(mapStateToProps, mapDispatchToProps)(ChartContainer);
