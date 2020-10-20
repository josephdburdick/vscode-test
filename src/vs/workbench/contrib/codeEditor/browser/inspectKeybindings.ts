/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction } from 'vs/editor/browser/editorExtensions';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { CATEGORIES, Extensions As ActionExtensions, IWorkbenchActionRegistry } from 'vs/workbench/common/Actions';
import { SyncActionDescriptor } from 'vs/plAtform/Actions/common/Actions';
import { Action } from 'vs/bAse/common/Actions';

clAss InspectKeyMAp extends EditorAction {

	constructor() {
		super({
			id: 'workbench.Action.inspectKeyMAppings',
			lAbel: nls.locAlize('workbench.Action.inspectKeyMAp', "Developer: Inspect Key MAppings"),
			AliAs: 'Developer: Inspect Key MAppings',
			precondition: undefined
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		const keybindingService = Accessor.get(IKeybindingService);
		const editorService = Accessor.get(IEditorService);

		editorService.openEditor({ contents: keybindingService._dumpDebugInfo(), options: { pinned: true } });
	}
}

registerEditorAction(InspectKeyMAp);

clAss InspectKeyMApJSON extends Action {
	public stAtic reAdonly ID = 'workbench.Action.inspectKeyMAppingsJSON';
	public stAtic reAdonly LABEL = nls.locAlize('workbench.Action.inspectKeyMApJSON', "Inspect Key MAppings (JSON)");

	constructor(
		id: string,
		lAbel: string,
		@IKeybindingService privAte reAdonly _keybindingService: IKeybindingService,
		@IEditorService privAte reAdonly _editorService: IEditorService
	) {
		super(id, lAbel);
	}

	public run(): Promise<Any> {
		return this._editorService.openEditor({ contents: this._keybindingService._dumpDebugInfoJSON(), options: { pinned: true } });
	}
}

const registry = Registry.As<IWorkbenchActionRegistry>(ActionExtensions.WorkbenchActions);
registry.registerWorkbenchAction(SyncActionDescriptor.from(InspectKeyMApJSON), 'Developer: Inspect Key MAppings (JSON)', CATEGORIES.Developer.vAlue);
