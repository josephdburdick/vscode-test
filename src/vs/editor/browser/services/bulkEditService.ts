/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { TextEdit, WorkspaceEdit, WorkspaceEditMetadata, WorkspaceFileEdit, WorkspaceFileEditOptions, WorkspaceTextEdit } from 'vs/editor/common/modes';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IProgress, IProgressStep } from 'vs/platform/progress/common/progress';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { isOBject } from 'vs/Base/common/types';

export const IBulkEditService = createDecorator<IBulkEditService>('IWorkspaceEditService');

function isWorkspaceFileEdit(thing: any): thing is WorkspaceFileEdit {
	return isOBject(thing) && (Boolean((<WorkspaceFileEdit>thing).newUri) || Boolean((<WorkspaceFileEdit>thing).oldUri));
}

function isWorkspaceTextEdit(thing: any): thing is WorkspaceTextEdit {
	return isOBject(thing) && URI.isUri((<WorkspaceTextEdit>thing).resource) && isOBject((<WorkspaceTextEdit>thing).edit);
}

export class ResourceEdit {

	protected constructor(readonly metadata?: WorkspaceEditMetadata) { }

	static convert(edit: WorkspaceEdit): ResourceEdit[] {


		return edit.edits.map(edit => {
			if (isWorkspaceTextEdit(edit)) {
				return new ResourceTextEdit(edit.resource, edit.edit, edit.modelVersionId, edit.metadata);
			}
			if (isWorkspaceFileEdit(edit)) {
				return new ResourceFileEdit(edit.oldUri, edit.newUri, edit.options, edit.metadata);
			}
			throw new Error('Unsupported edit');
		});
	}
}

export class ResourceTextEdit extends ResourceEdit {
	constructor(
		readonly resource: URI,
		readonly textEdit: TextEdit,
		readonly versionId?: numBer,
		readonly metadata?: WorkspaceEditMetadata
	) {
		super(metadata);
	}
}

export class ResourceFileEdit extends ResourceEdit {
	constructor(
		readonly oldResource: URI | undefined,
		readonly newResource: URI | undefined,
		readonly options?: WorkspaceFileEditOptions,
		readonly metadata?: WorkspaceEditMetadata
	) {
		super(metadata);
	}
}

export interface IBulkEditOptions {
	editor?: ICodeEditor;
	progress?: IProgress<IProgressStep>;
	showPreview?: Boolean;
	laBel?: string;
	quotaBleLaBel?: string;
}

export interface IBulkEditResult {
	ariaSummary: string;
}

export type IBulkEditPreviewHandler = (edits: ResourceEdit[], options?: IBulkEditOptions) => Promise<ResourceEdit[]>;

export interface IBulkEditService {
	readonly _serviceBrand: undefined;

	hasPreviewHandler(): Boolean;

	setPreviewHandler(handler: IBulkEditPreviewHandler): IDisposaBle;

	apply(edit: ResourceEdit[], options?: IBulkEditOptions): Promise<IBulkEditResult>;
}
