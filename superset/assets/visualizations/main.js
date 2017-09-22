/* eslint-disable global-require */

// You ***should*** use these to reference viz_types in code
export const VIZ_TYPES = {
  area: 'area',
  bar: 'bar',
  big_numberbig_number_total: 'big_numberbig_number_total',
  box_plot: 'box_plot',
  bubble: 'bubble',
  bullet: 'bullet',
  cal_heatmap: 'cal_heatmap',
  compare: 'compare',
  directed_force: 'directed_force',
  chord: 'chord',
  dist_bar: 'dist_bar',
  filter_box: 'filter_box',
  heatmap: 'heatmap',
  histogram: 'histogram',
  horizon: 'horizon',
  iframe: 'iframe',
  line: 'line',
  mapbox: 'mapbox',
  markup: 'markup',
  para: 'para',
  pie: 'pie',
  pivot_table: 'pivot_table',
  sankey: 'sankey',
  separator: 'separator',
  sunburst: 'sunburst',
  table: 'table',
  time_table: 'time_table',
  treemap: 'treemap',
  country_map: 'country_map',
  word_cloud: 'word_cloud',
  world_map: 'world_map',
  dual_line: 'dual_line',
  event_flow: 'event_flow',
  paired_ttest: 'paired_ttest',
  partition: 'partition',
};

const vizMap = {
  [VIZ_TYPES.area]: require('./nvd3_vis.js'),
  [VIZ_TYPES.bar]: require('./nvd3_vis.js'),
  [VIZ_TYPES.big_number]: require('./big_number.js'),
  [VIZ_TYPES.big_number_total]: require('./big_number.js'),
  [VIZ_TYPES.box_plot]: require('./nvd3_vis.js'),
  [VIZ_TYPES.bubble]: require('./nvd3_vis.js'),
  [VIZ_TYPES.bullet]: require('./nvd3_vis.js'),
  [VIZ_TYPES.cal_heatmap]: require('./cal_heatmap.js'),
  [VIZ_TYPES.compare]: require('./nvd3_vis.js'),
  [VIZ_TYPES.directed_force]: require('./directed_force.js'),
  [VIZ_TYPES.chord]: require('./chord.jsx'),
  [VIZ_TYPES.dist_bar]: require('./nvd3_vis.js'),
  [VIZ_TYPES.filter_box]: require('./filter_box.jsx'),
  [VIZ_TYPES.heatmap]: require('./heatmap.js'),
  [VIZ_TYPES.histogram]: require('./histogram.js'),
  [VIZ_TYPES.horizon]: require('./horizon.js'),
  [VIZ_TYPES.iframe]: require('./iframe.js'),
  [VIZ_TYPES.line]: require('./nvd3_vis.js'),
  time_pivot: require('./nvd3_vis.js'),
  mapbox: require('./mapbox.jsx'),
  markup: require('./markup.js'),
  para: require('./parallel_coordinates.js'),
  pie: require('./nvd3_vis.js'),
  pivot_table: require('./pivot_table.js'),
  sankey: require('./sankey.js'),
  separator: require('./markup.js'),
  sunburst: require('./sunburst.js'),
  table: require('./table.js'),
  time_table: require('./time_table.jsx'),
  treemap: require('./treemap.js'),
  country_map: require('./country_map.js'),
  word_cloud: require('./word_cloud.js'),
  world_map: require('./world_map.js'),
  dual_line: require('./nvd3_vis.js'),
  event_flow: require('./EventFlow.jsx'),
  paired_ttest: require('./paired_ttest.jsx'),
  partition: require('./partition.js'),
  deck_scatter: require('./deckgl/scatter.jsx'),
  deck_screengrid: require('./deckgl/screengrid.jsx'),
  deck_grid: require('./deckgl/grid.jsx'),
  deck_hex: require('./deckgl/hex.jsx'),
};
export default vizMap;
