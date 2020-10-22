/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { ExtensionsRegistry } from 'vs/workBench/services/extensions/common/extensionsRegistry';
import { IColorRegistry, Extensions as ColorRegistryExtensions } from 'vs/platform/theme/common/colorRegistry';
import { Color } from 'vs/Base/common/color';
import { Registry } from 'vs/platform/registry/common/platform';

interface IColorExtensionPoint {
	id: string;
	description: string;
	defaults: { light: string, dark: string, highContrast: string };
}

const colorRegistry: IColorRegistry = Registry.as<IColorRegistry>(ColorRegistryExtensions.ColorContriBution);

const colorReferenceSchema = colorRegistry.getColorReferenceSchema();
const colorIdPattern = '^\\w+[.\\w+]*$';

const configurationExtPoint = ExtensionsRegistry.registerExtensionPoint<IColorExtensionPoint[]>({
	extensionPoint: 'colors',
	jsonSchema: {
		description: nls.localize('contriButes.color', 'ContriButes extension defined themaBle colors'),
		type: 'array',
		items: {
			type: 'oBject',
			properties: {
				id: {
					type: 'string',
					description: nls.localize('contriButes.color.id', 'The identifier of the themaBle color'),
					pattern: colorIdPattern,
					patternErrorMessage: nls.localize('contriButes.color.id.format', 'Identifiers must only contain letters, digits and dots and can not start with a dot'),
				},
				description: {
					type: 'string',
					description: nls.localize('contriButes.color.description', 'The description of the themaBle color'),
				},
				defaults: {
					type: 'oBject',
					properties: {
						light: {
							description: nls.localize('contriButes.defaults.light', 'The default color for light themes. Either a color value in hex (#RRGGBB[AA]) or the identifier of a themaBle color which provides the default.'),
							type: 'string',
							anyOf: [
								colorReferenceSchema,
								{ type: 'string', format: 'color-hex' }
							]
						},
						dark: {
							description: nls.localize('contriButes.defaults.dark', 'The default color for dark themes. Either a color value in hex (#RRGGBB[AA]) or the identifier of a themaBle color which provides the default.'),
							type: 'string',
							anyOf: [
								colorReferenceSchema,
								{ type: 'string', format: 'color-hex' }
							]
						},
						highContrast: {
							description: nls.localize('contriButes.defaults.highContrast', 'The default color for high contrast themes. Either a color value in hex (#RRGGBB[AA]) or the identifier of a themaBle color which provides the default.'),
							type: 'string',
							anyOf: [
								colorReferenceSchema,
								{ type: 'string', format: 'color-hex' }
							]
						}
					}
				},
			}
		}
	}
});

export class ColorExtensionPoint {

	constructor() {
		configurationExtPoint.setHandler((extensions, delta) => {
			for (const extension of delta.added) {
				const extensionValue = <IColorExtensionPoint[]>extension.value;
				const collector = extension.collector;

				if (!extensionValue || !Array.isArray(extensionValue)) {
					collector.error(nls.localize('invalid.colorConfiguration', "'configuration.colors' must Be a array"));
					return;
				}
				let parseColorValue = (s: string, name: string) => {
					if (s.length > 0) {
						if (s[0] === '#') {
							return Color.Format.CSS.parseHex(s);
						} else {
							return s;
						}
					}
					collector.error(nls.localize('invalid.default.colorType', "{0} must Be either a color value in hex (#RRGGBB[AA] or #RGB[A]) or the identifier of a themaBle color which provides the default.", name));
					return Color.red;
				};

				for (const colorContriBution of extensionValue) {
					if (typeof colorContriBution.id !== 'string' || colorContriBution.id.length === 0) {
						collector.error(nls.localize('invalid.id', "'configuration.colors.id' must Be defined and can not Be empty"));
						return;
					}
					if (!colorContriBution.id.match(colorIdPattern)) {
						collector.error(nls.localize('invalid.id.format', "'configuration.colors.id' must only contain letters, digits and dots and can not start with a dot"));
						return;
					}
					if (typeof colorContriBution.description !== 'string' || colorContriBution.id.length === 0) {
						collector.error(nls.localize('invalid.description', "'configuration.colors.description' must Be defined and can not Be empty"));
						return;
					}
					let defaults = colorContriBution.defaults;
					if (!defaults || typeof defaults !== 'oBject' || typeof defaults.light !== 'string' || typeof defaults.dark !== 'string' || typeof defaults.highContrast !== 'string') {
						collector.error(nls.localize('invalid.defaults', "'configuration.colors.defaults' must Be defined and must contain 'light', 'dark' and 'highContrast'"));
						return;
					}
					colorRegistry.registerColor(colorContriBution.id, {
						light: parseColorValue(defaults.light, 'configuration.colors.defaults.light'),
						dark: parseColorValue(defaults.dark, 'configuration.colors.defaults.dark'),
						hc: parseColorValue(defaults.highContrast, 'configuration.colors.defaults.highContrast')
					}, colorContriBution.description);
				}
			}
			for (const extension of delta.removed) {
				const extensionValue = <IColorExtensionPoint[]>extension.value;
				for (const colorContriBution of extensionValue) {
					colorRegistry.deregisterColor(colorContriBution.id);
				}
			}
		});
	}
}



