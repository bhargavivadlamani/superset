import d3 from 'd3';
import './country_map.css';
import { colorScalerFactory } from '../javascripts/modules/colors';
import d3ScaleChromatic from 'd3-scale-chromatic';


function countryMapChart(slice, payload) {
  // CONSTANTS
  const fd = payload.form_data;
  let path;
  let g;
  let bigText;
  let resultText;
  const container = slice.container;
  const data = payload.data;
  const viz = 'map';

  const colorScaler = colorScalerFactory(fd.linear_color_scheme, data, v => v.metric, viz);
  const colorMap = {};
  data.forEach((d) => {
    colorMap[d.country_id] = colorScaler(d.metric);
  });
  const colorFn = d => colorMap[d.properties.ISO] || 'none';

  let centered;
  path = d3.geo.path();
  d3.select(slice.selector).selectAll('*').remove();
  const div = d3.select(slice.selector)
    .append('svg:svg')
    .attr('width', slice.width())
    .attr('height', slice.height())
    .attr('preserveAspectRatio', 'xMidYMid meet');

  container.css('height', slice.height());
  container.css('width', slice.width());

  const clicked = function (d) {
    let x;
    let y;
    let k;
    let bigTextX;
    let bigTextY;
    let bigTextSize;
    let resultTextX;
    let resultTextY;

    if (d && centered !== d) {
      const centroid = path.centroid(d);
      x = centroid[0];
      y = centroid[1];
      bigTextX = centroid[0];
      bigTextY = centroid[1] - 40;
      resultTextX = centroid[0];
      resultTextY = centroid[1] - 40;
      bigTextSize = '6px';
      k = 4;
      centered = d;
    } else {
      x = slice.width() / 2;
      y = slice.height() / 2;
      bigTextX = 0;
      bigTextY = 0;
      resultTextX = 0;
      resultTextY = 0;
      bigTextSize = '30px';
      k = 1;
      centered = null;
    }

    g.transition()
      .duration(750)
      .attr('transform', 'translate(' + slice.width() / 2 + ',' + slice.height() / 2 + ')scale(' + k + ')translate(' + -x + ',' + -y + ')');
    bigText.transition()
      .duration(750)
      .attr('transform', 'translate(0,0)translate(' + bigTextX + ',' + bigTextY + ')')
      .style('font-size', bigTextSize);
    resultText.transition()
      .duration(750)
      .attr('transform', 'translate(0,0)translate(' + resultTextX + ',' + resultTextY + ')');
  };

  const selectAndDisplayNameOfRegion = function (feature) {
    let name = '';
    if (feature && feature.properties) {
      if (feature.properties.ID_2) {
        name = feature.properties.NAME_2;
      } else {
        name = feature.properties.NAME_1;
      }
    }
    bigText.text(name);
  };

  const updateMetrics = function (region) {
    if (region.length > 0) {
      resultText.text(d3.format(',')(region[0].metric));
    }
  };

  const mouseenter = function (d) {
    // Darken color
    let c = colorFn(d);
    if (c !== 'none') {
      c = d3.rgb(c).darker().toString();
    }
    d3.select(this).style('fill', c);
    selectAndDisplayNameOfRegion(d);
    const result = data.filter(region => region.country_id === d.properties.ISO);
    updateMetrics(result);
  };

  const mouseout = function () {
    d3.select(this).style('fill', colorFn);
    bigText.text('');
    resultText.text('');
  };

  div.append('rect')
    .attr('class', 'background')
    .attr('width', slice.width())
    .attr('height', slice.height())
    .on('click', clicked);

  g = div.append('g');
  const mapLayer = g.append('g')
    .classed('map-layer', true);
  bigText = g.append('text')
    .classed('big-text', true)
    .attr('x', 20)
    .attr('y', 45);
  resultText = g.append('text')
    .classed('result-text', true)
    .attr('x', 20)
    .attr('y', 60);
  
  //Adding legend for our Choropleth

 // var legend = svg.selectAll("g.legend")
 // .data(ext_color_domain)
 // .enter().append("g")
  //.attr("class", "legend");

 // var ls_w = 20, ls_h = 20;

 // legend.append("rect")
  //.attr("x", 20)
  //.attr("y", function(d, i){ return height - (i*ls_h) - 2*ls_h;})
  //.attr("width", ls_w)
  //.attr("height", ls_h)
  //.style("fill", function(d, i) { return color(d); })
  //.style("opacity", 0.8);

  //legend.append("text")
  //.attr("x", 50)
  //.attr("y", function(d, i){ return height - (i*ls_h) - ls_h - 4;})
  //.text(function(d, i){ return legend_labels[i]; });

  const url = `/static/assets/visualizations/countries/${fd.select_country.toLowerCase()}.geojson`;
  d3.json(url, function (error, mapData) {
    const features = mapData.features;
    const center = d3.geo.centroid(mapData);
    let scale = 150;
    let offset = [slice.width() / 2, slice.height() / 2];
    let projection = d3.geo.mercator().scale(scale).center(center)
      .translate(offset);

    path = path.projection(projection);

    const bounds = path.bounds(mapData);
    const hscale = scale * slice.width() / (bounds[1][0] - bounds[0][0]);
    const vscale = scale * slice.height() / (bounds[1][1] - bounds[0][1]);
    scale = (hscale < vscale) ? hscale : vscale;
    const offsetWidth = slice.width() - (bounds[0][0] + bounds[1][0]) / 2;
    const offsetHeigth = slice.height() - (bounds[0][1] + bounds[1][1]) / 2;
    offset = [offsetWidth, offsetHeigth];
    projection = d3.geo.mercator().center(center).scale(scale).translate(offset);
    path = path.projection(projection);

    // Draw each province as a path
    mapLayer.selectAll('path')
      .data(features)
      .enter().append('path')
      .attr('d', path)
      .attr('class', 'region')
      .attr('vector-effect', 'non-scaling-stroke')
      .style('fill', colorFn)
      .on('mouseenter', mouseenter)
      .on('mouseout', mouseout)
      .on('click', clicked);
  });
  container.show();
}

module.exports = countryMapChart;
