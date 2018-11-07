/* eslint-disable react/no-danger */
import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Collapse } from 'react-bootstrap';

const propTypes = {
  message: PropTypes.node.isRequired,
  link: PropTypes.string,
  stacktrace: PropTypes.string,
  showStackTrace: PropTypes.bool,
};
const defaultProps = {
  showStackTrace: false,
  link: null,
  stacktrace: null,
};

class StackTraceMessage extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      showStackTrace: props.showStackTrace,
    };
  }

  render() {
    return (
      <div className={`stack-trace-container${this.props.stacktrace ? ' has-trace' : ''}`}>
        <Alert
          bsStyle="warning"
          onClick={() => this.setState({ showStackTrace: !this.state.showStackTrace })}
        >
          {this.props.message}
          {this.props.link &&
          <a
            href={this.props.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            (Request Access)
          </a>
       }
        </Alert>
        {this.props.stacktrace &&
          <Collapse in={this.state.showStackTrace}>
            <pre>
              {this.props.stacktrace}
            </pre>
          </Collapse>
        }
      </div>
    );
  }
}

StackTraceMessage.propTypes = propTypes;
StackTraceMessage.defaultProps = defaultProps;

export default StackTraceMessage;
