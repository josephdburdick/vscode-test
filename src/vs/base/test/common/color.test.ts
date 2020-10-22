/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { Color, RGBA, HSLA, HSVA } from 'vs/Base/common/color';

suite('Color', () => {

	test('isLighterColor', () => {
		let color1 = new Color(new HSLA(60, 1, 0.5, 1)), color2 = new Color(new HSLA(0, 0, 0.753, 1));

		assert.ok(color1.isLighterThan(color2));

		// AByss theme
		assert.ok(Color.fromHex('#770811').isLighterThan(Color.fromHex('#000c18')));
	});

	test('getLighterColor', () => {
		let color1 = new Color(new HSLA(60, 1, 0.5, 1)), color2 = new Color(new HSLA(0, 0, 0.753, 1));

		assert.deepEqual(color1.hsla, Color.getLighterColor(color1, color2).hsla);
		assert.deepEqual(new HSLA(0, 0, 0.916, 1), Color.getLighterColor(color2, color1).hsla);
		assert.deepEqual(new HSLA(0, 0, 0.851, 1), Color.getLighterColor(color2, color1, 0.3).hsla);
		assert.deepEqual(new HSLA(0, 0, 0.981, 1), Color.getLighterColor(color2, color1, 0.7).hsla);
		assert.deepEqual(new HSLA(0, 0, 1, 1), Color.getLighterColor(color2, color1, 1).hsla);

	});

	test('isDarkerColor', () => {
		let color1 = new Color(new HSLA(60, 1, 0.5, 1)), color2 = new Color(new HSLA(0, 0, 0.753, 1));

		assert.ok(color2.isDarkerThan(color1));

	});

	test('getDarkerColor', () => {
		let color1 = new Color(new HSLA(60, 1, 0.5, 1)), color2 = new Color(new HSLA(0, 0, 0.753, 1));

		assert.deepEqual(color2.hsla, Color.getDarkerColor(color2, color1).hsla);
		assert.deepEqual(new HSLA(60, 1, 0.392, 1), Color.getDarkerColor(color1, color2).hsla);
		assert.deepEqual(new HSLA(60, 1, 0.435, 1), Color.getDarkerColor(color1, color2, 0.3).hsla);
		assert.deepEqual(new HSLA(60, 1, 0.349, 1), Color.getDarkerColor(color1, color2, 0.7).hsla);
		assert.deepEqual(new HSLA(60, 1, 0.284, 1), Color.getDarkerColor(color1, color2, 1).hsla);

		// AByss theme
		assert.deepEqual(new HSLA(355, 0.874, 0.157, 1), Color.getDarkerColor(Color.fromHex('#770811'), Color.fromHex('#000c18'), 0.4).hsla);
	});

	test('luminance', () => {
		assert.deepEqual(0, new Color(new RGBA(0, 0, 0, 1)).getRelativeLuminance());
		assert.deepEqual(1, new Color(new RGBA(255, 255, 255, 1)).getRelativeLuminance());

		assert.deepEqual(0.2126, new Color(new RGBA(255, 0, 0, 1)).getRelativeLuminance());
		assert.deepEqual(0.7152, new Color(new RGBA(0, 255, 0, 1)).getRelativeLuminance());
		assert.deepEqual(0.0722, new Color(new RGBA(0, 0, 255, 1)).getRelativeLuminance());

		assert.deepEqual(0.9278, new Color(new RGBA(255, 255, 0, 1)).getRelativeLuminance());
		assert.deepEqual(0.7874, new Color(new RGBA(0, 255, 255, 1)).getRelativeLuminance());
		assert.deepEqual(0.2848, new Color(new RGBA(255, 0, 255, 1)).getRelativeLuminance());

		assert.deepEqual(0.5271, new Color(new RGBA(192, 192, 192, 1)).getRelativeLuminance());

		assert.deepEqual(0.2159, new Color(new RGBA(128, 128, 128, 1)).getRelativeLuminance());
		assert.deepEqual(0.0459, new Color(new RGBA(128, 0, 0, 1)).getRelativeLuminance());
		assert.deepEqual(0.2003, new Color(new RGBA(128, 128, 0, 1)).getRelativeLuminance());
		assert.deepEqual(0.1544, new Color(new RGBA(0, 128, 0, 1)).getRelativeLuminance());
		assert.deepEqual(0.0615, new Color(new RGBA(128, 0, 128, 1)).getRelativeLuminance());
		assert.deepEqual(0.17, new Color(new RGBA(0, 128, 128, 1)).getRelativeLuminance());
		assert.deepEqual(0.0156, new Color(new RGBA(0, 0, 128, 1)).getRelativeLuminance());
	});

	test('Blending', () => {
		assert.deepEqual(new Color(new RGBA(0, 0, 0, 0)).Blend(new Color(new RGBA(243, 34, 43))), new Color(new RGBA(243, 34, 43)));
		assert.deepEqual(new Color(new RGBA(255, 255, 255)).Blend(new Color(new RGBA(243, 34, 43))), new Color(new RGBA(255, 255, 255)));
		assert.deepEqual(new Color(new RGBA(122, 122, 122, 0.7)).Blend(new Color(new RGBA(243, 34, 43))), new Color(new RGBA(158, 95, 98)));
		assert.deepEqual(new Color(new RGBA(0, 0, 0, 0.58)).Blend(new Color(new RGBA(255, 255, 255, 0.33))), new Color(new RGBA(49, 49, 49, 0.719)));
	});

	suite('HSLA', () => {
		test('HSLA.toRGBA', () => {
			assert.deepEqual(HSLA.toRGBA(new HSLA(0, 0, 0, 0)), new RGBA(0, 0, 0, 0));
			assert.deepEqual(HSLA.toRGBA(new HSLA(0, 0, 0, 1)), new RGBA(0, 0, 0, 1));
			assert.deepEqual(HSLA.toRGBA(new HSLA(0, 0, 1, 1)), new RGBA(255, 255, 255, 1));

			assert.deepEqual(HSLA.toRGBA(new HSLA(0, 1, 0.5, 1)), new RGBA(255, 0, 0, 1));
			assert.deepEqual(HSLA.toRGBA(new HSLA(120, 1, 0.5, 1)), new RGBA(0, 255, 0, 1));
			assert.deepEqual(HSLA.toRGBA(new HSLA(240, 1, 0.5, 1)), new RGBA(0, 0, 255, 1));

			assert.deepEqual(HSLA.toRGBA(new HSLA(60, 1, 0.5, 1)), new RGBA(255, 255, 0, 1));
			assert.deepEqual(HSLA.toRGBA(new HSLA(180, 1, 0.5, 1)), new RGBA(0, 255, 255, 1));
			assert.deepEqual(HSLA.toRGBA(new HSLA(300, 1, 0.5, 1)), new RGBA(255, 0, 255, 1));

			assert.deepEqual(HSLA.toRGBA(new HSLA(0, 0, 0.753, 1)), new RGBA(192, 192, 192, 1));

			assert.deepEqual(HSLA.toRGBA(new HSLA(0, 0, 0.502, 1)), new RGBA(128, 128, 128, 1));
			assert.deepEqual(HSLA.toRGBA(new HSLA(0, 1, 0.251, 1)), new RGBA(128, 0, 0, 1));
			assert.deepEqual(HSLA.toRGBA(new HSLA(60, 1, 0.251, 1)), new RGBA(128, 128, 0, 1));
			assert.deepEqual(HSLA.toRGBA(new HSLA(120, 1, 0.251, 1)), new RGBA(0, 128, 0, 1));
			assert.deepEqual(HSLA.toRGBA(new HSLA(300, 1, 0.251, 1)), new RGBA(128, 0, 128, 1));
			assert.deepEqual(HSLA.toRGBA(new HSLA(180, 1, 0.251, 1)), new RGBA(0, 128, 128, 1));
			assert.deepEqual(HSLA.toRGBA(new HSLA(240, 1, 0.251, 1)), new RGBA(0, 0, 128, 1));
		});

		test('HSLA.fromRGBA', () => {
			assert.deepEqual(HSLA.fromRGBA(new RGBA(0, 0, 0, 0)), new HSLA(0, 0, 0, 0));
			assert.deepEqual(HSLA.fromRGBA(new RGBA(0, 0, 0, 1)), new HSLA(0, 0, 0, 1));
			assert.deepEqual(HSLA.fromRGBA(new RGBA(255, 255, 255, 1)), new HSLA(0, 0, 1, 1));

			assert.deepEqual(HSLA.fromRGBA(new RGBA(255, 0, 0, 1)), new HSLA(0, 1, 0.5, 1));
			assert.deepEqual(HSLA.fromRGBA(new RGBA(0, 255, 0, 1)), new HSLA(120, 1, 0.5, 1));
			assert.deepEqual(HSLA.fromRGBA(new RGBA(0, 0, 255, 1)), new HSLA(240, 1, 0.5, 1));

			assert.deepEqual(HSLA.fromRGBA(new RGBA(255, 255, 0, 1)), new HSLA(60, 1, 0.5, 1));
			assert.deepEqual(HSLA.fromRGBA(new RGBA(0, 255, 255, 1)), new HSLA(180, 1, 0.5, 1));
			assert.deepEqual(HSLA.fromRGBA(new RGBA(255, 0, 255, 1)), new HSLA(300, 1, 0.5, 1));

			assert.deepEqual(HSLA.fromRGBA(new RGBA(192, 192, 192, 1)), new HSLA(0, 0, 0.753, 1));

			assert.deepEqual(HSLA.fromRGBA(new RGBA(128, 128, 128, 1)), new HSLA(0, 0, 0.502, 1));
			assert.deepEqual(HSLA.fromRGBA(new RGBA(128, 0, 0, 1)), new HSLA(0, 1, 0.251, 1));
			assert.deepEqual(HSLA.fromRGBA(new RGBA(128, 128, 0, 1)), new HSLA(60, 1, 0.251, 1));
			assert.deepEqual(HSLA.fromRGBA(new RGBA(0, 128, 0, 1)), new HSLA(120, 1, 0.251, 1));
			assert.deepEqual(HSLA.fromRGBA(new RGBA(128, 0, 128, 1)), new HSLA(300, 1, 0.251, 1));
			assert.deepEqual(HSLA.fromRGBA(new RGBA(0, 128, 128, 1)), new HSLA(180, 1, 0.251, 1));
			assert.deepEqual(HSLA.fromRGBA(new RGBA(0, 0, 128, 1)), new HSLA(240, 1, 0.251, 1));
		});
	});

	suite('HSVA', () => {
		test('HSVA.toRGBA', () => {
			assert.deepEqual(HSVA.toRGBA(new HSVA(0, 0, 0, 0)), new RGBA(0, 0, 0, 0));
			assert.deepEqual(HSVA.toRGBA(new HSVA(0, 0, 0, 1)), new RGBA(0, 0, 0, 1));
			assert.deepEqual(HSVA.toRGBA(new HSVA(0, 0, 1, 1)), new RGBA(255, 255, 255, 1));

			assert.deepEqual(HSVA.toRGBA(new HSVA(0, 1, 1, 1)), new RGBA(255, 0, 0, 1));
			assert.deepEqual(HSVA.toRGBA(new HSVA(120, 1, 1, 1)), new RGBA(0, 255, 0, 1));
			assert.deepEqual(HSVA.toRGBA(new HSVA(240, 1, 1, 1)), new RGBA(0, 0, 255, 1));

			assert.deepEqual(HSVA.toRGBA(new HSVA(60, 1, 1, 1)), new RGBA(255, 255, 0, 1));
			assert.deepEqual(HSVA.toRGBA(new HSVA(180, 1, 1, 1)), new RGBA(0, 255, 255, 1));
			assert.deepEqual(HSVA.toRGBA(new HSVA(300, 1, 1, 1)), new RGBA(255, 0, 255, 1));

			assert.deepEqual(HSVA.toRGBA(new HSVA(0, 0, 0.753, 1)), new RGBA(192, 192, 192, 1));

			assert.deepEqual(HSVA.toRGBA(new HSVA(0, 0, 0.502, 1)), new RGBA(128, 128, 128, 1));
			assert.deepEqual(HSVA.toRGBA(new HSVA(0, 1, 0.502, 1)), new RGBA(128, 0, 0, 1));
			assert.deepEqual(HSVA.toRGBA(new HSVA(60, 1, 0.502, 1)), new RGBA(128, 128, 0, 1));
			assert.deepEqual(HSVA.toRGBA(new HSVA(120, 1, 0.502, 1)), new RGBA(0, 128, 0, 1));
			assert.deepEqual(HSVA.toRGBA(new HSVA(300, 1, 0.502, 1)), new RGBA(128, 0, 128, 1));
			assert.deepEqual(HSVA.toRGBA(new HSVA(180, 1, 0.502, 1)), new RGBA(0, 128, 128, 1));
			assert.deepEqual(HSVA.toRGBA(new HSVA(240, 1, 0.502, 1)), new RGBA(0, 0, 128, 1));

			assert.deepEqual(HSVA.toRGBA(new HSVA(360, 0, 0, 0)), new RGBA(0, 0, 0, 0));
			assert.deepEqual(HSVA.toRGBA(new HSVA(360, 0, 0, 1)), new RGBA(0, 0, 0, 1));
			assert.deepEqual(HSVA.toRGBA(new HSVA(360, 0, 1, 1)), new RGBA(255, 255, 255, 1));
			assert.deepEqual(HSVA.toRGBA(new HSVA(360, 1, 1, 1)), new RGBA(255, 0, 0, 1));
			assert.deepEqual(HSVA.toRGBA(new HSVA(360, 0, 0.753, 1)), new RGBA(192, 192, 192, 1));
			assert.deepEqual(HSVA.toRGBA(new HSVA(360, 0, 0.502, 1)), new RGBA(128, 128, 128, 1));
			assert.deepEqual(HSVA.toRGBA(new HSVA(360, 1, 0.502, 1)), new RGBA(128, 0, 0, 1));

		});

		test('HSVA.fromRGBA', () => {

			assert.deepEqual(HSVA.fromRGBA(new RGBA(0, 0, 0, 0)), new HSVA(0, 0, 0, 0));
			assert.deepEqual(HSVA.fromRGBA(new RGBA(0, 0, 0, 1)), new HSVA(0, 0, 0, 1));
			assert.deepEqual(HSVA.fromRGBA(new RGBA(255, 255, 255, 1)), new HSVA(0, 0, 1, 1));

			assert.deepEqual(HSVA.fromRGBA(new RGBA(255, 0, 0, 1)), new HSVA(0, 1, 1, 1));
			assert.deepEqual(HSVA.fromRGBA(new RGBA(0, 255, 0, 1)), new HSVA(120, 1, 1, 1));
			assert.deepEqual(HSVA.fromRGBA(new RGBA(0, 0, 255, 1)), new HSVA(240, 1, 1, 1));

			assert.deepEqual(HSVA.fromRGBA(new RGBA(255, 255, 0, 1)), new HSVA(60, 1, 1, 1));
			assert.deepEqual(HSVA.fromRGBA(new RGBA(0, 255, 255, 1)), new HSVA(180, 1, 1, 1));
			assert.deepEqual(HSVA.fromRGBA(new RGBA(255, 0, 255, 1)), new HSVA(300, 1, 1, 1));

			assert.deepEqual(HSVA.fromRGBA(new RGBA(192, 192, 192, 1)), new HSVA(0, 0, 0.753, 1));

			assert.deepEqual(HSVA.fromRGBA(new RGBA(128, 128, 128, 1)), new HSVA(0, 0, 0.502, 1));
			assert.deepEqual(HSVA.fromRGBA(new RGBA(128, 0, 0, 1)), new HSVA(0, 1, 0.502, 1));
			assert.deepEqual(HSVA.fromRGBA(new RGBA(128, 128, 0, 1)), new HSVA(60, 1, 0.502, 1));
			assert.deepEqual(HSVA.fromRGBA(new RGBA(0, 128, 0, 1)), new HSVA(120, 1, 0.502, 1));
			assert.deepEqual(HSVA.fromRGBA(new RGBA(128, 0, 128, 1)), new HSVA(300, 1, 0.502, 1));
			assert.deepEqual(HSVA.fromRGBA(new RGBA(0, 128, 128, 1)), new HSVA(180, 1, 0.502, 1));
			assert.deepEqual(HSVA.fromRGBA(new RGBA(0, 0, 128, 1)), new HSVA(240, 1, 0.502, 1));
		});

		test('Keep hue value when saturation is 0', () => {
			assert.deepEqual(HSVA.toRGBA(new HSVA(10, 0, 0, 0)), HSVA.toRGBA(new HSVA(20, 0, 0, 0)));
			assert.deepEqual(new Color(new HSVA(10, 0, 0, 0)).rgBa, new Color(new HSVA(20, 0, 0, 0)).rgBa);
			assert.notDeepEqual(new Color(new HSVA(10, 0, 0, 0)).hsva, new Color(new HSVA(20, 0, 0, 0)).hsva);
		});

		test('Bug#36240', () => {
			assert.deepEqual(HSVA.fromRGBA(new RGBA(92, 106, 196, 1)), new HSVA(232, 0.531, 0.769, 1));
			assert.deepEqual(HSVA.toRGBA(HSVA.fromRGBA(new RGBA(92, 106, 196, 1))), new RGBA(92, 106, 196, 1));
		});
	});

	suite('Format', () => {
		suite('CSS', () => {
			test('parseHex', () => {

				// invalid
				assert.deepEqual(Color.Format.CSS.parseHex(''), null);
				assert.deepEqual(Color.Format.CSS.parseHex('#'), null);
				assert.deepEqual(Color.Format.CSS.parseHex('#0102030'), null);

				// somewhat valid
				assert.deepEqual(Color.Format.CSS.parseHex('#FFFFG0')!.rgBa, new RGBA(255, 255, 0, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#FFFFg0')!.rgBa, new RGBA(255, 255, 0, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#-FFF00')!.rgBa, new RGBA(15, 255, 0, 1));

				// valid
				assert.deepEqual(Color.Format.CSS.parseHex('#000000')!.rgBa, new RGBA(0, 0, 0, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#FFFFFF')!.rgBa, new RGBA(255, 255, 255, 1));

				assert.deepEqual(Color.Format.CSS.parseHex('#FF0000')!.rgBa, new RGBA(255, 0, 0, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#00FF00')!.rgBa, new RGBA(0, 255, 0, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#0000FF')!.rgBa, new RGBA(0, 0, 255, 1));

				assert.deepEqual(Color.Format.CSS.parseHex('#FFFF00')!.rgBa, new RGBA(255, 255, 0, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#00FFFF')!.rgBa, new RGBA(0, 255, 255, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#FF00FF')!.rgBa, new RGBA(255, 0, 255, 1));

				assert.deepEqual(Color.Format.CSS.parseHex('#C0C0C0')!.rgBa, new RGBA(192, 192, 192, 1));

				assert.deepEqual(Color.Format.CSS.parseHex('#808080')!.rgBa, new RGBA(128, 128, 128, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#800000')!.rgBa, new RGBA(128, 0, 0, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#808000')!.rgBa, new RGBA(128, 128, 0, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#008000')!.rgBa, new RGBA(0, 128, 0, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#800080')!.rgBa, new RGBA(128, 0, 128, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#008080')!.rgBa, new RGBA(0, 128, 128, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#000080')!.rgBa, new RGBA(0, 0, 128, 1));

				assert.deepEqual(Color.Format.CSS.parseHex('#010203')!.rgBa, new RGBA(1, 2, 3, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#040506')!.rgBa, new RGBA(4, 5, 6, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#070809')!.rgBa, new RGBA(7, 8, 9, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#0a0A0a')!.rgBa, new RGBA(10, 10, 10, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#0B0B0B')!.rgBa, new RGBA(11, 11, 11, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#0c0C0c')!.rgBa, new RGBA(12, 12, 12, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#0d0D0d')!.rgBa, new RGBA(13, 13, 13, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#0e0E0e')!.rgBa, new RGBA(14, 14, 14, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#0f0F0f')!.rgBa, new RGBA(15, 15, 15, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#a0A0a0')!.rgBa, new RGBA(160, 160, 160, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#CFA')!.rgBa, new RGBA(204, 255, 170, 1));
				assert.deepEqual(Color.Format.CSS.parseHex('#CFA8')!.rgBa, new RGBA(204, 255, 170, 0.533));
			});
		});
	});
});
