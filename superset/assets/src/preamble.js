import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only';
import { configure } from '@superset-ui/translation';
import setupColors from './setup/setupColors';

// Configure translation
if (typeof window !== 'undefined') {
  const root = document.getElementById('app');
  const bootstrapData = root ? JSON.parse(root.getAttribute('data-bootstrap')) : {};
  if (bootstrapData.common && bootstrapData.common.language_pack) {
    const languagePack = bootstrapData.common.language_pack;
    delete bootstrapData.common.locale;
    delete bootstrapData.common.language_pack;
    configure({ languagePack });
  } else {
    configure();
  }
} else {
  configure();
}

// Initialize color palettes
setupColors();
