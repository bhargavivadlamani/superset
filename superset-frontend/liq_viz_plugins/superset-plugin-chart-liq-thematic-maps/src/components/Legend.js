import React, { useEffect, useState } from 'react';
import { Collapse, Divider, List, Avatar, Button, Typography } from 'antd';
import {
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';

const defaults = require('../defaultLayerStyles.js');
const intranetImgs = defaults.intranetImgs;
const intranetLegendExprs = defaults.intranetLegendExprs;

const { Panel } = Collapse;
const { Text } = Typography;

// Map tile layer names to a more human readable format
const nameMap = {
  'shopping_centres': 'Shopping Centres',
  'department_stores': 'Department Stores',
  'discount_department_stores': 'Discount Department Stores',
  'large_format_retail': 'Large Format Retail',
  'mini_majors': 'Mini Majors',
  'supermarkets': 'Supermarkets',
  'liquor': 'Liquor'
};

// Map each tile intranet layer and it's corresponding data for the legend in the format [Name, Image Icon Source, Description]
const intranetLegend = {
  'shopping_centres': [
    ['Super Regional', intranetImgs['regional'], ''],
    ['Regional', intranetImgs['regional'], ''],
    ['Sub-regional', intranetImgs['sub_regional'], ''],
    ['Neighbourhood', intranetImgs['neighbourhood'], ''],
    ['City Centre', intranetImgs['city_centre'], ''],
    ['Themed', intranetImgs['themed'], ''],
    ['Large Format Retail', intranetImgs['lfr'], ''],
    ['Outlet', intranetImgs['local_transit_outlet'], ''],
    ['Market', intranetImgs['market'], ''],
    ['Local', intranetImgs['local_transit_outlet'], ''],
    ['Transit', intranetImgs['local_transit_outlet'], '']
  ],
  'department_stores': [
    ['David Jones', intranetImgs['david_jones'], ''],
    ['Myer', intranetImgs['myer'], ''],
    ['Harris Scarfe', intranetImgs['harris_scarfe'], ''],
    ['Unknown DS', intranetImgs['unknown_ds'], '']
  ],
  'discount_department_stores': [
    ['Kmart', intranetImgs['kmart'], ''],
    ['Kmart Hub', intranetImgs['kmart_hub'], ''],
    ['Target', intranetImgs['target'], ''],
    ['Big W', intranetImgs['big_w'], ''],
    ['Target Country', intranetImgs['target_country'], ''],
    ['Unknown DDS', intranetImgs['unknown_dds'], '']
  ],
  'large_format_retail': [
    ['Amart', intranetImgs['amart'], ''],
    ['Anaconda', intranetImgs['anaconda'], ''],
    ['Bunnings', intranetImgs['bunnings'], ''],
    ['Domayne', intranetImgs['domayne'], ''],
    ['Fantastic Furniture', intranetImgs['fantastic_furniture'], ''],
    ['Forty Winks', intranetImgs['forty_winks'], ''],
    ['Harvey Norman Group', intranetImgs['harvey_norman'], ''],
    ['Ikea', intranetImgs['ikea'], ''],
    ['Lincraft', intranetImgs['lincraft'], ''],
    ['Snooze', intranetImgs['snooze'], ''],
    ['Spotlight', intranetImgs['spotlight'], ''],
    ['The Good Guys', intranetImgs['the_good_guys'], '']
  ],
  'mini_majors': [
    ['Apple Store', intranetImgs['apple_store'], ''],
    ['Best & Less', intranetImgs['best_and_less'], ''],
    ['Chemist Warehouse', intranetImgs['chemist_warehouse'], ''],
    ['Cotton On', intranetImgs['cotton_on'], ''],
    ['Country Road', intranetImgs['country_road'], ''],
    ['Daiso', intranetImgs['daiso'], ''],
    ['Dan Murphy\'s', intranetImgs['dan_murphys'], ''],
    ['First Choice Liquor', intranetImgs['first_choice_liquor'], ''],
    ['Glue Store', intranetImgs['glue_store'], ''],
    ['H & M', intranetImgs['h_and_m'], ''],
    ['Harris Farm Markets', intranetImgs['harris_farm_markets'], ''],
    ['HS Home', intranetImgs['hs_home'], ''],
    ['JB Hi-Fi', intranetImgs['jbhifi'], ''],
    ['Kathmandu', intranetImgs['kathmandu'], ''],
    ['Mecca Cosmetica', intranetImgs['mecca_cosmetica'], ''],
    ['Priceline Pharmacy', intranetImgs['priceline_pharmacy'], ''],
    ['Rebel Sport', intranetImgs['rebel_sports'], ''],
    ['Rivers', intranetImgs['rivers'], ''],
    ['Sephora', intranetImgs['sephora'], ''],
    ['Terry White Chemist', intranetImgs['terry_white_chemmart'], ''],
    ['The Reject Shop', intranetImgs['the_reject_shop'], ''],
    ['TK Maxx', intranetImgs['tk_maxx'], ''],
    ['Uniqlo', intranetImgs['uniqlo'], ''],
    ['Zara', intranetImgs['zara'], '']
  ],
  'supermarkets': [
    ['Woolworths', intranetImgs['woolworths'], ''],
    ['Coles', intranetImgs['coles'], ''],
    ['Aldi', intranetImgs['aldi'], ''],
    ['IGA', intranetImgs['iga'], ''],
    ['FoodWorks', intranetImgs['foodworks'], ''],
    ['Costco', intranetImgs['costco'], ''],
    ['Drakes', intranetImgs['drakes_supermarket'], ''],
    ['Spar', intranetImgs['spar'], ''],
    ['IGA Express', intranetImgs['iga_express'], ''],
    ['Others', intranetImgs['other_smkt'], ''],
    ['Unknown Smkt', intranetImgs['unknown_smkt'], '']
  ],
  'liquor': [
    ['Liquorland', intranetImgs['liquorland'], ''],
    ['BWS', intranetImgs['bws'], ''],
    ['IGA Liquor', intranetImgs['iga_liquor'], ''],
    ['Aldi Liquor', intranetImgs['aldi_liquor'], ''],
    ['Vintage Cellars', intranetImgs['vintage_cellars'], ''],
    ['First Choice Liquor', intranetImgs['first_choice_liquor'], ''],
    ['Dan Murphys', intranetImgs['dan_murphys'], ''],
    ['Other Liquor', intranetImgs['other_liquor']]
  ]
};

export default function Legend(props) {
  
  const {
    colorMap,
    groupCol,
    thematicData,
    thematicCol,
    intranetLayers,
    tradeAreas,
    taSectorMap,
    map
  } = props;

  const thematicHeader = 'Thematic';
  const thematicPanelHeaders = [thematicCol];
  const thematicInit = {'boundary_tileset': []};
  const thematicLayers = {'boundary_tileset': Object.keys(colorMap)};
  const thematicListData = {
    'boundary_tileset': Object.keys(thematicData).map(k => {
      return {
        title: k,
        color: thematicData[k],
        avatar: <div style={{width: 24, height: 24, background: item.color}} />
      }
    })
  };

  const intranetHeader = 'Intranet Layers';
  const intranetPanelHeaders = intranetLayers.map(x => nameMap[x]);
  const intranetInit = Object.fromEntries(intranetLayers.map(x => [x, []]));
  const intranetLegLayers = Object.fromEntries(
    intranetLayers.map(x => [x, intranetLegend[x].map(d => d[0])])
  );
  const intranetListData = Object.fromEntries(
    intranetLayers.map(x => [x, intranetLegend[x].map(d => {
      return {
        title: d[0], 
        img: d[1], 
        desc: d[2],
        avatar: <Avatar src={d[1]} shape='square' size={24} />
      }
    })])
  );

  

}

function Legend2(props) {

  const {
    colorMap, 
    groupCol,
    thematicData, // maps thematic breaks to their respective colours 
    thematicCol, // name of the thematic metric column
    intranetLayers,
    tradeAreas, // list of trade area names rendered on the map
    taSectorSA1Map,
    map
  } = props;

  const [currHiddenThematic, setCurrHiddenThematic] = useState([]); // track hidden ranges of thematic
  const [currHiddenIntranet, setCurrHiddenIntranet] = useState( // track hidden sub-levels of intranet layers e.g. Regional for Shopping Centres
    Object.fromEntries(Object.keys(intranetLegendExprs).map(x => [x, []]))
  );
  const [currHiddenTAs, setCurrHiddenTAs] = useState([]); // track hidden trade areas

  // Generate filter expression for thematic range, we don't want to display anything with that colour
  const getThematicFilterExpr = (color) => {
    return ['!', ['in', ['get', groupCol], ['literal', colorMap[color]]]];
  };

  /* 
    Updates the map's current filter for a given layer, the expressions are different based on whether the layer is a thematic layer
    or intranet layer
  */
  const updateMapFilter = (layer, layerType, hidden) => {
    if (!map.current) return;
    if (hidden.length === 0) {
      map.current.setFilter(layer, null);
    } else {
      let filterExpr = ['all'];
      for (const k of hidden) {
        if (layerType === 'thematic') {
          filterExpr.push(getThematicFilterExpr(k));
        } else if (layerType === 'intranet') {
          filterExpr.push(intranetLegendExprs[layer][k]);
        }
      }
      map.current.setFilter(layer, filterExpr);
    }
  }

  // Specific to trade areas, updates the maps layout to toggle their visibility
  const updateMapLayout = (hidden) => {
    tradeAreas.map(ta => {
      hidden.includes(ta) ? 
        map.current.setLayoutProperty(ta, 'visibility', 'none') : 
        map.current.setLayoutProperty(ta, 'visibility', 'visible')
    })
  }

  const hideTA = (layer) => {
    if (currHiddenTAs.includes(layer)) return;
    let hidden = [...currHiddenTAs];
    hidden.push(layer);
    updateMapLayout(hidden);
    setCurrHiddenTAs([...hidden])
  }

  const hideIntranet = (layer, store) => {
    if (currHiddenIntranet[layer].includes(store)) return;
    let hidden = {...currHiddenIntranet}
    hidden[layer].push(store);
    updateMapFilter(layer, 'intranet', hidden[layer]);
    setCurrHiddenIntranet({...hidden});
  }

  const hideThematic = (color) => {
    if (currHiddenThematic.includes(color)) return;
    let hidden = [...currHiddenThematic];
    hidden.push(color);
    updateMapFilter('boundary_tileset', 'thematic', hidden);
    setCurrHiddenThematic([...hidden]);
  };

  const unhideTA = (layer) => {
    let hidden = [...currHiddenTAs].filter(x => !(x == layer));
    updateMapLayout(hidden);
    setCurrHiddenTAs([...hidden]);
  }

  const unhideIntranet = (layer, store) => {
    let hidden = {...currHiddenIntranet};
    hidden[layer] = hidden[layer].filter(x => !(x == store));
    updateMapFilter(layer, 'intranet', hidden[layer]);
    setCurrHiddenIntranet({...hidden});
  }

  const unhideThematic = (color) => {
    let hidden = [...currHiddenThematic].filter(x => !(x == color));
    updateMapFilter('boundary_tileset', 'thematic', hidden);
    setCurrHiddenThematic([...hidden]);
  };

  const hideAllTAs = (e) => {
    e.stopPropagation();
    let hidden = [...tradeAreas];
    updateMapLayout(hidden);
    setCurrHiddenTAs([...hidden]);
  };

  const hideAllIntranet = (e, l) => {
    e.stopPropagation();
    let hiddenLayers = intranetLegend[l].map(x => x[0]);
    updateMapFilter(l, 'intranet', hiddenLayers);
    let hidden = {...currHiddenIntranet};
    hidden[l] = [...hiddenLayers];
    setCurrHiddenIntranet({...hidden});
  }

  const hideAllThematic = (e) => {
    e.stopPropagation();
    updateMapFilter('boundary_tileset', 'thematic', [...Object.keys(colorMap)]);
    setCurrHiddenThematic([...Object.keys(colorMap)]);
  }

  const unhideAllTAs = (e) => {
    e.stopPropagation();
    updateMapLayout([]);
    setCurrHiddenTAs([]);
  }

  const unhideAllIntranet = (e, l) => {
    e.stopPropagation();
    updateMapFilter(l, 'intranet', []);
    let hidden = {...currHiddenIntranet};
    hidden[l] = [];
    setCurrHiddenIntranet({...hidden});
  }

  const unhideAllThematic = (e) => {
    e.stopPropagation();
    updateMapFilter('boundary_tileset', 'thematic', []);
    setCurrHiddenThematic([]);
  }

  // Update intranet layer added in real time
  useEffect(() => {
    if (!intranetLayers) return;
    console.log(thematicData);
    let hidden = {...currHiddenIntranet};
    for (const l of intranetLayers) {
      if (!(l in hidden)) hidden[l] = [];
    }
    setCurrHiddenIntranet({...hidden});
  }, [intranetLayers])

  return (
    <>
      <Divider orientation='left'>
        Thematic
      </Divider>
      <Collapse>
        <Panel 
          header={thematicCol} 
          key='0'
          extra={
            <Button 
              type='text'
              shape='circle'
              size='small'
              icon={
                currHiddenThematic.length === Object.keys(colorMap).length ? <EyeInvisibleOutlined /> : <EyeOutlined />
              }
              onClick={
                currHiddenThematic.length === Object.keys(colorMap).length ? (e) => unhideAllThematic(e) : (e) => hideAllThematic(e)
              }
            />
          }
        >
          <List
            size='small'
            itemLayout='horizontal'
            dataSource={(thematicData ? Object.keys(thematicData) : []).map(k => {
              return { title: k, color: thematicData[k] }
            })}
            renderItem={item => (
              <List.Item 
                extra={
                  <Button 
                    type='text' 
                    shape='circle' 
                    size='small'
                    icon={
                      currHiddenThematic.includes(item.color) ? <EyeInvisibleOutlined /> : <EyeOutlined />
                    }
                    onClick={currHiddenThematic.includes(item.color) ? () => unhideThematic(item.color) : () => hideThematic(item.color)} 
                  />
                }
              >
                <List.Item.Meta
                avatar={<div style={{width: 24, height: 24, background: item.color}} />}
                title={<Text>{item.title}</Text>}
                />
              </List.Item>
            )}  
          />
        </Panel>
      </Collapse>
      {intranetLayers && intranetLayers.length > 0 && (<Divider orientation='left'>
        Intranet Layers
      </Divider>)}
      {intranetLayers && intranetLayers.length > 0 && (<Collapse>
        {intranetLayers.map((l, i) => (
          <Panel 
            header={nameMap[l]} 
            key={i}
            extra={
              <Button 
                type='text'
                shape='circle'
                size='small'
                icon={
                  currHiddenIntranet[l].length === Object.keys(intranetLegend[l]).length ? <EyeInvisibleOutlined /> : <EyeOutlined />
                }
                onClick={
                  currHiddenIntranet[l].length === Object.keys(intranetLegend[l]).length ? (e) => unhideAllIntranet(e, l) : (e) => hideAllIntranet(e, l)
                }
              />
            }
          >
            <List
              size='small'
              itemLayout='horizontal'
              dataSource={(l in intranetLegend ? intranetLegend[l] : []).map(d => {
                return { title: d[0], img: d[1], desc: d[2], layer: l }
              })}
              renderItem={item => (
                <List.Item 
                  extra={
                    currHiddenIntranet &&
                    (<Button 
                      type='text' 
                      shape='circle'
                      size='small' 
                      icon={
                        currHiddenIntranet[item.layer].includes(item.title) ? <EyeInvisibleOutlined /> : <EyeOutlined />
                      }
                      onClick={
                        currHiddenIntranet[item.layer].includes(item.title) ? 
                          () => unhideIntranet(item.layer, item.title) :
                          () => hideIntranet(item.layer, item.title)
                      } 
                    />)
                  }
                >
                  <List.Item.Meta
                    avatar={<Avatar src={item.img} shape='square' size={24} />}
                    title={<Text>{item.title}</Text>}
                  />
                </List.Item>
              )}
            />
          </Panel>
        ))}
      </Collapse>)}
      {tradeAreas.length > 0 && (<Divider orientation='left'>
        Trade Areas
      </Divider>)}
      {/* {
        tradeAreas.length > 0 ?
          (
            <Collapse>
              {tradeAreas.map(ta => (
                <Panel
                  header={ta}
                  key={ta}
                  extra={
                    <Button
                      size='small'

                    >

                    </Button>
                    currHiddenTAs[ta].length === Object.keys(taSectorSA1Map[ta]).length ? <EyeInvisibleOutlined /> : <EyeOutlined />
                  }
                >

                </Panel>
              ))}
            </Collapse>
          )
        :
          <></>
      } */}
      {tradeAreas.length > 0 && (<Collapse>
        <Panel 
            header='All trade areas' 
            key='0'
            extra={
              <Button 
                type='text'
                shape='circle'
                size='small'
                icon={
                  currHiddenTAs.length === tradeAreas.length ? <EyeInvisibleOutlined /> : <EyeOutlined />
                }
                onClick={
                  currHiddenTAs.length === tradeAreas.length ? (e) => unhideAllTAs(e) : (e) => hideAllTAs(e)
                }
              />
            }
          >
            <List
              size='small'
              itemLayout='horizontal'
              dataSource={tradeAreas.map(k => {
                return { title: k }
              })}
              renderItem={item => (
                <List.Item 
                  extra={
                    <Button 
                      type='text' 
                      shape='circle' 
                      size='small'
                      icon={
                        currHiddenTAs.includes(item.title) ? <EyeInvisibleOutlined /> : <EyeOutlined />
                      }
                      onClick={currHiddenTAs.includes(item.title) ? () => unhideTA(item.title) : () => hideTA(item.title)} 
                    />
                  }
                >
                  <List.Item.Meta
                  title={<Text>{item.title}</Text>}
                  />
                </List.Item>
              )}  
            />
          </Panel>
      </Collapse>)}
    </>
  );
}