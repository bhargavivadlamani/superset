import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { DEFAULT_FORM_DATA, SpeedometerChartProps, SpeedometerChartFormData } from './types';

const calculatePercentage = (progressVal: number): number => {
  progressVal = parseFloat(progressVal.toFixed(2));

  // Ensure percentage does notfall below 0%
  if (progressVal < 0) {
    progressVal = 0;
  }


  return progressVal;
}

const SpeedoChart: React.FC<SpeedometerChartFormData> = (props: SpeedometerChartFormData) => {
  const chartRef = useRef<HTMLDivElement>(null);

  const { minValue, maxValue, progress,segmentAmt, s1ChartColor, 
    s1Start, 
    s1End, 
    s2ChartColor, 
    s2Start, 
    s2End, 
    s3ChartColor, 
    s3Start, 
    s3End,
    controlledSegments,
  } = props;
  // Assuming props includes segmentChartFormData

  var calculatedData = calculatePercentage(progress);
  var calculatedData = 100

  // Hardcoded values for 2nd chart
  var outerRadiusSecondChart = 114;
  var innerRadiusSecondChart = 122;
  const segments2 = controlledSegments
  
  useEffect(() => {
    const chart = echarts.init(chartRef.current!);

    const options = {
      title: {
        text: `Progress: ${calculatedData}%\n\nNumber Being Given: ${progress} `,
        left: 100,
        top: 270,
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
        },
      },
      xAxis: {
        type: 'value',
        minValue: 0,
        maxValue: 100,
        show: false,
      },
      yAxis: {
        type: 'category',
        data: [''],
        show: false,
      },
      /*tooltip: {        
        shoz: true,
        trigger: 'item',
        triggerOn: 'mousemove',
        axisPointer: {
          type: 'line',
          label: {
            show: true,
            parals: 10,
            backgroundColor: '#333'
          }
        }
      },*/
      graphic: [
        {
          type: 'text',
          left: 400,
          top: 150,
          style: {
            text: `minValue: ${minValue}`,
            fontSize: 16,
            fontWeight: 'bold',
          }
        },
        {
          type: 'text',
          left: 400,
          top: 170,
          style: {
            text: `maxValue: ${maxValue}`,
            fontSize: 16,
            fontWeight: 'bold',
          }
        },
        {
          type: 'text',
          left: 400,
          top: 190,
          style: {
            text: `Segment Amt: ${segmentAmt}`,
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        // Loop here             
        ...segments2.flatMap((segment, index) => [
          {
            type: 'text',
            left: 400,
            top: 210 + index * 60,
            style: {
              text: `S${index+1}Start: ${segment.start}`,
              fontSize: 16,
              fontWeight: 'bold',
            },
          },
          {
            type: 'text',
            left: 400,
            top: 230 + index * 60,
            style: {
              text: `S${index+1}End: ${segment.end}`,
              fontSize: 16,
              fontWeight: 'bold',
            },
          },
          {
            type: 'text',
            left: 400,
            top: 250 + index * 60,
            style: {
              text: `S${index+1}Colorcode: ${segment.color}`,
              fontSize: 16,
              fontWeight: 'bold',
            },
          }
        ])            
      ],
      series: [{
        // Data Showcase Chart
        type: 'custom',
        renderItem: (params: any, api: any) => {
          const startAngle = (170 * Math.PI) / 180; // Convert 170° to radians
          const hardCap = Math.min(calculatedData, 100); // Ensure hardCap does not exceed 100
          const endAngle = startAngle + ((200 / 360) * 2 * Math.PI * (hardCap / 100)); // Total span of 200° for hardCap = 100         
          
          const outerRadius = 110;
          const innerRadius = 80;
          
          // Get center coordinates
          const [cx, cy] = api.coord([0, 0]);
        
          return {
            type: 'path',
            shape: {
              pathData: `
                M ${cx + innerRadius * Math.cos(startAngle)} ${cy + innerRadius * Math.sin(startAngle)}
                A ${innerRadius} ${innerRadius} 0 1 1
                  ${cx + innerRadius * Math.cos(endAngle)} ${cy + innerRadius * Math.sin(endAngle)}
                L ${cx + outerRadius * Math.cos(endAngle)} ${cy + outerRadius * Math.sin(endAngle)}
                A ${outerRadius} ${outerRadius} 0 1 0
                  ${cx + outerRadius * Math.cos(startAngle)} ${cy + outerRadius * Math.sin(startAngle)}
                Z                
              `,
            },
            style: {
              fill: '#4caf50', // Progress color (green)
              stroke: '#000', // Outline color
              lineWidth: 2, 
            },
          };
        },
        data: [{}], // Single data item to trigger renderItem
      },
      {
        // Segments Chart
        type: 'custom',
        renderItem: (params: any, api:any) => {

          const cx = api.coord([0,0])[1];  // Center x
          const cy = api.coord([0,0])[1];  // Center y
          
          const segmentArcs = segments2.map((segment) => {
            const startAngle = -Math.PI + (Math.PI * (segment.start / 100)); // Convert start percentage to radians
            const endAngle = -Math.PI + (Math.PI * (segment.end / 100)); // Convert end percentage to radians


            return {
              type: 'path',
              shape: {
                pathData:`
                  M ${cx + innerRadiusSecondChart * Math.cos(startAngle)} ${cy + innerRadiusSecondChart * Math.sin(startAngle)}
                  A ${innerRadiusSecondChart} ${innerRadiusSecondChart} 0 0 1
                    ${cx + innerRadiusSecondChart * Math.cos(endAngle)} ${cy + innerRadiusSecondChart * Math.sin(endAngle)}
                  L ${cx + outerRadiusSecondChart * Math.cos(endAngle)} ${cy + outerRadiusSecondChart * Math.sin(endAngle)}
                  A ${outerRadiusSecondChart} ${outerRadiusSecondChart} 0 0 0
                    ${cx + outerRadiusSecondChart * Math.cos(startAngle)} ${cy + outerRadiusSecondChart * Math.sin(startAngle)}
                  Z
                  `,
                },
                style: {
                  fill: segment.color,
                  stroke: '#000',
                  lineWidth: 2,
                },
            };
          });
          return {
            type: 'group',
            children: segmentArcs, // Add all arcs as children of the group
          };
        },
        data: [{}]
      }],      
    };

    chart.setOption(options);


    return () => {
      chart.dispose();
    };
  }, [calculatedData]);

  return <div ref={chartRef} style={{ width: '100%', height: '520px' }} />;
};

export default SpeedoChart;
