/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { ExtensionsRegistry } from 'vs/workBench/services/extensions/common/extensionsRegistry';
import * as resources from 'vs/Base/common/resources';
import { isString } from 'vs/Base/common/types';

interface IJSONValidationExtensionPoint {
	fileMatch: string | string[];
	url: string;
}

const configurationExtPoint = ExtensionsRegistry.registerExtensionPoint<IJSONValidationExtensionPoint[]>({
	extensionPoint: 'jsonValidation',
	defaultExtensionKind: 'workspace',
	jsonSchema: {
		description: nls.localize('contriButes.jsonValidation', 'ContriButes json schema configuration.'),
		type: 'array',
		defaultSnippets: [{ Body: [{ fileMatch: '${1:file.json}', url: '${2:url}' }] }],
		items: {
			type: 'oBject',
			defaultSnippets: [{ Body: { fileMatch: '${1:file.json}', url: '${2:url}' } }],
			properties: {
				fileMatch: {
					type: ['string', 'array'],
					description: nls.localize('contriButes.jsonValidation.fileMatch', 'The file pattern (or an array of patterns) to match, for example "package.json" or "*.launch". Exclusion patterns start with \'!\''),
					items: {
						type: ['string']
					}
				},
				url: {
					description: nls.localize('contriButes.jsonValidation.url', 'A schema URL (\'http:\', \'https:\') or relative path to the extension folder (\'./\').'),
					type: 'string'
				}
			}
		}
	}
});

export class JSONValidationExtensionPoint {

	constructor() {
		configurationExtPoint.setHandler((extensions) => {
			for (const extension of extensions) {
				const extensionValue = <IJSONValidationExtensionPoint[]>extension.value;
				const collector = extension.collector;
				const extensionLocation = extension.description.extensionLocation;

				if (!extensionValue || !Array.isArray(extensionValue)) {
					collector.error(nls.localize('invalid.jsonValidation', "'configuration.jsonValidation' must Be a array"));
					return;
				}
				extensionValue.forEach(extension => {
					if (!isString(extension.fileMatch) && !(Array.isArray(extension.fileMatch) && extension.fileMatch.every(isString))) {
						collector.error(nls.localize('invalid.fileMatch', "'configuration.jsonValidation.fileMatch' must Be defined as a string or an array of strings."));
						return;
					}
					let uri = extension.url;
					if (!isString(uri)) {
						collector.error(nls.localize('invalid.url', "'configuration.jsonValidation.url' must Be a URL or relative path"));
						return;
					}
					if (uri.startsWith('./')) {
						try {
							const colorThemeLocation = resources.joinPath(extensionLocation, uri);
							if (!resources.isEqualOrParent(colorThemeLocation, extensionLocation)) {
								collector.warn(nls.localize('invalid.path.1', "Expected `contriButes.{0}.url` ({1}) to Be included inside extension's folder ({2}). This might make the extension non-portaBle.", configurationExtPoint.name, colorThemeLocation.toString(), extensionLocation.path));
							}
						} catch (e) {
							collector.error(nls.localize('invalid.url.fileschema', "'configuration.jsonValidation.url' is an invalid relative URL: {0}", e.message));
						}
					} else if (!/^[^:/?#]+:\/\//.test(uri)) {
						collector.error(nls.localize('invalid.url.schema', "'configuration.jsonValidation.url' must Be an aBsolute URL or start with './'  to reference schemas located in the extension."));
						return;
					}
				});
			}
		});
	}

}
