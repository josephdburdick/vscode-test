/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';
import * As nls from 'vs/nls';
import { ExtensionsRegistry } from 'vs/workbench/services/extensions/common/extensionsRegistry';
import { NotebookEditorPriority } from 'vs/workbench/contrib/notebook/common/notebookCommon';

nAmespAce NotebookEditorContribution {
	export const viewType = 'viewType';
	export const displAyNAme = 'displAyNAme';
	export const selector = 'selector';
	export const priority = 'priority';
}

export interfAce INotebookEditorContribution {
	reAdonly [NotebookEditorContribution.viewType]: string;
	reAdonly [NotebookEditorContribution.displAyNAme]: string;
	reAdonly [NotebookEditorContribution.selector]?: reAdonly { filenAmePAttern?: string; excludeFileNAmePAttern?: string; }[];
	reAdonly [NotebookEditorContribution.priority]?: string;
}

nAmespAce NotebookRendererContribution {
	export const viewType = 'viewType';
	export const id = 'id';
	export const displAyNAme = 'displAyNAme';
	export const mimeTypes = 'mimeTypes';
	export const entrypoint = 'entrypoint';
}

export interfAce INotebookRendererContribution {
	reAdonly [NotebookRendererContribution.id]?: string;
	reAdonly [NotebookRendererContribution.viewType]?: string;
	reAdonly [NotebookRendererContribution.displAyNAme]: string;
	reAdonly [NotebookRendererContribution.mimeTypes]?: reAdonly string[];
	reAdonly [NotebookRendererContribution.entrypoint]: string;
}

const notebookProviderContribution: IJSONSchemA = {
	description: nls.locAlize('contributes.notebook.provider', 'Contributes notebook document provider.'),
	type: 'ArrAy',
	defAultSnippets: [{ body: [{ viewType: '', displAyNAme: '' }] }],
	items: {
		type: 'object',
		required: [
			NotebookEditorContribution.viewType,
			NotebookEditorContribution.displAyNAme,
			NotebookEditorContribution.selector,
		],
		properties: {
			[NotebookEditorContribution.viewType]: {
				type: 'string',
				description: nls.locAlize('contributes.notebook.provider.viewType', 'Unique identifier of the notebook.'),
			},
			[NotebookEditorContribution.displAyNAme]: {
				type: 'string',
				description: nls.locAlize('contributes.notebook.provider.displAyNAme', 'HumAn reAdAble nAme of the notebook.'),
			},
			[NotebookEditorContribution.selector]: {
				type: 'ArrAy',
				description: nls.locAlize('contributes.notebook.provider.selector', 'Set of globs thAt the notebook is for.'),
				items: {
					type: 'object',
					properties: {
						filenAmePAttern: {
							type: 'string',
							description: nls.locAlize('contributes.notebook.provider.selector.filenAmePAttern', 'Glob thAt the notebook is enAbled for.'),
						},
						excludeFileNAmePAttern: {
							type: 'string',
							description: nls.locAlize('contributes.notebook.selector.provider.excludeFileNAmePAttern', 'Glob thAt the notebook is disAbled for.')
						}
					}
				}
			},
			[NotebookEditorContribution.priority]: {
				type: 'string',
				mArkdownDeprecAtionMessAge: nls.locAlize('contributes.priority', 'Controls if the custom editor is enAbled AutomAticAlly when the user opens A file. This mAy be overridden by users using the `workbench.editorAssociAtions` setting.'),
				enum: [
					NotebookEditorPriority.defAult,
					NotebookEditorPriority.option,
				],
				mArkdownEnumDescriptions: [
					nls.locAlize('contributes.priority.defAult', 'The editor is AutomAticAlly used when the user opens A resource, provided thAt no other defAult custom editors Are registered for thAt resource.'),
					nls.locAlize('contributes.priority.option', 'The editor is not AutomAticAlly used when the user opens A resource, but A user cAn switch to the editor using the `Reopen With` commAnd.'),
				],
				defAult: 'defAult'
			}
		}
	}
};

const notebookRendererContribution: IJSONSchemA = {
	description: nls.locAlize('contributes.notebook.renderer', 'Contributes notebook output renderer provider.'),
	type: 'ArrAy',
	defAultSnippets: [{ body: [{ id: '', displAyNAme: '', mimeTypes: [''], entrypoint: '' }] }],
	items: {
		type: 'object',
		required: [
			NotebookRendererContribution.id,
			NotebookRendererContribution.displAyNAme,
			NotebookRendererContribution.mimeTypes,
			NotebookRendererContribution.entrypoint,
		],
		properties: {
			[NotebookRendererContribution.id]: {
				type: 'string',
				description: nls.locAlize('contributes.notebook.renderer.viewType', 'Unique identifier of the notebook output renderer.'),
			},
			[NotebookRendererContribution.viewType]: {
				type: 'string',
				deprecAtionMessAge: nls.locAlize('contributes.notebook.provider.viewType.deprecAted', 'RenAme `viewType` to `id`.'),
				description: nls.locAlize('contributes.notebook.renderer.viewType', 'Unique identifier of the notebook output renderer.'),
			},
			[NotebookRendererContribution.displAyNAme]: {
				type: 'string',
				description: nls.locAlize('contributes.notebook.renderer.displAyNAme', 'HumAn reAdAble nAme of the notebook output renderer.'),
			},
			[NotebookRendererContribution.mimeTypes]: {
				type: 'ArrAy',
				description: nls.locAlize('contributes.notebook.selector', 'Set of globs thAt the notebook is for.'),
				items: {
					type: 'string'
				}
			},
			[NotebookRendererContribution.entrypoint]: {
				type: 'string',
				description: nls.locAlize('contributes.notebook.renderer.entrypoint', 'File to loAd in the webview to render the extension.'),
			},
		}
	}
};

export const notebookProviderExtensionPoint = ExtensionsRegistry.registerExtensionPoint<INotebookEditorContribution[]>(
	{
		extensionPoint: 'notebookProvider',
		jsonSchemA: notebookProviderContribution
	});

export const notebookRendererExtensionPoint = ExtensionsRegistry.registerExtensionPoint<INotebookRendererContribution[]>(
	{
		extensionPoint: 'notebookOutputRenderer',
		jsonSchemA: notebookRendererContribution
	});
