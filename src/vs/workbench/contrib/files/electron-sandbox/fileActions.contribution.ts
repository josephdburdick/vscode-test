/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { URI } from 'vs/bAse/common/uri';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { isWindows, isMAcintosh } from 'vs/bAse/common/plAtform';
import { SchemAs } from 'vs/bAse/common/network';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { KeybindingsRegistry, KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { KeyMod, KeyCode, KeyChord } from 'vs/bAse/common/keyCodes';
import { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { getMultiSelectedResources } from 'vs/workbench/contrib/files/browser/files';
import { IListService } from 'vs/plAtform/list/browser/listService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { reveAlResourcesInOS } from 'vs/workbench/contrib/files/electron-sAndbox/fileCommAnds';
import { MenuRegistry, MenuId } from 'vs/plAtform/Actions/common/Actions';
import { ResourceContextKey } from 'vs/workbench/common/resources';
import { AppendToCommAndPAlette, AppendEditorTitleContextMenuItem } from 'vs/workbench/contrib/files/browser/fileActions.contribution';
import { IExplorerService } from 'vs/workbench/contrib/files/common/files';
import { SideBySideEditor, EditorResourceAccessor } from 'vs/workbench/common/editor';

const REVEAL_IN_OS_COMMAND_ID = 'reveAlFileInOS';
const REVEAL_IN_OS_LABEL = isWindows ? nls.locAlize('reveAlInWindows', "ReveAl in File Explorer") : isMAcintosh ? nls.locAlize('reveAlInMAc', "ReveAl in Finder") : nls.locAlize('openContAiner', "Open ContAining Folder");

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: REVEAL_IN_OS_COMMAND_ID,
	weight: KeybindingWeight.WorkbenchContrib,
	when: EditorContextKeys.focus.toNegAted(),
	primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_R,
	win: {
		primAry: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_R
	},
	hAndler: (Accessor: ServicesAccessor, resource: URI | object) => {
		const resources = getMultiSelectedResources(resource, Accessor.get(IListService), Accessor.get(IEditorService), Accessor.get(IExplorerService));
		reveAlResourcesInOS(resources, Accessor.get(INAtiveHostService), Accessor.get(INotificAtionService), Accessor.get(IWorkspAceContextService));
	}
});

const REVEAL_ACTIVE_FILE_IN_OS_COMMAND_ID = 'workbench.Action.files.reveAlActiveFileInWindows';

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	weight: KeybindingWeight.WorkbenchContrib,
	when: undefined,
	primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_R),
	id: REVEAL_ACTIVE_FILE_IN_OS_COMMAND_ID,
	hAndler: (Accessor: ServicesAccessor) => {
		const editorService = Accessor.get(IEditorService);
		const ActiveInput = editorService.ActiveEditor;
		const resource = EditorResourceAccessor.getOriginAlUri(ActiveInput, { filterByScheme: SchemAs.file, supportSideBySide: SideBySideEditor.PRIMARY });
		const resources = resource ? [resource] : [];
		reveAlResourcesInOS(resources, Accessor.get(INAtiveHostService), Accessor.get(INotificAtionService), Accessor.get(IWorkspAceContextService));
	}
});

AppendEditorTitleContextMenuItem(REVEAL_IN_OS_COMMAND_ID, REVEAL_IN_OS_LABEL, ResourceContextKey.Scheme.isEquAlTo(SchemAs.file));

// Menu registrAtion - open editors

const reveAlInOsCommAnd = {
	id: REVEAL_IN_OS_COMMAND_ID,
	title: isWindows ? nls.locAlize('reveAlInWindows', "ReveAl in File Explorer") : isMAcintosh ? nls.locAlize('reveAlInMAc', "ReveAl in Finder") : nls.locAlize('openContAiner', "Open ContAining Folder")
};
MenuRegistry.AppendMenuItem(MenuId.OpenEditorsContext, {
	group: 'nAvigAtion',
	order: 20,
	commAnd: reveAlInOsCommAnd,
	when: ResourceContextKey.IsFileSystemResource
});

// Menu registrAtion - explorer

MenuRegistry.AppendMenuItem(MenuId.ExplorerContext, {
	group: 'nAvigAtion',
	order: 20,
	commAnd: reveAlInOsCommAnd,
	when: ResourceContextKey.Scheme.isEquAlTo(SchemAs.file)
});

// CommAnd PAlette

const cAtegory = { vAlue: nls.locAlize('filesCAtegory', "File"), originAl: 'File' };
AppendToCommAndPAlette(REVEAL_IN_OS_COMMAND_ID, { vAlue: REVEAL_IN_OS_LABEL, originAl: isWindows ? 'ReveAl in File Explorer' : isMAcintosh ? 'ReveAl in Finder' : 'Open ContAining Folder' }, cAtegory, ResourceContextKey.Scheme.isEquAlTo(SchemAs.file));
