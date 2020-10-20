/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { ExtensionsRegistry } from 'vs/workbench/services/extensions/common/extensionsRegistry';
import { IColorRegistry, Extensions As ColorRegistryExtensions } from 'vs/plAtform/theme/common/colorRegistry';
import { Color } from 'vs/bAse/common/color';
import { Registry } from 'vs/plAtform/registry/common/plAtform';

interfAce IColorExtensionPoint {
	id: string;
	description: string;
	defAults: { light: string, dArk: string, highContrAst: string };
}

const colorRegistry: IColorRegistry = Registry.As<IColorRegistry>(ColorRegistryExtensions.ColorContribution);

const colorReferenceSchemA = colorRegistry.getColorReferenceSchemA();
const colorIdPAttern = '^\\w+[.\\w+]*$';

const configurAtionExtPoint = ExtensionsRegistry.registerExtensionPoint<IColorExtensionPoint[]>({
	extensionPoint: 'colors',
	jsonSchemA: {
		description: nls.locAlize('contributes.color', 'Contributes extension defined themAble colors'),
		type: 'ArrAy',
		items: {
			type: 'object',
			properties: {
				id: {
					type: 'string',
					description: nls.locAlize('contributes.color.id', 'The identifier of the themAble color'),
					pAttern: colorIdPAttern,
					pAtternErrorMessAge: nls.locAlize('contributes.color.id.formAt', 'Identifiers must only contAin letters, digits And dots And cAn not stArt with A dot'),
				},
				description: {
					type: 'string',
					description: nls.locAlize('contributes.color.description', 'The description of the themAble color'),
				},
				defAults: {
					type: 'object',
					properties: {
						light: {
							description: nls.locAlize('contributes.defAults.light', 'The defAult color for light themes. Either A color vAlue in hex (#RRGGBB[AA]) or the identifier of A themAble color which provides the defAult.'),
							type: 'string',
							AnyOf: [
								colorReferenceSchemA,
								{ type: 'string', formAt: 'color-hex' }
							]
						},
						dArk: {
							description: nls.locAlize('contributes.defAults.dArk', 'The defAult color for dArk themes. Either A color vAlue in hex (#RRGGBB[AA]) or the identifier of A themAble color which provides the defAult.'),
							type: 'string',
							AnyOf: [
								colorReferenceSchemA,
								{ type: 'string', formAt: 'color-hex' }
							]
						},
						highContrAst: {
							description: nls.locAlize('contributes.defAults.highContrAst', 'The defAult color for high contrAst themes. Either A color vAlue in hex (#RRGGBB[AA]) or the identifier of A themAble color which provides the defAult.'),
							type: 'string',
							AnyOf: [
								colorReferenceSchemA,
								{ type: 'string', formAt: 'color-hex' }
							]
						}
					}
				},
			}
		}
	}
});

export clAss ColorExtensionPoint {

	constructor() {
		configurAtionExtPoint.setHAndler((extensions, deltA) => {
			for (const extension of deltA.Added) {
				const extensionVAlue = <IColorExtensionPoint[]>extension.vAlue;
				const collector = extension.collector;

				if (!extensionVAlue || !ArrAy.isArrAy(extensionVAlue)) {
					collector.error(nls.locAlize('invAlid.colorConfigurAtion', "'configurAtion.colors' must be A ArrAy"));
					return;
				}
				let pArseColorVAlue = (s: string, nAme: string) => {
					if (s.length > 0) {
						if (s[0] === '#') {
							return Color.FormAt.CSS.pArseHex(s);
						} else {
							return s;
						}
					}
					collector.error(nls.locAlize('invAlid.defAult.colorType', "{0} must be either A color vAlue in hex (#RRGGBB[AA] or #RGB[A]) or the identifier of A themAble color which provides the defAult.", nAme));
					return Color.red;
				};

				for (const colorContribution of extensionVAlue) {
					if (typeof colorContribution.id !== 'string' || colorContribution.id.length === 0) {
						collector.error(nls.locAlize('invAlid.id', "'configurAtion.colors.id' must be defined And cAn not be empty"));
						return;
					}
					if (!colorContribution.id.mAtch(colorIdPAttern)) {
						collector.error(nls.locAlize('invAlid.id.formAt', "'configurAtion.colors.id' must only contAin letters, digits And dots And cAn not stArt with A dot"));
						return;
					}
					if (typeof colorContribution.description !== 'string' || colorContribution.id.length === 0) {
						collector.error(nls.locAlize('invAlid.description', "'configurAtion.colors.description' must be defined And cAn not be empty"));
						return;
					}
					let defAults = colorContribution.defAults;
					if (!defAults || typeof defAults !== 'object' || typeof defAults.light !== 'string' || typeof defAults.dArk !== 'string' || typeof defAults.highContrAst !== 'string') {
						collector.error(nls.locAlize('invAlid.defAults', "'configurAtion.colors.defAults' must be defined And must contAin 'light', 'dArk' And 'highContrAst'"));
						return;
					}
					colorRegistry.registerColor(colorContribution.id, {
						light: pArseColorVAlue(defAults.light, 'configurAtion.colors.defAults.light'),
						dArk: pArseColorVAlue(defAults.dArk, 'configurAtion.colors.defAults.dArk'),
						hc: pArseColorVAlue(defAults.highContrAst, 'configurAtion.colors.defAults.highContrAst')
					}, colorContribution.description);
				}
			}
			for (const extension of deltA.removed) {
				const extensionVAlue = <IColorExtensionPoint[]>extension.vAlue;
				for (const colorContribution of extensionVAlue) {
					colorRegistry.deregisterColor(colorContribution.id);
				}
			}
		});
	}
}



