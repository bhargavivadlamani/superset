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
import React, { useRef, useState } from 'react';
import { theme, useConfig } from 'docz';
import { Link } from 'gatsby';
import { ThemeProvider } from 'theme-ui';
import {
  Button, Col, Row, Carousel,
} from 'antd';
import { css } from '@emotion/core';
import { supersetTheme } from '@superset-ui/style';
import {
  DeploymentUnitOutlined,
  FireOutlined,
  DotChartOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import GitHubButton from 'react-github-btn';

import { Databases } from '../resources/data';
import Layout from '../components/layout';
import Image from '../components/image';
import 'antd/dist/antd.css';
import SEO from '../components/seo';
import logo from '../images/superset-logo-horiz-apache.svg';
import { mq } from '../utils';

const { colors } = supersetTheme;

const titleContainer = css`
  position: relative;
  text-align: center;
  padding-top: 131px;
  padding-bottom: 80px;
  background-image: url('/images/data-point.jpg');
  background-size: cover;
  Button {
    margin-top: 39px;
  }
  .github-section {
    margin-bottom: 40px;
    margin-top: 40px;
    .github-button {
      margin: 5px;
    }
  }
  .logo-horiz {
    margin-top: 20px;
    margin-bottom: 20px;
    width: 600px;
    ${[mq[3]]} {
      width: 500px;
    }
    ${[mq[2]]} {
      width: 450px;
    }
    ${[mq[1]]} {
      width: 400px;
    }
    ${[mq[0]]} {
      width: 350px;
    }
  }
  .incubator {
    margin-top: 40px;
  }
  .alert {
    color: #0c5460;
    background-color: #d1ecf1;
    border-color: #bee5eb;
    max-width: 600px;
    margin: 0 auto;
    padding: 0.75rem 1.25rem;
    margin-top: 83px;
    border: 1px solid transparent;
    border-radius: 0.25rem;
  }
`;

const secondaryHeading = css`
  font-size: 55px;
  text-align: center;
`;

const featureSectionStyle = css`
  background: #fff;
  padding: 5vw 0;
  margin-top: 0px;
  margin-bottom: 30px;
  .featureList {
    padding: 40px;
    width: 100%;
    list-style-type: none;
    margin: 0 auto;
    max-width: 1000px;
    .feature {
      padding: 20px;
      text-align: center;
      margin-bottom: 40px;
      .imagePlaceHolder {
        svg {
          width: 60px;
          height: 60px;
        }
        margin-bottom: 15px;
      }
      .featureText {
        color: ${colors.grayscale.dark2};
        strong {
          font-size: 18px;
        }
      }
    }
  }
  .heading {
    font-size: 22px;
    margin: 0 auto;
    text-align: center;
  }
  .anticon {
    color: #ccc;
  }
`;

const integrationSection = css`
  background: white;
  margin-bottom: 64px;
  .databaseSub {
    text-align: center;
    display: block;
    margin-bottom: 40px;
    font-size: 18px;
  }

  .databaseList {
    margin-top: 100px;
    list-style-type: none;
    padding: 0px;
    max-width: 1000px;
    margin: 0 auto;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-around;
    margin-bottom: 50px;
    a {
      margin: 20px;
    }
  }
`;

const linkCarousel = css`
  .toggleContainer {
    display: flex;
    flex-direction: column;
    margin-bottom: 100px;
    .toggleBtns {
      display: flex;
      flex-direction: row;
      justify-content: center;
      .toggle {
        margin: 10px;
        color: #666;
        border: 1px solid #888;
        background-color: #20a7c911;
        border-radius: 3px;
        padding: 16px;
        transition: all 0.25s;
        &:hover {
          cursor: pointer;
          color: ${colors.primary.base};
          border: 1px solid ${colors.primary.base};
        }
        &.active {
          background: red;
          background: #20a7c933;
        }
      }
    }
    .imageContainer {
      img {
        margin: 0 auto;
        width: 80%;
        box-shadow: 0 0 3px #aaa;
        margin-top: 5px;
        margin-bottom: 5px;
      }
    }
  }
`;

const Feature = ({ icon, title, descr }) => (
  <li className="feature">
    <div className="imagePlaceHolder">
      {icon}
    </div>
    <div className="featureText">
      <strong>{title}</strong>
      <br />
      {descr}
    </div>
  </li>
);
const Theme = () => {
  const config = useConfig();
  const slider = useRef(null);

  const [slideIndex, setSlideIndex] = useState(0);

  const onChange = (index) => {
    setSlideIndex(index);
  };

  return (
    <ThemeProvider theme={config}>
      <SEO title="Superset" />
      <Layout>
        <div css={titleContainer}>
          <img className="logo-horiz" src={logo} alt="logo-horiz" />
          <h2>
            Apache Superset is a modern data
            <br />
            exploration and visualization platform
          </h2>
          <div className="github-section">
            <span className="github-button">
              <GitHubButton
                href="https://github.com/apache/incubator-superset"
                data-size="large"
                data-show-count="true"
                aria-label="Star apache/incubator-superset on GitHub"
              >
                Star
              </GitHubButton>
            </span>
            <span className="github-button">
              <GitHubButton
                href="https://github.com/apache/incubator-superset/subscription"
                data-size="large"
                data-show-count="true"
                aria-label="Watch apache/incubator-superset on GitHub"
              >
                Watch
              </GitHubButton>
            </span>
            <span className="github-button">
              <GitHubButton
                href="https://github.com/apache/incubator-superset/fork"
                data-size="large"
                data-show-count="true"
                aria-label="Fork apache/incubator-superset on GitHub"
              >
                Fork
              </GitHubButton>
            </span>
          </div>
          <div className="incubator">
            <Image imageName="incubatorSm" />
          </div>
          <div>
            <Link to="/docs/intro">
              <Button type="primary" size="medium">
                Get Started
              </Button>
            </Link>
          </div>
        </div>

        <div css={featureSectionStyle}>
          <h2 css={secondaryHeading}>Overview</h2>
          <h4 className="heading">
            Superset is fast, lightweight, intuitive, and loaded with options
            that make it easy for users of all skill sets to explore and
            visualize their data, from simple line charts to highly detailed
            geospatial charts.
          </h4>
          <ul className="featureList ant-row">
            <Row>
              <Col sm={24} md={12}>
                <Feature
                  icon={<FireOutlined />}
                  title="Powerful and easy to use"
                  descr={`
                    Quickly and easily integrate and explore your data, using
                    either our simple no-code viz builder or state of the art SQL
                    IDE.
                  `}
                />
              </Col>

              <Col sm={24} md={12}>
                <Feature
                  icon={<DatabaseOutlined />}
                  title="Integrates with modern databases"
                  descr={`
                    Superset can connect to any SQL based datasource
                    through SQL Alchemy, including modern cloud native databases
                    and engines at petabyte scale.
                  `}
                />
              </Col>

            </Row>
            <Row>
              <Col sm={24} md={12}>
                <Feature
                  icon={<DeploymentUnitOutlined />}
                  title="Modern architecture"
                  descr={`
                    Superset is lightweight and highly scalable, leveraging the
                    power of your existing data infrastructure without requiring
                    yet another ingestion layer.
                  `}
                />
              </Col>
              <Col sm={24} md={12}>
                <Feature
                  icon={<DotChartOutlined />}
                  title="Rich visualizations and dashboards"
                  descr={`
                    Superset ships with a wide array of beautiful visualizations.
                    Our visualization plug-in architecture makes it easy to build
                    custom visualizations that drop directly into Superset.
                  `}
                />
              </Col>
            </Row>
          </ul>
        </div>

        <div css={linkCarousel}>
          <h2 css={secondaryHeading}>Explore</h2>
          <div className="toggleContainer">
            <div className="toggleBtns">
              <div
                className={`toggle ${slideIndex === 0 ? 'active' : null}`}
                onClick={() => slider.current.goTo(0)}
                role="button"
              >
                <h2>Explore</h2>
                <span>
                  Explore your data using the array of data visualizations.
                </span>
              </div>

              <div
                className={`toggle ${slideIndex === 1 ? 'active' : null}`}
                onClick={() => slider.current.goTo(1)}
                role="button"
              >
                <h2>View</h2>
                <span>View your data through interactive dashboards</span>
              </div>
              <div
                className={`toggle ${slideIndex === 2 ? 'active' : null}`}
                onClick={() => slider.current.goTo(2)}
                role="button"
              >
                <h2>Investigate</h2>
                <span>Use sqlab to write queries to explore your data</span>
              </div>
            </div>
            <Carousel ref={slider} effect="scrollx" afterChange={onChange}>
              <div className="imageContainer">
                <img src="/images/explorer.png" alt="" />
              </div>
              <div className="imageContainer">
                <img src="/images/dashboard3.png" alt="" />
              </div>
              <div className="imageContainer">
                <img src="/images/sqllab1.png" alt="" />
              </div>
            </Carousel>
          </div>
        </div>
        <div css={integrationSection}>
          <h2 css={secondaryHeading}>Supported Databases</h2>

          <ul className="databaseList">
            {Databases.map(
              ({
                title, href, imgName: imageName, width, height,
              }) => (
                <a href={href} target="_blank" key={imageName} rel="noreferrer">
                  <Image
                    {...{
                      imageName,
                      type: 'db',
                      width,
                      height,
                      alt: title,
                    }}
                  />
                </a>
              ),
            )}
          </ul>
          <span className="databaseSub">
            {' '}
            ... and any other SQLAlchemy
            {' '}
            <a href="https://superset.incubator.apache.org/installation.html#database-dependencies">
              {' '}
              compatible databases
              {' '}
            </a>
            {' '}
          </span>
        </div>
      </Layout>
    </ThemeProvider>
  );
};

// @ts-ignore
export default theme()(Theme);
