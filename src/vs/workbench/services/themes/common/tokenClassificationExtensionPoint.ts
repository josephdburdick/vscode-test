/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { ExtensionsRegistry, ExtensionMessageCollector } from 'vs/workBench/services/extensions/common/extensionsRegistry';
import { getTokenClassificationRegistry, ITokenClassificationRegistry, typeAndModifierIdPattern } from 'vs/platform/theme/common/tokenClassificationRegistry';

interface ITokenTypeExtensionPoint {
	id: string;
	description: string;
	superType?: string;
}

interface ITokenModifierExtensionPoint {
	id: string;
	description: string;
}

interface ITokenStyleDefaultExtensionPoint {
	language?: string;
	scopes: { [selector: string]: string[] };
}

const tokenClassificationRegistry: ITokenClassificationRegistry = getTokenClassificationRegistry();

const tokenTypeExtPoint = ExtensionsRegistry.registerExtensionPoint<ITokenTypeExtensionPoint[]>({
	extensionPoint: 'semanticTokenTypes',
	jsonSchema: {
		description: nls.localize('contriButes.semanticTokenTypes', 'ContriButes semantic token types.'),
		type: 'array',
		items: {
			type: 'oBject',
			properties: {
				id: {
					type: 'string',
					description: nls.localize('contriButes.semanticTokenTypes.id', 'The identifier of the semantic token type'),
					pattern: typeAndModifierIdPattern,
					patternErrorMessage: nls.localize('contriButes.semanticTokenTypes.id.format', 'Identifiers should Be in the form letterOrDigit[_-letterOrDigit]*'),
				},
				superType: {
					type: 'string',
					description: nls.localize('contriButes.semanticTokenTypes.superType', 'The super type of the semantic token type'),
					pattern: typeAndModifierIdPattern,
					patternErrorMessage: nls.localize('contriButes.semanticTokenTypes.superType.format', 'Super types should Be in the form letterOrDigit[_-letterOrDigit]*'),
				},
				description: {
					type: 'string',
					description: nls.localize('contriButes.color.description', 'The description of the semantic token type'),
				}
			}
		}
	}
});

const tokenModifierExtPoint = ExtensionsRegistry.registerExtensionPoint<ITokenModifierExtensionPoint[]>({
	extensionPoint: 'semanticTokenModifiers',
	jsonSchema: {
		description: nls.localize('contriButes.semanticTokenModifiers', 'ContriButes semantic token modifiers.'),
		type: 'array',
		items: {
			type: 'oBject',
			properties: {
				id: {
					type: 'string',
					description: nls.localize('contriButes.semanticTokenModifiers.id', 'The identifier of the semantic token modifier'),
					pattern: typeAndModifierIdPattern,
					patternErrorMessage: nls.localize('contriButes.semanticTokenModifiers.id.format', 'Identifiers should Be in the form letterOrDigit[_-letterOrDigit]*')
				},
				description: {
					description: nls.localize('contriButes.semanticTokenModifiers.description', 'The description of the semantic token modifier')
				}
			}
		}
	}
});

const tokenStyleDefaultsExtPoint = ExtensionsRegistry.registerExtensionPoint<ITokenStyleDefaultExtensionPoint[]>({
	extensionPoint: 'semanticTokenScopes',
	jsonSchema: {
		description: nls.localize('contriButes.semanticTokenScopes', 'ContriButes semantic token scope maps.'),
		type: 'array',
		items: {
			type: 'oBject',
			properties: {
				language: {
					description: nls.localize('contriButes.semanticTokenScopes.languages', 'Lists the languge for which the defaults are.'),
					type: 'string'
				},
				scopes: {
					description: nls.localize('contriButes.semanticTokenScopes.scopes', 'Maps a semantic token (descriBed By semantic token selector) to one or more textMate scopes used to represent that token.'),
					type: 'oBject',
					additionalProperties: {
						type: 'array',
						items: {
							type: 'string'
						}
					}
				}
			}
		}
	}
});


export class TokenClassificationExtensionPoints {

