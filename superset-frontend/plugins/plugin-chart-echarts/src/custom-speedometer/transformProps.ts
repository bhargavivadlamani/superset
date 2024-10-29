import { DEFAULT_FORM_DATA, SpeedometerTransformProps } from "./types";

type RGBA = {r: number, g: number, b: number, a: number };

const calculatePercentage = (min: number, max: number, value: any): number => {
    if(max === min) {
        return 0;
    }

    let percentage = ((value - min) / (max - min)) * 100;
    
    let final = Math.round(percentage)
    
    return final;
}

function rgbaToHex(color: RGBA | string): string {    
    if (typeof color === 'string' && /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(color)) {
        return color;
    }

    const {r, g, b, a }= color as RGBA

    const redHex = r.toString(16).padStart(2, '0');
    const greenHex = g.toString(16).padStart(2, '0');
    const blueHex = b.toString(16).padStart(2, '0');
    const alphaHex = (Math.round(a * 255)).toString(16).padStart(2, '0');

    return a === 1 ? `#${redHex}${greenHex}${blueHex}` : `#${redHex}${greenHex}${blueHex}${alphaHex}`;
}

function checkIfStartIsGreaterThanEnd(start: number, end: number) {
    // Use more descriptive parameter names
    if (start > end) {
        return { start: end, end: start }; // Return swapped values if start is greater than end
    }
    return { start, end }; // Otherwise return as is
}

export function checkNoOfverlapping(segment :  {color:string; end: number; start: number }[]) {
    const segmentEnd = segment.length;
    for (let i = 0; i <= 2; i++) {
        if(i === segmentEnd-1) {
            if(segment[i].end > 100) {  
            console.log("before: ",segment[i].end)
            segment[i].end = 100
            console.log("after: ",segment[i].end)
                break;
            } else {
                break;
            }
        }
        else if(segment[i].end > segment[i+1].start) {
            console.log(segment[i].end ," end is larger then ", segment[i+1].start," start")
            console.log("Before: ",segment[i], segment[i+1])
            segment[i].end = segment[i+1].start
            console.log("after: ",segment[i], segment[i+1])
        } else {
            console.log(segment[i].end ," end is smaller then ", segment[i+1].start," start")
            console.log(segment[i], segment[i+1])
        }   
    }    
    return segment
}


export function configureSegmentCharts(formData:any) {
   // Process colors with fallback to default
   const s1ChartColor = rgbaToHex(formData.s1ChartColor) ?? DEFAULT_FORM_DATA.s1ChartColor;
   // Destructure and rename for clarity
   const { start: s1Start, end: s1End } = checkIfStartIsGreaterThanEnd(
       formData.s1Start ?? DEFAULT_FORM_DATA.s1Start ?? 0,
       formData.s1End ?? DEFAULT_FORM_DATA.s1End ?? 0
   );

   const s2ChartColor = rgbaToHex(formData.s2ChartColor) ?? DEFAULT_FORM_DATA.s2ChartColor;
   const { start: s2Start, end: s2End } = checkIfStartIsGreaterThanEnd(
       formData.s2Start ?? DEFAULT_FORM_DATA.s2Start ?? 0,
       formData.s2End ?? DEFAULT_FORM_DATA.s2End ?? 0
   );

   const s3ChartColor = rgbaToHex(formData.s3ChartColor) ?? DEFAULT_FORM_DATA.s3ChartColor;
   const { start: s3Start, end: s3End } = checkIfStartIsGreaterThanEnd(
       formData.s3Start ?? DEFAULT_FORM_DATA.s3Start ?? 0,
       formData.s3End ?? DEFAULT_FORM_DATA.s3End ?? 0
   );

   const segmentarray = [
    {color: s1ChartColor, end: s1End,  start: s1Start, name: 's1'},
    {color: s2ChartColor, end: s2End,  start: s2Start, name: 's2'},
    {color: s3ChartColor, end: s3End,  start: s3Start, name: 's3'},
   ]

   const controlledSegments =  checkNoOfverlapping(segmentarray)        


    return {
        s1ChartColor,
        s1Start,
        s1End,
        s2ChartColor,
        s2Start,
        s2End,
        s3ChartColor,
        s3Start,
        s3End,
        controlledSegments,
    };
}

export default function transformProps(chartProps: SpeedometerTransformProps) {
    const { width, height, formData, queriesData } = chartProps;
    const { metric } = formData;

    // Ensure there's data
    const data = queriesData[0]?.data || [];
    const metricLabel = metric.label;

    const metricValue = data[0][metricLabel];

    // Get min and max from formData / fall back to defaults
    const minVal = formData.minValue ?? DEFAULT_FORM_DATA.minValue ?? 0;
    const maxVal = formData.maxValue ?? DEFAULT_FORM_DATA.maxValue ?? 100;

    // Calculate actual percentage based on dataset, mn and max values
    const progress = calculatePercentage(minVal, maxVal, metricValue);    

    // Segements 2nd arch
    const segmentAmount = formData.segmentAmt ?? DEFAULT_FORM_DATA.segmentAmt ?? 0;
    
    const segmentChartFormData = configureSegmentCharts(formData)

    return {
        width,
        height,
        minValue: minVal,
        maxValue: maxVal,
        progress: progress,
        segmentAmt: segmentAmount,
        s1ChartColor: segmentChartFormData.s1ChartColor,
        s1Start: segmentChartFormData.s1Start,
        s1End: segmentChartFormData.s1End,
        s2ChartColor: segmentChartFormData.s2ChartColor,
        s2Start: segmentChartFormData.s2Start,
        s2End: segmentChartFormData.s2End,
        s3ChartColor: segmentChartFormData.s3ChartColor,
        s3Start: segmentChartFormData.s3Start,
        s3End: segmentChartFormData.s3End,
        controlledSegments: segmentChartFormData.controlledSegments
    };
}
