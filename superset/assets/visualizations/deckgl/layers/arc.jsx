import { ArcLayer } from 'deck.gl';

import * as common from './common';
import sandboxedEval from '../../../javascripts/modules/sandbox';

export default function arcLayer(formData, payload, slice) {
  const fd = formData;
  const fc = fd.color_picker;
  let data = payload.data.arcs.map(d => ({
    ...d,
    color: [fc.r, fc.g, fc.b, 255 * fc.a],
  }));

  if (fd.js_datapoint_mutator) {
    // Applying user defined data mutator if defined
    const jsFnMutator = sandboxedEval(fd.js_datapoint_mutator);
    data = data.map(jsFnMutator);
  }

  return new ArcLayer({
    id: `path-layer-${fd.slice_id}`,
    data,
    strokeWidth: (fd.stroke_width) ? fd.stroke_width : 3,
    ...common.commonLayerProps(fd, slice),
  });
}
