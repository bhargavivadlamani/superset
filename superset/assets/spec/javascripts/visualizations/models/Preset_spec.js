import { describe, it } from 'mocha';
import { expect } from 'chai';
import Preset from '../../../../src/visualizations/core/models/Preset';
import Plugin from '../../../../src/visualizations/core/models/Plugin';

describe('Preset', () => {
  it('exists', () => {
    expect(Preset).to.not.equal(undefined);
  });

  describe('new Preset()', () => {
    it('creates new preset', () => {
      const preset = new Preset();
      expect(preset).to.be.instanceOf(Preset);
    });
  });

  describe('.install()', () => {
    it('install all listed presets then plugins', () => {
      const values = [];
      class Plugin1 extends Plugin {
        install() {
          values.push(1);
        }
      }
      class Plugin2 extends Plugin {
        install() {
          values.push(2);
        }
      }
      class Plugin3 extends Plugin {
        install() {
          values.push(3);
        }
      }

      const preset1 = new Preset({
        plugins: [new Plugin1()],
      });
      const preset2 = new Preset({
        plugins: [new Plugin2()],
      });
      const preset3 = new Preset({
        presets: [preset1, preset2],
        plugins: [new Plugin3()],
      });
      preset3.install();
      expect(values).to.deep.equal([1, 2, 3]);
    });

    it('calls plugin.install() if the plugin entry is a Plugin or execute plugin() otherwise', () => {
      const values = [];
      class Plugin1 extends Plugin {
        install() {
          values.push(1);
        }
      }
      class Plugin2 extends Plugin {
        install(key) {
          values.push(key);
        }
      }

      const preset = new Preset({
        plugins: [
          new Plugin1(),
          () => new Plugin2().install('abc'),
        ],
      });
      preset.install();
      expect(values).to.deep.equal([1, 'abc']);
    });

    it('returns itself', () => {
      const preset = new Preset();
      expect(preset.install()).to.equal(preset);
    });
  });
});
