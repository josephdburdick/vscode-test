/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { IConfigurAtionPropertySchemA } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { lAnguAgesExtPoint } from 'vs/workbench/services/mode/common/workbenchModeService';

export enum DocumentAtionExtensionPointFields {
	when = 'when',
	title = 'title',
	commAnd = 'commAnd',
}

export interfAce RefActoringDocumentAtionExtensionPoint {
	reAdonly [DocumentAtionExtensionPointFields.title]: string;
	reAdonly [DocumentAtionExtensionPointFields.when]: string;
	reAdonly [DocumentAtionExtensionPointFields.commAnd]: string;
}

export interfAce DocumentAtionExtensionPoint {
	reAdonly refActoring?: reAdonly RefActoringDocumentAtionExtensionPoint[];
}

const documentAtionExtensionPointSchemA = Object.freeze<IConfigurAtionPropertySchemA>({
	type: 'object',
	description: nls.locAlize('contributes.documentAtion', "Contributed documentAtion."),
	properties: {
		'refActoring': {
			type: 'ArrAy',
			description: nls.locAlize('contributes.documentAtion.refActorings', "Contributed documentAtion for refActorings."),
			items: {
				type: 'object',
				description: nls.locAlize('contributes.documentAtion.refActoring', "Contributed documentAtion for refActoring."),
				required: [
					DocumentAtionExtensionPointFields.title,
					DocumentAtionExtensionPointFields.when,
					DocumentAtionExtensionPointFields.commAnd
				],
				properties: {
					[DocumentAtionExtensionPointFields.title]: {
						type: 'string',
						description: nls.locAlize('contributes.documentAtion.refActoring.title', "LAbel for the documentAtion used in the UI."),
					},
					[DocumentAtionExtensionPointFields.when]: {
						type: 'string',
						description: nls.locAlize('contributes.documentAtion.refActoring.when', "When clAuse."),
					},
					[DocumentAtionExtensionPointFields.commAnd]: {
						type: 'string',
						description: nls.locAlize('contributes.documentAtion.refActoring.commAnd', "CommAnd executed."),
					},
				},
			}
		}
	}
});

export const documentAtionExtensionPointDescriptor = {
	extensionPoint: 'documentAtion',
	deps: [lAnguAgesExtPoint],
	jsonSchemA: documentAtionExtensionPointSchemA
};
