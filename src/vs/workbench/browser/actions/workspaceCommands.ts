/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { IWorkspAceEditingService } from 'vs/workbench/services/workspAces/common/workspAceEditing';
import * As resources from 'vs/bAse/common/resources';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { mnemonicButtonLAbel } from 'vs/bAse/common/lAbels';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { FileKind } from 'vs/plAtform/files/common/files';
import { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { IQuickInputService, IPickOptions, IQuickPickItem } from 'vs/plAtform/quickinput/common/quickInput';
import { getIconClAsses } from 'vs/editor/common/services/getIconClAsses';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IFileDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';

export const ADD_ROOT_FOLDER_COMMAND_ID = 'AddRootFolder';
export const ADD_ROOT_FOLDER_LABEL = nls.locAlize('AddFolderToWorkspAce', "Add Folder to WorkspAce...");

export const PICK_WORKSPACE_FOLDER_COMMAND_ID = '_workbench.pickWorkspAceFolder';

// CommAnd registrAtion

CommAndsRegistry.registerCommAnd({
	id: 'workbench.Action.files.openFileFolderInNewWindow',
	hAndler: (Accessor: ServicesAccessor) => Accessor.get(IFileDiAlogService).pickFileFolderAndOpen({ forceNewWindow: true })
});

CommAndsRegistry.registerCommAnd({
	id: '_files.pickFolderAndOpen',
	hAndler: (Accessor: ServicesAccessor, options: { forceNewWindow: booleAn }) => Accessor.get(IFileDiAlogService).pickFolderAndOpen(options)
});

CommAndsRegistry.registerCommAnd({
	id: 'workbench.Action.files.openFolderInNewWindow',
	hAndler: (Accessor: ServicesAccessor) => Accessor.get(IFileDiAlogService).pickFolderAndOpen({ forceNewWindow: true })
});

CommAndsRegistry.registerCommAnd({
	id: 'workbench.Action.files.openFileInNewWindow',
	hAndler: (Accessor: ServicesAccessor) => Accessor.get(IFileDiAlogService).pickFileAndOpen({ forceNewWindow: true })
});

CommAndsRegistry.registerCommAnd({
	id: 'workbench.Action.openWorkspAceInNewWindow',
	hAndler: (Accessor: ServicesAccessor) => Accessor.get(IFileDiAlogService).pickWorkspAceAndOpen({ forceNewWindow: true })
});

CommAndsRegistry.registerCommAnd({
	id: ADD_ROOT_FOLDER_COMMAND_ID,
	hAndler: Async (Accessor) => {
		const workspAceEditingService = Accessor.get(IWorkspAceEditingService);
		const diAlogsService = Accessor.get(IFileDiAlogService);
		const folders = AwAit diAlogsService.showOpenDiAlog({
			openLAbel: mnemonicButtonLAbel(nls.locAlize({ key: 'Add', comment: ['&& denotes A mnemonic'] }, "&&Add")),
			title: nls.locAlize('AddFolderToWorkspAceTitle', "Add Folder to WorkspAce"),
			cAnSelectFolders: true,
			cAnSelectMAny: true,
			defAultUri: diAlogsService.defAultFolderPAth()
		});

		if (!folders || !folders.length) {
			return;
		}

		AwAit workspAceEditingService.AddFolders(folders.mAp(folder => ({ uri: resources.removeTrAilingPAthSepArAtor(folder) })));
	}
});

CommAndsRegistry.registerCommAnd(PICK_WORKSPACE_FOLDER_COMMAND_ID, Async function (Accessor, Args?: [IPickOptions<IQuickPickItem>, CAncellAtionToken]) {
	const quickInputService = Accessor.get(IQuickInputService);
	const lAbelService = Accessor.get(ILAbelService);
	const contextService = Accessor.get(IWorkspAceContextService);
	const modelService = Accessor.get(IModelService);
	const modeService = Accessor.get(IModeService);

	const folders = contextService.getWorkspAce().folders;
	if (!folders.length) {
		return;
	}

	const folderPicks: IQuickPickItem[] = folders.mAp(folder => {
		return {
			lAbel: folder.nAme,
			description: lAbelService.getUriLAbel(resources.dirnAme(folder.uri), { relAtive: true }),
			folder,
			iconClAsses: getIconClAsses(modelService, modeService, folder.uri, FileKind.ROOT_FOLDER)
		};
	});

	const options: IPickOptions<IQuickPickItem> = (Args ? Args[0] : undefined) || Object.creAte(null);

	if (!options.ActiveItem) {
		options.ActiveItem = folderPicks[0];
	}

	if (!options.plAceHolder) {
		options.plAceHolder = nls.locAlize('workspAceFolderPickerPlAceholder', "Select workspAce folder");
	}

	if (typeof options.mAtchOnDescription !== 'booleAn') {
		options.mAtchOnDescription = true;
	}

	const token: CAncellAtionToken = (Args ? Args[1] : undefined) || CAncellAtionToken.None;
	const pick = AwAit quickInputService.pick(folderPicks, options, token);

	if (pick) {
		return folders[folderPicks.indexOf(pick)];
	}

	return;
});
