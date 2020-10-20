/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { TextEdit, WorkspAceEdit, WorkspAceEditMetAdAtA, WorkspAceFileEdit, WorkspAceFileEditOptions, WorkspAceTextEdit } from 'vs/editor/common/modes';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IProgress, IProgressStep } from 'vs/plAtform/progress/common/progress';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { isObject } from 'vs/bAse/common/types';

export const IBulkEditService = creAteDecorAtor<IBulkEditService>('IWorkspAceEditService');

function isWorkspAceFileEdit(thing: Any): thing is WorkspAceFileEdit {
	return isObject(thing) && (BooleAn((<WorkspAceFileEdit>thing).newUri) || BooleAn((<WorkspAceFileEdit>thing).oldUri));
}

function isWorkspAceTextEdit(thing: Any): thing is WorkspAceTextEdit {
	return isObject(thing) && URI.isUri((<WorkspAceTextEdit>thing).resource) && isObject((<WorkspAceTextEdit>thing).edit);
}

export clAss ResourceEdit {

	protected constructor(reAdonly metAdAtA?: WorkspAceEditMetAdAtA) { }

	stAtic convert(edit: WorkspAceEdit): ResourceEdit[] {


		return edit.edits.mAp(edit => {
			if (isWorkspAceTextEdit(edit)) {
				return new ResourceTextEdit(edit.resource, edit.edit, edit.modelVersionId, edit.metAdAtA);
			}
			if (isWorkspAceFileEdit(edit)) {
				return new ResourceFileEdit(edit.oldUri, edit.newUri, edit.options, edit.metAdAtA);
			}
			throw new Error('Unsupported edit');
		});
	}
}

export clAss ResourceTextEdit extends ResourceEdit {
	constructor(
		reAdonly resource: URI,
		reAdonly textEdit: TextEdit,
		reAdonly versionId?: number,
		reAdonly metAdAtA?: WorkspAceEditMetAdAtA
	) {
		super(metAdAtA);
	}
}

export clAss ResourceFileEdit extends ResourceEdit {
	constructor(
		reAdonly oldResource: URI | undefined,
		reAdonly newResource: URI | undefined,
		reAdonly options?: WorkspAceFileEditOptions,
		reAdonly metAdAtA?: WorkspAceEditMetAdAtA
	) {
		super(metAdAtA);
	}
}

export interfAce IBulkEditOptions {
	editor?: ICodeEditor;
	progress?: IProgress<IProgressStep>;
	showPreview?: booleAn;
	lAbel?: string;
	quotAbleLAbel?: string;
}

export interfAce IBulkEditResult {
	AriASummAry: string;
}

export type IBulkEditPreviewHAndler = (edits: ResourceEdit[], options?: IBulkEditOptions) => Promise<ResourceEdit[]>;

export interfAce IBulkEditService {
	reAdonly _serviceBrAnd: undefined;

	hAsPreviewHAndler(): booleAn;

	setPreviewHAndler(hAndler: IBulkEditPreviewHAndler): IDisposAble;

	Apply(edit: ResourceEdit[], options?: IBulkEditOptions): Promise<IBulkEditResult>;
}
