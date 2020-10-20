/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { Color, RGBA, HSLA, HSVA } from 'vs/bAse/common/color';

suite('Color', () => {

	test('isLighterColor', () => {
		let color1 = new Color(new HSLA(60, 1, 0.5, 1)), color2 = new Color(new HSLA(0, 0, 0.753, 1));

		Assert.ok(color1.isLighterThAn(color2));

		// Abyss theme
		Assert.ok(Color.fromHex('#770811').isLighterThAn(Color.fromHex('#000c18')));
	});

	test('getLighterColor', () => {
		let color1 = new Color(new HSLA(60, 1, 0.5, 1)), color2 = new Color(new HSLA(0, 0, 0.753, 1));

		Assert.deepEquAl(color1.hslA, Color.getLighterColor(color1, color2).hslA);
		Assert.deepEquAl(new HSLA(0, 0, 0.916, 1), Color.getLighterColor(color2, color1).hslA);
		Assert.deepEquAl(new HSLA(0, 0, 0.851, 1), Color.getLighterColor(color2, color1, 0.3).hslA);
		Assert.deepEquAl(new HSLA(0, 0, 0.981, 1), Color.getLighterColor(color2, color1, 0.7).hslA);
		Assert.deepEquAl(new HSLA(0, 0, 1, 1), Color.getLighterColor(color2, color1, 1).hslA);

	});

	test('isDArkerColor', () => {
		let color1 = new Color(new HSLA(60, 1, 0.5, 1)), color2 = new Color(new HSLA(0, 0, 0.753, 1));

		Assert.ok(color2.isDArkerThAn(color1));

	});

	test('getDArkerColor', () => {
		let color1 = new Color(new HSLA(60, 1, 0.5, 1)), color2 = new Color(new HSLA(0, 0, 0.753, 1));

		Assert.deepEquAl(color2.hslA, Color.getDArkerColor(color2, color1).hslA);
		Assert.deepEquAl(new HSLA(60, 1, 0.392, 1), Color.getDArkerColor(color1, color2).hslA);
		Assert.deepEquAl(new HSLA(60, 1, 0.435, 1), Color.getDArkerColor(color1, color2, 0.3).hslA);
		Assert.deepEquAl(new HSLA(60, 1, 0.349, 1), Color.getDArkerColor(color1, color2, 0.7).hslA);
		Assert.deepEquAl(new HSLA(60, 1, 0.284, 1), Color.getDArkerColor(color1, color2, 1).hslA);

		// Abyss theme
		Assert.deepEquAl(new HSLA(355, 0.874, 0.157, 1), Color.getDArkerColor(Color.fromHex('#770811'), Color.fromHex('#000c18'), 0.4).hslA);
	});

	test('luminAnce', () => {
		Assert.deepEquAl(0, new Color(new RGBA(0, 0, 0, 1)).getRelAtiveLuminAnce());
		Assert.deepEquAl(1, new Color(new RGBA(255, 255, 255, 1)).getRelAtiveLuminAnce());

		Assert.deepEquAl(0.2126, new Color(new RGBA(255, 0, 0, 1)).getRelAtiveLuminAnce());
		Assert.deepEquAl(0.7152, new Color(new RGBA(0, 255, 0, 1)).getRelAtiveLuminAnce());
		Assert.deepEquAl(0.0722, new Color(new RGBA(0, 0, 255, 1)).getRelAtiveLuminAnce());

		Assert.deepEquAl(0.9278, new Color(new RGBA(255, 255, 0, 1)).getRelAtiveLuminAnce());
		Assert.deepEquAl(0.7874, new Color(new RGBA(0, 255, 255, 1)).getRelAtiveLuminAnce());
		Assert.deepEquAl(0.2848, new Color(new RGBA(255, 0, 255, 1)).getRelAtiveLuminAnce());

		Assert.deepEquAl(0.5271, new Color(new RGBA(192, 192, 192, 1)).getRelAtiveLuminAnce());

		Assert.deepEquAl(0.2159, new Color(new RGBA(128, 128, 128, 1)).getRelAtiveLuminAnce());
		Assert.deepEquAl(0.0459, new Color(new RGBA(128, 0, 0, 1)).getRelAtiveLuminAnce());
		Assert.deepEquAl(0.2003, new Color(new RGBA(128, 128, 0, 1)).getRelAtiveLuminAnce());
		Assert.deepEquAl(0.1544, new Color(new RGBA(0, 128, 0, 1)).getRelAtiveLuminAnce());
		Assert.deepEquAl(0.0615, new Color(new RGBA(128, 0, 128, 1)).getRelAtiveLuminAnce());
		Assert.deepEquAl(0.17, new Color(new RGBA(0, 128, 128, 1)).getRelAtiveLuminAnce());
		Assert.deepEquAl(0.0156, new Color(new RGBA(0, 0, 128, 1)).getRelAtiveLuminAnce());
	});

	test('blending', () => {
		Assert.deepEquAl(new Color(new RGBA(0, 0, 0, 0)).blend(new Color(new RGBA(243, 34, 43))), new Color(new RGBA(243, 34, 43)));
		Assert.deepEquAl(new Color(new RGBA(255, 255, 255)).blend(new Color(new RGBA(243, 34, 43))), new Color(new RGBA(255, 255, 255)));
		Assert.deepEquAl(new Color(new RGBA(122, 122, 122, 0.7)).blend(new Color(new RGBA(243, 34, 43))), new Color(new RGBA(158, 95, 98)));
		Assert.deepEquAl(new Color(new RGBA(0, 0, 0, 0.58)).blend(new Color(new RGBA(255, 255, 255, 0.33))), new Color(new RGBA(49, 49, 49, 0.719)));
	});

	suite('HSLA', () => {
		test('HSLA.toRGBA', () => {
			Assert.deepEquAl(HSLA.toRGBA(new HSLA(0, 0, 0, 0)), new RGBA(0, 0, 0, 0));
			Assert.deepEquAl(HSLA.toRGBA(new HSLA(0, 0, 0, 1)), new RGBA(0, 0, 0, 1));
			Assert.deepEquAl(HSLA.toRGBA(new HSLA(0, 0, 1, 1)), new RGBA(255, 255, 255, 1));

			Assert.deepEquAl(HSLA.toRGBA(new HSLA(0, 1, 0.5, 1)), new RGBA(255, 0, 0, 1));
			Assert.deepEquAl(HSLA.toRGBA(new HSLA(120, 1, 0.5, 1)), new RGBA(0, 255, 0, 1));
			Assert.deepEquAl(HSLA.toRGBA(new HSLA(240, 1, 0.5, 1)), new RGBA(0, 0, 255, 1));

			Assert.deepEquAl(HSLA.toRGBA(new HSLA(60, 1, 0.5, 1)), new RGBA(255, 255, 0, 1));
			Assert.deepEquAl(HSLA.toRGBA(new HSLA(180, 1, 0.5, 1)), new RGBA(0, 255, 255, 1));
			Assert.deepEquAl(HSLA.toRGBA(new HSLA(300, 1, 0.5, 1)), new RGBA(255, 0, 255, 1));

			Assert.deepEquAl(HSLA.toRGBA(new HSLA(0, 0, 0.753, 1)), new RGBA(192, 192, 192, 1));

			Assert.deepEquAl(HSLA.toRGBA(new HSLA(0, 0, 0.502, 1)), new RGBA(128, 128, 128, 1));
			Assert.deepEquAl(HSLA.toRGBA(new HSLA(0, 1, 0.251, 1)), new RGBA(128, 0, 0, 1));
			Assert.deepEquAl(HSLA.toRGBA(new HSLA(60, 1, 0.251, 1)), new RGBA(128, 128, 0, 1));
			Assert.deepEquAl(HSLA.toRGBA(new HSLA(120, 1, 0.251, 1)), new RGBA(0, 128, 0, 1));
			Assert.deepEquAl(HSLA.toRGBA(new HSLA(300, 1, 0.251, 1)), new RGBA(128, 0, 128, 1));
			Assert.deepEquAl(HSLA.toRGBA(new HSLA(180, 1, 0.251, 1)), new RGBA(0, 128, 128, 1));
			Assert.deepEquAl(HSLA.toRGBA(new HSLA(240, 1, 0.251, 1)), new RGBA(0, 0, 128, 1));
		});

		test('HSLA.fromRGBA', () => {
			Assert.deepEquAl(HSLA.fromRGBA(new RGBA(0, 0, 0, 0)), new HSLA(0, 0, 0, 0));
			Assert.deepEquAl(HSLA.fromRGBA(new RGBA(0, 0, 0, 1)), new HSLA(0, 0, 0, 1));
			Assert.deepEquAl(HSLA.fromRGBA(new RGBA(255, 255, 255, 1)), new HSLA(0, 0, 1, 1));

			Assert.deepEquAl(HSLA.fromRGBA(new RGBA(255, 0, 0, 1)), new HSLA(0, 1, 0.5, 1));
			Assert.deepEquAl(HSLA.fromRGBA(new RGBA(0, 255, 0, 1)), new HSLA(120, 1, 0.5, 1));
			Assert.deepEquAl(HSLA.fromRGBA(new RGBA(0, 0, 255, 1)), new HSLA(240, 1, 0.5, 1));

			Assert.deepEquAl(HSLA.fromRGBA(new RGBA(255, 255, 0, 1)), new HSLA(60, 1, 0.5, 1));
			Assert.deepEquAl(HSLA.fromRGBA(new RGBA(0, 255, 255, 1)), new HSLA(180, 1, 0.5, 1));
			Assert.deepEquAl(HSLA.fromRGBA(new RGBA(255, 0, 255, 1)), new HSLA(300, 1, 0.5, 1));

			Assert.deepEquAl(HSLA.fromRGBA(new RGBA(192, 192, 192, 1)), new HSLA(0, 0, 0.753, 1));

			Assert.deepEquAl(HSLA.fromRGBA(new RGBA(128, 128, 128, 1)), new HSLA(0, 0, 0.502, 1));
			Assert.deepEquAl(HSLA.fromRGBA(new RGBA(128, 0, 0, 1)), new HSLA(0, 1, 0.251, 1));
			Assert.deepEquAl(HSLA.fromRGBA(new RGBA(128, 128, 0, 1)), new HSLA(60, 1, 0.251, 1));
			Assert.deepEquAl(HSLA.fromRGBA(new RGBA(0, 128, 0, 1)), new HSLA(120, 1, 0.251, 1));
			Assert.deepEquAl(HSLA.fromRGBA(new RGBA(128, 0, 128, 1)), new HSLA(300, 1, 0.251, 1));
			Assert.deepEquAl(HSLA.fromRGBA(new RGBA(0, 128, 128, 1)), new HSLA(180, 1, 0.251, 1));
			Assert.deepEquAl(HSLA.fromRGBA(new RGBA(0, 0, 128, 1)), new HSLA(240, 1, 0.251, 1));
		});
	});

	suite('HSVA', () => {
		test('HSVA.toRGBA', () => {
			Assert.deepEquAl(HSVA.toRGBA(new HSVA(0, 0, 0, 0)), new RGBA(0, 0, 0, 0));
			Assert.deepEquAl(HSVA.toRGBA(new HSVA(0, 0, 0, 1)), new RGBA(0, 0, 0, 1));
			Assert.deepEquAl(HSVA.toRGBA(new HSVA(0, 0, 1, 1)), new RGBA(255, 255, 255, 1));

			Assert.deepEquAl(HSVA.toRGBA(new HSVA(0, 1, 1, 1)), new RGBA(255, 0, 0, 1));
			Assert.deepEquAl(HSVA.toRGBA(new HSVA(120, 1, 1, 1)), new RGBA(0, 255, 0, 1));
			Assert.deepEquAl(HSVA.toRGBA(new HSVA(240, 1, 1, 1)), new RGBA(0, 0, 255, 1));

			Assert.deepEquAl(HSVA.toRGBA(new HSVA(60, 1, 1, 1)), new RGBA(255, 255, 0, 1));
			Assert.deepEquAl(HSVA.toRGBA(new HSVA(180, 1, 1, 1)), new RGBA(0, 255, 255, 1));
			Assert.deepEquAl(HSVA.toRGBA(new HSVA(300, 1, 1, 1)), new RGBA(255, 0, 255, 1));

			Assert.deepEquAl(HSVA.toRGBA(new HSVA(0, 0, 0.753, 1)), new RGBA(192, 192, 192, 1));

			Assert.deepEquAl(HSVA.toRGBA(new HSVA(0, 0, 0.502, 1)), new RGBA(128, 128, 128, 1));
			Assert.deepEquAl(HSVA.toRGBA(new HSVA(0, 1, 0.502, 1)), new RGBA(128, 0, 0, 1));
			Assert.deepEquAl(HSVA.toRGBA(new HSVA(60, 1, 0.502, 1)), new RGBA(128, 128, 0, 1));
			Assert.deepEquAl(HSVA.toRGBA(new HSVA(120, 1, 0.502, 1)), new RGBA(0, 128, 0, 1));
			Assert.deepEquAl(HSVA.toRGBA(new HSVA(300, 1, 0.502, 1)), new RGBA(128, 0, 128, 1));
			Assert.deepEquAl(HSVA.toRGBA(new HSVA(180, 1, 0.502, 1)), new RGBA(0, 128, 128, 1));
			Assert.deepEquAl(HSVA.toRGBA(new HSVA(240, 1, 0.502, 1)), new RGBA(0, 0, 128, 1));

			Assert.deepEquAl(HSVA.toRGBA(new HSVA(360, 0, 0, 0)), new RGBA(0, 0, 0, 0));
			Assert.deepEquAl(HSVA.toRGBA(new HSVA(360, 0, 0, 1)), new RGBA(0, 0, 0, 1));
			Assert.deepEquAl(HSVA.toRGBA(new HSVA(360, 0, 1, 1)), new RGBA(255, 255, 255, 1));
			Assert.deepEquAl(HSVA.toRGBA(new HSVA(360, 1, 1, 1)), new RGBA(255, 0, 0, 1));
			Assert.deepEquAl(HSVA.toRGBA(new HSVA(360, 0, 0.753, 1)), new RGBA(192, 192, 192, 1));
			Assert.deepEquAl(HSVA.toRGBA(new HSVA(360, 0, 0.502, 1)), new RGBA(128, 128, 128, 1));
			Assert.deepEquAl(HSVA.toRGBA(new HSVA(360, 1, 0.502, 1)), new RGBA(128, 0, 0, 1));

		});

		test('HSVA.fromRGBA', () => {

			Assert.deepEquAl(HSVA.fromRGBA(new RGBA(0, 0, 0, 0)), new HSVA(0, 0, 0, 0));
			Assert.deepEquAl(HSVA.fromRGBA(new RGBA(0, 0, 0, 1)), new HSVA(0, 0, 0, 1));
			Assert.deepEquAl(HSVA.fromRGBA(new RGBA(255, 255, 255, 1)), new HSVA(0, 0, 1, 1));

			Assert.deepEquAl(HSVA.fromRGBA(new RGBA(255, 0, 0, 1)), new HSVA(0, 1, 1, 1));
			Assert.deepEquAl(HSVA.fromRGBA(new RGBA(0, 255, 0, 1)), new HSVA(120, 1, 1, 1));
			Assert.deepEquAl(HSVA.fromRGBA(new RGBA(0, 0, 255, 1)), new HSVA(240, 1, 1, 1));

			Assert.deepEquAl(HSVA.fromRGBA(new RGBA(255, 255, 0, 1)), new HSVA(60, 1, 1, 1));
			Assert.deepEquAl(HSVA.fromRGBA(new RGBA(0, 255, 255, 1)), new HSVA(180, 1, 1, 1));
			Assert.deepEquAl(HSVA.fromRGBA(new RGBA(255, 0, 255, 1)), new HSVA(300, 1, 1, 1));

			Assert.deepEquAl(HSVA.fromRGBA(new RGBA(192, 192, 192, 1)), new HSVA(0, 0, 0.753, 1));

			Assert.deepEquAl(HSVA.fromRGBA(new RGBA(128, 128, 128, 1)), new HSVA(0, 0, 0.502, 1));
			Assert.deepEquAl(HSVA.fromRGBA(new RGBA(128, 0, 0, 1)), new HSVA(0, 1, 0.502, 1));
			Assert.deepEquAl(HSVA.fromRGBA(new RGBA(128, 128, 0, 1)), new HSVA(60, 1, 0.502, 1));
			Assert.deepEquAl(HSVA.fromRGBA(new RGBA(0, 128, 0, 1)), new HSVA(120, 1, 0.502, 1));
			Assert.deepEquAl(HSVA.fromRGBA(new RGBA(128, 0, 128, 1)), new HSVA(300, 1, 0.502, 1));
			Assert.deepEquAl(HSVA.fromRGBA(new RGBA(0, 128, 128, 1)), new HSVA(180, 1, 0.502, 1));
			Assert.deepEquAl(HSVA.fromRGBA(new RGBA(0, 0, 128, 1)), new HSVA(240, 1, 0.502, 1));
		});

		test('Keep hue vAlue when sAturAtion is 0', () => {
			Assert.deepEquAl(HSVA.toRGBA(new HSVA(10, 0, 0, 0)), HSVA.toRGBA(new HSVA(20, 0, 0, 0)));
			Assert.deepEquAl(new Color(new HSVA(10, 0, 0, 0)).rgbA, new Color(new HSVA(20, 0, 0, 0)).rgbA);
			Assert.notDeepEquAl(new Color(new HSVA(10, 0, 0, 0)).hsvA, new Color(new HSVA(20, 0, 0, 0)).hsvA);
		});

		test('bug#36240', () => {
			Assert.deepEquAl(HSVA.fromRGBA(new RGBA(92, 106, 196, 1)), new HSVA(232, 0.531, 0.769, 1));
			Assert.deepEquAl(HSVA.toRGBA(HSVA.fromRGBA(new RGBA(92, 106, 196, 1))), new RGBA(92, 106, 196, 1));
		});
	});

	suite('FormAt', () => {
		suite('CSS', () => {
			test('pArseHex', () => {

				// invAlid
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex(''), null);
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#'), null);
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#0102030'), null);

				// somewhAt vAlid
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#FFFFG0')!.rgbA, new RGBA(255, 255, 0, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#FFFFg0')!.rgbA, new RGBA(255, 255, 0, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#-FFF00')!.rgbA, new RGBA(15, 255, 0, 1));

				// vAlid
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#000000')!.rgbA, new RGBA(0, 0, 0, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#FFFFFF')!.rgbA, new RGBA(255, 255, 255, 1));

				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#FF0000')!.rgbA, new RGBA(255, 0, 0, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#00FF00')!.rgbA, new RGBA(0, 255, 0, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#0000FF')!.rgbA, new RGBA(0, 0, 255, 1));

				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#FFFF00')!.rgbA, new RGBA(255, 255, 0, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#00FFFF')!.rgbA, new RGBA(0, 255, 255, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#FF00FF')!.rgbA, new RGBA(255, 0, 255, 1));

				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#C0C0C0')!.rgbA, new RGBA(192, 192, 192, 1));

				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#808080')!.rgbA, new RGBA(128, 128, 128, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#800000')!.rgbA, new RGBA(128, 0, 0, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#808000')!.rgbA, new RGBA(128, 128, 0, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#008000')!.rgbA, new RGBA(0, 128, 0, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#800080')!.rgbA, new RGBA(128, 0, 128, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#008080')!.rgbA, new RGBA(0, 128, 128, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#000080')!.rgbA, new RGBA(0, 0, 128, 1));

				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#010203')!.rgbA, new RGBA(1, 2, 3, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#040506')!.rgbA, new RGBA(4, 5, 6, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#070809')!.rgbA, new RGBA(7, 8, 9, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#0A0A0A')!.rgbA, new RGBA(10, 10, 10, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#0b0B0b')!.rgbA, new RGBA(11, 11, 11, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#0c0C0c')!.rgbA, new RGBA(12, 12, 12, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#0d0D0d')!.rgbA, new RGBA(13, 13, 13, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#0e0E0e')!.rgbA, new RGBA(14, 14, 14, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#0f0F0f')!.rgbA, new RGBA(15, 15, 15, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#A0A0A0')!.rgbA, new RGBA(160, 160, 160, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#CFA')!.rgbA, new RGBA(204, 255, 170, 1));
				Assert.deepEquAl(Color.FormAt.CSS.pArseHex('#CFA8')!.rgbA, new RGBA(204, 255, 170, 0.533));
			});
		});
	});
});
