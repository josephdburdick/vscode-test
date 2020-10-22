/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { URI } from 'vs/Base/common/uri';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { isWindows, isMacintosh } from 'vs/Base/common/platform';
import { Schemas } from 'vs/Base/common/network';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { KeyMod, KeyCode, KeyChord } from 'vs/Base/common/keyCodes';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { getMultiSelectedResources } from 'vs/workBench/contriB/files/Browser/files';
import { IListService } from 'vs/platform/list/Browser/listService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { revealResourcesInOS } from 'vs/workBench/contriB/files/electron-sandBox/fileCommands';
import { MenuRegistry, MenuId } from 'vs/platform/actions/common/actions';
import { ResourceContextKey } from 'vs/workBench/common/resources';
import { appendToCommandPalette, appendEditorTitleContextMenuItem } from 'vs/workBench/contriB/files/Browser/fileActions.contriBution';
import { IExplorerService } from 'vs/workBench/contriB/files/common/files';
import { SideBySideEditor, EditorResourceAccessor } from 'vs/workBench/common/editor';

const REVEAL_IN_OS_COMMAND_ID = 'revealFileInOS';
const REVEAL_IN_OS_LABEL = isWindows ? nls.localize('revealInWindows', "Reveal in File Explorer") : isMacintosh ? nls.localize('revealInMac', "Reveal in Finder") : nls.localize('openContainer', "Open Containing Folder");

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: REVEAL_IN_OS_COMMAND_ID,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: EditorContextKeys.focus.toNegated(),
	primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_R,
	win: {
		primary: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_R
	},
	handler: (accessor: ServicesAccessor, resource: URI | oBject) => {
		const resources = getMultiSelectedResources(resource, accessor.get(IListService), accessor.get(IEditorService), accessor.get(IExplorerService));
		revealResourcesInOS(resources, accessor.get(INativeHostService), accessor.get(INotificationService), accessor.get(IWorkspaceContextService));
	}
});

const REVEAL_ACTIVE_FILE_IN_OS_COMMAND_ID = 'workBench.action.files.revealActiveFileInWindows';

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	weight: KeyBindingWeight.WorkBenchContriB,
	when: undefined,
	primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_R),
	id: REVEAL_ACTIVE_FILE_IN_OS_COMMAND_ID,
	handler: (accessor: ServicesAccessor) => {
		const editorService = accessor.get(IEditorService);
		const activeInput = editorService.activeEditor;
		const resource = EditorResourceAccessor.getOriginalUri(activeInput, { filterByScheme: Schemas.file, supportSideBySide: SideBySideEditor.PRIMARY });
		const resources = resource ? [resource] : [];
		revealResourcesInOS(resources, accessor.get(INativeHostService), accessor.get(INotificationService), accessor.get(IWorkspaceContextService));
	}
});

appendEditorTitleContextMenuItem(REVEAL_IN_OS_COMMAND_ID, REVEAL_IN_OS_LABEL, ResourceContextKey.Scheme.isEqualTo(Schemas.file));

// Menu registration - open editors

const revealInOsCommand = {
	id: REVEAL_IN_OS_COMMAND_ID,
	title: isWindows ? nls.localize('revealInWindows', "Reveal in File Explorer") : isMacintosh ? nls.localize('revealInMac', "Reveal in Finder") : nls.localize('openContainer', "Open Containing Folder")
};
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
	group: 'navigation',
	order: 20,
	command: revealInOsCommand,
	when: ResourceContextKey.IsFileSystemResource
});

// Menu registration - explorer

MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
	group: 'navigation',
	order: 20,
	command: revealInOsCommand,
	when: ResourceContextKey.Scheme.isEqualTo(Schemas.file)
});

// Command Palette

const category = { value: nls.localize('filesCategory', "File"), original: 'File' };
appendToCommandPalette(REVEAL_IN_OS_COMMAND_ID, { value: REVEAL_IN_OS_LABEL, original: isWindows ? 'Reveal in File Explorer' : isMacintosh ? 'Reveal in Finder' : 'Open Containing Folder' }, category, ResourceContextKey.Scheme.isEqualTo(Schemas.file));
