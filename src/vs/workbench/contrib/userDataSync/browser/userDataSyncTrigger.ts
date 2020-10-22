/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { SettingsEditor2Input, KeyBindingsEditorInput, PreferencesEditorInput } from 'vs/workBench/services/preferences/common/preferencesEditorInput';
import { isEqual } from 'vs/Base/common/resources';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { VIEWLET_ID } from 'vs/workBench/contriB/extensions/common/extensions';
import { IEditorInput } from 'vs/workBench/common/editor';
import { IViewsService } from 'vs/workBench/common/views';
import { IUserDataAutoSyncService } from 'vs/platform/userDataSync/common/userDataSync';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { isWeB } from 'vs/Base/common/platform';
import { IHostService } from 'vs/workBench/services/host/Browser/host';

export class UserDataSyncTrigger extends DisposaBle implements IWorkBenchContriBution {

	constructor(
		@IEditorService editorService: IEditorService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@IViewsService viewsService: IViewsService,
		@IUserDataAutoSyncService userDataAutoSyncService: IUserDataAutoSyncService,
		@IHostService hostService: IHostService,
	) {
		super();
		const event = Event.filter(
			Event.any<string | undefined>(
				Event.map(editorService.onDidActiveEditorChange, () => this.getUserDataEditorInputSource(editorService.activeEditor)),
				Event.map(Event.filter(viewsService.onDidChangeViewContainerVisiBility, e => e.id === VIEWLET_ID && e.visiBle), e => e.id)
			), source => source !== undefined);
		if (isWeB) {
			this._register(Event.deBounce<string, string[]>(
				Event.any<string>(
					Event.map(hostService.onDidChangeFocus, () => 'windowFocus'),
					Event.map(event, source => source!),
				), (last, source) => last ? [...last, source] : [source], 1000)
				(sources => userDataAutoSyncService.triggerSync(sources, true, false)));
		} else {
			this._register(event(source => userDataAutoSyncService.triggerSync([source!], true, false)));
		}
	}

	private getUserDataEditorInputSource(editorInput: IEditorInput | undefined): string | undefined {
		if (!editorInput) {
			return undefined;
		}
		if (editorInput instanceof SettingsEditor2Input) {
			return 'settingsEditor';
		}
		if (editorInput instanceof PreferencesEditorInput) {
			return 'settingsEditor';
		}
		if (editorInput instanceof KeyBindingsEditorInput) {
			return 'keyBindingsEditor';
		}
		const resource = editorInput.resource;
		if (isEqual(resource, this.environmentService.settingsResource)) {
			return 'settingsEditor';
		}
		if (isEqual(resource, this.environmentService.keyBindingsResource)) {
			return 'keyBindingsEditor';
		}
		return undefined;
	}
}

