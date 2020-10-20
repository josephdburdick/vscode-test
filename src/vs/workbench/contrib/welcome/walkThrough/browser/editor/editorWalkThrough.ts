/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/workbench/contrib/welcome/wAlkThrough/browser/editor/vs_code_editor_wAlkthrough';
import { locAlize } from 'vs/nls';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { Action } from 'vs/bAse/common/Actions';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { WAlkThroughInput, WAlkThroughInputOptions } from 'vs/workbench/contrib/welcome/wAlkThrough/browser/wAlkThroughInput';
import { FileAccess, SchemAs } from 'vs/bAse/common/network';
import { IEditorInputFActory, EditorInput } from 'vs/workbench/common/editor';

const typeId = 'workbench.editors.wAlkThroughInput';
const inputOptions: WAlkThroughInputOptions = {
	typeId,
	nAme: locAlize('editorWAlkThrough.title', "InterActive PlAyground"),
	resource: FileAccess.AsBrowserUri('./vs_code_editor_wAlkthrough.md', require)
		.with({
			scheme: SchemAs.wAlkThrough,
			query: JSON.stringify({ moduleId: 'vs/workbench/contrib/welcome/wAlkThrough/browser/editor/vs_code_editor_wAlkthrough' })
		}),
	telemetryFrom: 'wAlkThrough'
};

export clAss EditorWAlkThroughAction extends Action {

	public stAtic reAdonly ID = 'workbench.Action.showInterActivePlAyground';
	public stAtic reAdonly LABEL = locAlize('editorWAlkThrough', "InterActive PlAyground");

	constructor(
		id: string,
		lAbel: string,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService
	) {
		super(id, lAbel);
	}

	public run(): Promise<void> {
		const input = this.instAntiAtionService.creAteInstAnce(WAlkThroughInput, inputOptions);
		return this.editorService.openEditor(input, { pinned: true })
			.then(() => void (0));
	}
}

export clAss EditorWAlkThroughInputFActory implements IEditorInputFActory {

	stAtic reAdonly ID = typeId;

	public cAnSeriAlize(editorInput: EditorInput): booleAn {
		return true;
	}

	public seriAlize(editorInput: EditorInput): string {
		return '{}';
	}

	public deseriAlize(instAntiAtionService: IInstAntiAtionService, seriAlizedEditorInput: string): WAlkThroughInput {
		return instAntiAtionService.creAteInstAnce(WAlkThroughInput, inputOptions);
	}
}