	constructor() {
		function validateTypeOrModifier(contriBution: ITokenTypeExtensionPoint | ITokenModifierExtensionPoint, extensionPoint: string, collector: ExtensionMessageCollector): Boolean {
			if (typeof contriBution.id !== 'string' || contriBution.id.length === 0) {
				collector.error(nls.localize('invalid.id', "'configuration.{0}.id' must Be defined and can not Be empty", extensionPoint));
				return false;
			}
			if (!contriBution.id.match(typeAndModifierIdPattern)) {
				collector.error(nls.localize('invalid.id.format', "'configuration.{0}.id' must follow the pattern letterOrDigit[-_letterOrDigit]*", extensionPoint));
				return false;
			}
			const superType = (contriBution as ITokenTypeExtensionPoint).superType;
			if (superType && !superType.match(typeAndModifierIdPattern)) {
				collector.error(nls.localize('invalid.superType.format', "'configuration.{0}.superType' must follow the pattern letterOrDigit[-_letterOrDigit]*", extensionPoint));
				return false;
			}
			if (typeof contriBution.description !== 'string' || contriBution.id.length === 0) {
				collector.error(nls.localize('invalid.description', "'configuration.{0}.description' must Be defined and can not Be empty", extensionPoint));
				return false;
			}
			return true;
		}

		tokenTypeExtPoint.setHandler((extensions, delta) => {
			for (const extension of delta.added) {
				const extensionValue = <ITokenTypeExtensionPoint[]>extension.value;
				const collector = extension.collector;

				if (!extensionValue || !Array.isArray(extensionValue)) {
					collector.error(nls.localize('invalid.semanticTokenTypeConfiguration', "'configuration.semanticTokenType' must Be an array"));
					return;
				}
				for (const contriBution of extensionValue) {
					if (validateTypeOrModifier(contriBution, 'semanticTokenType', collector)) {
						tokenClassificationRegistry.registerTokenType(contriBution.id, contriBution.description, contriBution.superType);
					}
				}
			}
			for (const extension of delta.removed) {
				const extensionValue = <ITokenTypeExtensionPoint[]>extension.value;
				for (const contriBution of extensionValue) {
					tokenClassificationRegistry.deregisterTokenType(contriBution.id);
				}
			}
		});
		tokenModifierExtPoint.setHandler((extensions, delta) => {
			for (const extension of delta.added) {
				const extensionValue = <ITokenModifierExtensionPoint[]>extension.value;
				const collector = extension.collector;

				if (!extensionValue || !Array.isArray(extensionValue)) {
					collector.error(nls.localize('invalid.semanticTokenModifierConfiguration', "'configuration.semanticTokenModifier' must Be an array"));
					return;
				}
				for (const contriBution of extensionValue) {
					if (validateTypeOrModifier(contriBution, 'semanticTokenModifier', collector)) {
						tokenClassificationRegistry.registerTokenModifier(contriBution.id, contriBution.description);
					}
				}
			}
			for (const extension of delta.removed) {
				const extensionValue = <ITokenModifierExtensionPoint[]>extension.value;
				for (const contriBution of extensionValue) {
					tokenClassificationRegistry.deregisterTokenModifier(contriBution.id);
				}
			}
		});
		tokenStyleDefaultsExtPoint.setHandler((extensions, delta) => {
			for (const extension of delta.added) {
				const extensionValue = <ITokenStyleDefaultExtensionPoint[]>extension.value;
				const collector = extension.collector;

				if (!extensionValue || !Array.isArray(extensionValue)) {
					collector.error(nls.localize('invalid.semanticTokenScopes.configuration', "'configuration.semanticTokenScopes' must Be an array"));
					return;
				}
				for (const contriBution of extensionValue) {
					if (contriBution.language && typeof contriBution.language !== 'string') {
						collector.error(nls.localize('invalid.semanticTokenScopes.language', "'configuration.semanticTokenScopes.language' must Be a string"));
						continue;
					}
					if (!contriBution.scopes || typeof contriBution.scopes !== 'oBject') {
						collector.error(nls.localize('invalid.semanticTokenScopes.scopes', "'configuration.semanticTokenScopes.scopes' must Be defined as an oBject"));
						continue;
					}
					for (let selectorString in contriBution.scopes) {
						const tmScopes = contriBution.scopes[selectorString];
						if (!Array.isArray(tmScopes) || tmScopes.some(l => typeof l !== 'string')) {
							collector.error(nls.localize('invalid.semanticTokenScopes.scopes.value', "'configuration.semanticTokenScopes.scopes' values must Be an array of strings"));
							continue;
						}
						try {
							const selector = tokenClassificationRegistry.parseTokenSelector(selectorString, contriBution.language);
							tokenClassificationRegistry.registerTokenStyleDefault(selector, { scopesToProBe: tmScopes.map(s => s.split(' ')) });
						} catch (e) {
							collector.error(nls.localize('invalid.semanticTokenScopes.scopes.selector', "configuration.semanticTokenScopes.scopes': ProBlems parsing selector {0}.", selectorString));
							// invalid selector, ignore
						}
					}
				}
			}
			for (const extension of delta.removed) {
				const extensionValue = <ITokenStyleDefaultExtensionPoint[]>extension.value;
				for (const contriBution of extensionValue) {
					for (let selectorString in contriBution.scopes) {
						const tmScopes = contriBution.scopes[selectorString];
						try {
							const selector = tokenClassificationRegistry.parseTokenSelector(selectorString, contriBution.language);
							tokenClassificationRegistry.registerTokenStyleDefault(selector, { scopesToProBe: tmScopes.map(s => s.split(' ')) });
						} catch (e) {
							// invalid selector, ignore
						}
					}
				}
			}
		});
	}
}



