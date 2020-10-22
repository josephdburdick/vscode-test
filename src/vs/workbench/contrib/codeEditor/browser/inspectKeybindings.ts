/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction } from 'vs/editor/Browser/editorExtensions';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { Registry } from 'vs/platform/registry/common/platform';
import { CATEGORIES, Extensions as ActionExtensions, IWorkBenchActionRegistry } from 'vs/workBench/common/actions';
import { SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { Action } from 'vs/Base/common/actions';

class InspectKeyMap extends EditorAction {

	constructor() {
		super({
			id: 'workBench.action.inspectKeyMappings',
			laBel: nls.localize('workBench.action.inspectKeyMap', "Developer: Inspect Key Mappings"),
			alias: 'Developer: Inspect Key Mappings',
			precondition: undefined
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		const keyBindingService = accessor.get(IKeyBindingService);
		const editorService = accessor.get(IEditorService);

		editorService.openEditor({ contents: keyBindingService._dumpDeBugInfo(), options: { pinned: true } });
	}
}

registerEditorAction(InspectKeyMap);

class InspectKeyMapJSON extends Action {
	puBlic static readonly ID = 'workBench.action.inspectKeyMappingsJSON';
	puBlic static readonly LABEL = nls.localize('workBench.action.inspectKeyMapJSON', "Inspect Key Mappings (JSON)");

	constructor(
		id: string,
		laBel: string,
		@IKeyBindingService private readonly _keyBindingService: IKeyBindingService,
		@IEditorService private readonly _editorService: IEditorService
	) {
		super(id, laBel);
	}

	puBlic run(): Promise<any> {
		return this._editorService.openEditor({ contents: this._keyBindingService._dumpDeBugInfoJSON(), options: { pinned: true } });
	}
}

const registry = Registry.as<IWorkBenchActionRegistry>(ActionExtensions.WorkBenchActions);
registry.registerWorkBenchAction(SyncActionDescriptor.from(InspectKeyMapJSON), 'Developer: Inspect Key Mappings (JSON)', CATEGORIES.Developer.value);
