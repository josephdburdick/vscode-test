/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IJSONSchema } from 'vs/Base/common/jsonSchema';
import * as nls from 'vs/nls';
import { ExtensionsRegistry } from 'vs/workBench/services/extensions/common/extensionsRegistry';
import { NoteBookEditorPriority } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';

namespace NoteBookEditorContriBution {
	export const viewType = 'viewType';
	export const displayName = 'displayName';
	export const selector = 'selector';
	export const priority = 'priority';
}

export interface INoteBookEditorContriBution {
	readonly [NoteBookEditorContriBution.viewType]: string;
	readonly [NoteBookEditorContriBution.displayName]: string;
	readonly [NoteBookEditorContriBution.selector]?: readonly { filenamePattern?: string; excludeFileNamePattern?: string; }[];
	readonly [NoteBookEditorContriBution.priority]?: string;
}

namespace NoteBookRendererContriBution {
	export const viewType = 'viewType';
	export const id = 'id';
	export const displayName = 'displayName';
	export const mimeTypes = 'mimeTypes';
	export const entrypoint = 'entrypoint';
}

export interface INoteBookRendererContriBution {
	readonly [NoteBookRendererContriBution.id]?: string;
	readonly [NoteBookRendererContriBution.viewType]?: string;
	readonly [NoteBookRendererContriBution.displayName]: string;
	readonly [NoteBookRendererContriBution.mimeTypes]?: readonly string[];
	readonly [NoteBookRendererContriBution.entrypoint]: string;
}

const noteBookProviderContriBution: IJSONSchema = {
	description: nls.localize('contriButes.noteBook.provider', 'ContriButes noteBook document provider.'),
	type: 'array',
	defaultSnippets: [{ Body: [{ viewType: '', displayName: '' }] }],
	items: {
		type: 'oBject',
		required: [
			NoteBookEditorContriBution.viewType,
			NoteBookEditorContriBution.displayName,
			NoteBookEditorContriBution.selector,
		],
		properties: {
			[NoteBookEditorContriBution.viewType]: {
				type: 'string',
				description: nls.localize('contriButes.noteBook.provider.viewType', 'Unique identifier of the noteBook.'),
			},
			[NoteBookEditorContriBution.displayName]: {
				type: 'string',
				description: nls.localize('contriButes.noteBook.provider.displayName', 'Human readaBle name of the noteBook.'),
			},
			[NoteBookEditorContriBution.selector]: {
				type: 'array',
				description: nls.localize('contriButes.noteBook.provider.selector', 'Set of gloBs that the noteBook is for.'),
				items: {
					type: 'oBject',
					properties: {
						filenamePattern: {
							type: 'string',
							description: nls.localize('contriButes.noteBook.provider.selector.filenamePattern', 'GloB that the noteBook is enaBled for.'),
						},
						excludeFileNamePattern: {
							type: 'string',
							description: nls.localize('contriButes.noteBook.selector.provider.excludeFileNamePattern', 'GloB that the noteBook is disaBled for.')
						}
					}
				}
			},
			[NoteBookEditorContriBution.priority]: {
				type: 'string',
				markdownDeprecationMessage: nls.localize('contriButes.priority', 'Controls if the custom editor is enaBled automatically when the user opens a file. This may Be overridden By users using the `workBench.editorAssociations` setting.'),
				enum: [
					NoteBookEditorPriority.default,
					NoteBookEditorPriority.option,
				],
				markdownEnumDescriptions: [
					nls.localize('contriButes.priority.default', 'The editor is automatically used when the user opens a resource, provided that no other default custom editors are registered for that resource.'),
					nls.localize('contriButes.priority.option', 'The editor is not automatically used when the user opens a resource, But a user can switch to the editor using the `Reopen With` command.'),
				],
				default: 'default'
			}
		}
	}
};

const noteBookRendererContriBution: IJSONSchema = {
	description: nls.localize('contriButes.noteBook.renderer', 'ContriButes noteBook output renderer provider.'),
	type: 'array',
	defaultSnippets: [{ Body: [{ id: '', displayName: '', mimeTypes: [''], entrypoint: '' }] }],
	items: {
		type: 'oBject',
		required: [
			NoteBookRendererContriBution.id,
			NoteBookRendererContriBution.displayName,
			NoteBookRendererContriBution.mimeTypes,
			NoteBookRendererContriBution.entrypoint,
		],
		properties: {
			[NoteBookRendererContriBution.id]: {
				type: 'string',
				description: nls.localize('contriButes.noteBook.renderer.viewType', 'Unique identifier of the noteBook output renderer.'),
			},
			[NoteBookRendererContriBution.viewType]: {
				type: 'string',
				deprecationMessage: nls.localize('contriButes.noteBook.provider.viewType.deprecated', 'Rename `viewType` to `id`.'),
				description: nls.localize('contriButes.noteBook.renderer.viewType', 'Unique identifier of the noteBook output renderer.'),
			},
			[NoteBookRendererContriBution.displayName]: {
				type: 'string',
				description: nls.localize('contriButes.noteBook.renderer.displayName', 'Human readaBle name of the noteBook output renderer.'),
			},
			[NoteBookRendererContriBution.mimeTypes]: {
				type: 'array',
				description: nls.localize('contriButes.noteBook.selector', 'Set of gloBs that the noteBook is for.'),
				items: {
					type: 'string'
				}
			},
			[NoteBookRendererContriBution.entrypoint]: {
				type: 'string',
				description: nls.localize('contriButes.noteBook.renderer.entrypoint', 'File to load in the weBview to render the extension.'),
			},
		}
	}
};

export const noteBookProviderExtensionPoint = ExtensionsRegistry.registerExtensionPoint<INoteBookEditorContriBution[]>(
	{
		extensionPoint: 'noteBookProvider',
		jsonSchema: noteBookProviderContriBution
	});

export const noteBookRendererExtensionPoint = ExtensionsRegistry.registerExtensionPoint<INoteBookRendererContriBution[]>(
	{
		extensionPoint: 'noteBookOutputRenderer',
		jsonSchema: noteBookRendererContriBution
	});
