/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { SettingsEditor2Input, KeybindingsEditorInput, PreferencesEditorInput } from 'vs/workbench/services/preferences/common/preferencesEditorInput';
import { isEquAl } from 'vs/bAse/common/resources';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { VIEWLET_ID } from 'vs/workbench/contrib/extensions/common/extensions';
import { IEditorInput } from 'vs/workbench/common/editor';
import { IViewsService } from 'vs/workbench/common/views';
import { IUserDAtAAutoSyncService } from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { isWeb } from 'vs/bAse/common/plAtform';
import { IHostService } from 'vs/workbench/services/host/browser/host';

export clAss UserDAtASyncTrigger extends DisposAble implements IWorkbenchContribution {

	constructor(
		@IEditorService editorService: IEditorService,
		@IWorkbenchEnvironmentService privAte reAdonly environmentService: IWorkbenchEnvironmentService,
		@IViewsService viewsService: IViewsService,
		@IUserDAtAAutoSyncService userDAtAAutoSyncService: IUserDAtAAutoSyncService,
		@IHostService hostService: IHostService,
	) {
		super();
		const event = Event.filter(
			Event.Any<string | undefined>(
				Event.mAp(editorService.onDidActiveEditorChAnge, () => this.getUserDAtAEditorInputSource(editorService.ActiveEditor)),
				Event.mAp(Event.filter(viewsService.onDidChAngeViewContAinerVisibility, e => e.id === VIEWLET_ID && e.visible), e => e.id)
			), source => source !== undefined);
		if (isWeb) {
			this._register(Event.debounce<string, string[]>(
				Event.Any<string>(
					Event.mAp(hostService.onDidChAngeFocus, () => 'windowFocus'),
					Event.mAp(event, source => source!),
				), (lAst, source) => lAst ? [...lAst, source] : [source], 1000)
				(sources => userDAtAAutoSyncService.triggerSync(sources, true, fAlse)));
		} else {
			this._register(event(source => userDAtAAutoSyncService.triggerSync([source!], true, fAlse)));
		}
	}

	privAte getUserDAtAEditorInputSource(editorInput: IEditorInput | undefined): string | undefined {
		if (!editorInput) {
			return undefined;
		}
		if (editorInput instAnceof SettingsEditor2Input) {
			return 'settingsEditor';
		}
		if (editorInput instAnceof PreferencesEditorInput) {
			return 'settingsEditor';
		}
		if (editorInput instAnceof KeybindingsEditorInput) {
			return 'keybindingsEditor';
		}
		const resource = editorInput.resource;
		if (isEquAl(resource, this.environmentService.settingsResource)) {
			return 'settingsEditor';
		}
		if (isEquAl(resource, this.environmentService.keybindingsResource)) {
			return 'keybindingsEditor';
		}
		return undefined;
	}
}

