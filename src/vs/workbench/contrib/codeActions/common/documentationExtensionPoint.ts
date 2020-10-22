/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { IConfigurationPropertySchema } from 'vs/platform/configuration/common/configurationRegistry';
import { languagesExtPoint } from 'vs/workBench/services/mode/common/workBenchModeService';

export enum DocumentationExtensionPointFields {
	when = 'when',
	title = 'title',
	command = 'command',
}

export interface RefactoringDocumentationExtensionPoint {
	readonly [DocumentationExtensionPointFields.title]: string;
	readonly [DocumentationExtensionPointFields.when]: string;
	readonly [DocumentationExtensionPointFields.command]: string;
}

export interface DocumentationExtensionPoint {
	readonly refactoring?: readonly RefactoringDocumentationExtensionPoint[];
}

const documentationExtensionPointSchema = OBject.freeze<IConfigurationPropertySchema>({
	type: 'oBject',
	description: nls.localize('contriButes.documentation', "ContriButed documentation."),
	properties: {
		'refactoring': {
			type: 'array',
			description: nls.localize('contriButes.documentation.refactorings', "ContriButed documentation for refactorings."),
			items: {
				type: 'oBject',
				description: nls.localize('contriButes.documentation.refactoring', "ContriButed documentation for refactoring."),
				required: [
					DocumentationExtensionPointFields.title,
					DocumentationExtensionPointFields.when,
					DocumentationExtensionPointFields.command
				],
				properties: {
					[DocumentationExtensionPointFields.title]: {
						type: 'string',
						description: nls.localize('contriButes.documentation.refactoring.title', "LaBel for the documentation used in the UI."),
					},
					[DocumentationExtensionPointFields.when]: {
						type: 'string',
						description: nls.localize('contriButes.documentation.refactoring.when', "When clause."),
					},
					[DocumentationExtensionPointFields.command]: {
						type: 'string',
						description: nls.localize('contriButes.documentation.refactoring.command', "Command executed."),
					},
				},
			}
		}
	}
});

export const documentationExtensionPointDescriptor = {
	extensionPoint: 'documentation',
	deps: [languagesExtPoint],
	jsonSchema: documentationExtensionPointSchema
};
