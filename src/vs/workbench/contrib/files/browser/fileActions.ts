/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { isWindows, isWeb } from 'vs/bAse/common/plAtform';
import * As extpAth from 'vs/bAse/common/extpAth';
import { extnAme, bAsenAme } from 'vs/bAse/common/pAth';
import * As resources from 'vs/bAse/common/resources';
import { URI } from 'vs/bAse/common/uri';
import { toErrorMessAge } from 'vs/bAse/common/errorMessAge';
import { Action } from 'vs/bAse/common/Actions';
import { DisposAbleStore, dispose, IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { VIEWLET_ID, IExplorerService, IFilesConfigurAtion, VIEW_ID } from 'vs/workbench/contrib/files/common/files';
import { ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';
import { BinArySize, IFileService, IFileStAtWithMetAdAtA, IFileStreAmContent } from 'vs/plAtform/files/common/files';
import { EditorResourceAccessor, SideBySideEditor } from 'vs/workbench/common/editor';
import { ExplorerViewPAneContAiner } from 'vs/workbench/contrib/files/browser/explorerViewlet';
import { IQuickInputService, ItemActivAtion } from 'vs/plAtform/quickinput/common/quickInput';
import { IViewletService } from 'vs/workbench/services/viewlet/browser/viewlet';
import { IInstAntiAtionService, ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ITextModel } from 'vs/editor/common/model';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { REVEAL_IN_EXPLORER_COMMAND_ID, SAVE_ALL_COMMAND_ID, SAVE_ALL_LABEL, SAVE_ALL_IN_GROUP_COMMAND_ID } from 'vs/workbench/contrib/files/browser/fileCommAnds';
import { ITextModelService, ITextModelContentProvider } from 'vs/editor/common/services/resolverService';
import { IConfigurAtionService, ConfigurAtionTArget } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ICommAndService, CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { FileAccess, SchemAs } from 'vs/bAse/common/network';
import { IDiAlogService, IConfirmAtionResult, getFileNAmesMessAge, IFileDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import { INotificAtionService, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { ConstAnts } from 'vs/bAse/common/uint';
import { CLOSE_EDITORS_AND_GROUP_COMMAND_ID } from 'vs/workbench/browser/pArts/editor/editorCommAnds';
import { coAlesce } from 'vs/bAse/common/ArrAys';
import { ExplorerItem, NewExplorerItem } from 'vs/workbench/contrib/files/common/explorerModel';
import { getErrorMessAge } from 'vs/bAse/common/errors';
import { WebFileSystemAccess, triggerDownloAd } from 'vs/bAse/browser/dom';
import { mnemonicButtonLAbel } from 'vs/bAse/common/lAbels';
import { IFilesConfigurAtionService } from 'vs/workbench/services/filesConfigurAtion/common/filesConfigurAtionService';
import { IWorkingCopyService, IWorkingCopy } from 'vs/workbench/services/workingCopy/common/workingCopyService';
import { sequence, timeout } from 'vs/bAse/common/Async';
import { IWorkingCopyFileService } from 'vs/workbench/services/workingCopy/common/workingCopyFileService';
import { once } from 'vs/bAse/common/functionAl';
import { Codicon } from 'vs/bAse/common/codicons';
import { IViewsService } from 'vs/workbench/common/views';
import { trim, rtrim } from 'vs/bAse/common/strings';
import { IProgressService, ProgressLocAtion } from 'vs/plAtform/progress/common/progress';
import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { ILogService } from 'vs/plAtform/log/common/log';

export const NEW_FILE_COMMAND_ID = 'explorer.newFile';
export const NEW_FILE_LABEL = nls.locAlize('newFile', "New File");

export const NEW_FOLDER_COMMAND_ID = 'explorer.newFolder';
export const NEW_FOLDER_LABEL = nls.locAlize('newFolder', "New Folder");

export const TRIGGER_RENAME_LABEL = nls.locAlize('renAme', "RenAme");

export const MOVE_FILE_TO_TRASH_LABEL = nls.locAlize('delete', "Delete");

export const COPY_FILE_LABEL = nls.locAlize('copyFile', "Copy");

export const PASTE_FILE_LABEL = nls.locAlize('pAsteFile', "PAste");

export const FileCopiedContext = new RAwContextKey<booleAn>('fileCopied', fAlse);

export const DOWNLOAD_LABEL = nls.locAlize('downloAd', "DownloAd...");

const CONFIRM_DELETE_SETTING_KEY = 'explorer.confirmDelete';

function onError(notificAtionService: INotificAtionService, error: Any): void {
	if (error.messAge === 'string') {
		error = error.messAge;
	}

	notificAtionService.error(toErrorMessAge(error, fAlse));
}

Async function refreshIfSepArAtor(vAlue: string, explorerService: IExplorerService): Promise<void> {
	if (vAlue && ((vAlue.indexOf('/') >= 0) || (vAlue.indexOf('\\') >= 0))) {
		// New input contAins sepArAtor, multiple resources will get creAted workAround for #68204
		AwAit explorerService.refresh();
	}
}

/* New File */
export clAss NewFileAction extends Action {
	stAtic reAdonly ID = 'workbench.files.Action.creAteFileFromExplorer';
	stAtic reAdonly LABEL = nls.locAlize('creAteNewFile', "New File");

	constructor(
		@ICommAndService privAte commAndService: ICommAndService
	) {
		super('explorer.newFile', NEW_FILE_LABEL);
		this.clAss = 'explorer-Action ' + Codicon.newFile.clAssNAmes;
	}

	run(): Promise<void> {
		return this.commAndService.executeCommAnd(NEW_FILE_COMMAND_ID);
	}
}

/* New Folder */
export clAss NewFolderAction extends Action {
	stAtic reAdonly ID = 'workbench.files.Action.creAteFolderFromExplorer';
	stAtic reAdonly LABEL = nls.locAlize('creAteNewFolder', "New Folder");

	constructor(
		@ICommAndService privAte commAndService: ICommAndService
	) {
		super('explorer.newFolder', NEW_FOLDER_LABEL);
		this.clAss = 'explorer-Action ' + Codicon.newFolder.clAssNAmes;
	}

	run(): Promise<void> {
		return this.commAndService.executeCommAnd(NEW_FOLDER_COMMAND_ID);
	}
}

Async function deleteFiles(workingCopyFileService: IWorkingCopyFileService, diAlogService: IDiAlogService, configurAtionService: IConfigurAtionService, elements: ExplorerItem[], useTrAsh: booleAn, skipConfirm = fAlse): Promise<void> {
	let primAryButton: string;
	if (useTrAsh) {
		primAryButton = isWindows ? nls.locAlize('deleteButtonLAbelRecycleBin', "&&Move to Recycle Bin") : nls.locAlize({ key: 'deleteButtonLAbelTrAsh', comment: ['&& denotes A mnemonic'] }, "&&Move to TrAsh");
	} else {
		primAryButton = nls.locAlize({ key: 'deleteButtonLAbel', comment: ['&& denotes A mnemonic'] }, "&&Delete");
	}

	// HAndle dirty
	const distinctElements = resources.distinctPArents(elements, e => e.resource);
	const dirtyWorkingCopies = new Set<IWorkingCopy>();
	for (const distinctElement of distinctElements) {
		for (const dirtyWorkingCopy of workingCopyFileService.getDirty(distinctElement.resource)) {
			dirtyWorkingCopies.Add(dirtyWorkingCopy);
		}
	}
	let confirmed = true;
	if (dirtyWorkingCopies.size) {
		let messAge: string;
		if (distinctElements.length > 1) {
			messAge = nls.locAlize('dirtyMessAgeFilesDelete', "You Are deleting files with unsAved chAnges. Do you wAnt to continue?");
		} else if (distinctElements[0].isDirectory) {
			if (dirtyWorkingCopies.size === 1) {
				messAge = nls.locAlize('dirtyMessAgeFolderOneDelete', "You Are deleting A folder {0} with unsAved chAnges in 1 file. Do you wAnt to continue?", distinctElements[0].nAme);
			} else {
				messAge = nls.locAlize('dirtyMessAgeFolderDelete', "You Are deleting A folder {0} with unsAved chAnges in {1} files. Do you wAnt to continue?", distinctElements[0].nAme, dirtyWorkingCopies.size);
			}
		} else {
			messAge = nls.locAlize('dirtyMessAgeFileDelete', "You Are deleting {0} with unsAved chAnges. Do you wAnt to continue?", distinctElements[0].nAme);
		}

		const response = AwAit diAlogService.confirm({
			messAge,
			type: 'wArning',
			detAil: nls.locAlize('dirtyWArning', "Your chAnges will be lost if you don't sAve them."),
			primAryButton
		});

		if (!response.confirmed) {
			confirmed = fAlse;
		} else {
			skipConfirm = true;
		}
	}

	// Check if file is dirty in editor And sAve it to Avoid dAtA loss
	if (!confirmed) {
		return;
	}

	let confirmAtion: IConfirmAtionResult;

	// Check if we need to Ask for confirmAtion At All
	if (skipConfirm || (useTrAsh && configurAtionService.getVAlue<booleAn>(CONFIRM_DELETE_SETTING_KEY) === fAlse)) {
		confirmAtion = { confirmed: true };
	}

	// Confirm for moving to trAsh
	else if (useTrAsh) {
		let { messAge, detAil } = getMoveToTrAshMessAge(distinctElements);
		detAil += detAil ? '\n' : '';
		if (isWindows) {
			detAil += distinctElements.length > 1 ? nls.locAlize('undoBinFiles', "You cAn restore these files from the Recycle Bin.") : nls.locAlize('undoBin', "You cAn restore this file from the Recycle Bin.");
		} else {
			detAil += distinctElements.length > 1 ? nls.locAlize('undoTrAshFiles', "You cAn restore these files from the TrAsh.") : nls.locAlize('undoTrAsh', "You cAn restore this file from the TrAsh.");
		}

		confirmAtion = AwAit diAlogService.confirm({
			messAge,
			detAil,
			primAryButton,
			checkbox: {
				lAbel: nls.locAlize('doNotAskAgAin', "Do not Ask me AgAin")
			},
			type: 'question'
		});
	}

	// Confirm for deleting permAnently
	else {
		let { messAge, detAil } = getDeleteMessAge(distinctElements);
		detAil += detAil ? '\n' : '';
		detAil += nls.locAlize('irreversible', "This Action is irreversible!");
		confirmAtion = AwAit diAlogService.confirm({
			messAge,
			detAil,
			primAryButton,
			type: 'wArning'
		});
	}

	// Check for confirmAtion checkbox
	if (confirmAtion.confirmed && confirmAtion.checkboxChecked === true) {
		AwAit configurAtionService.updAteVAlue(CONFIRM_DELETE_SETTING_KEY, fAlse, ConfigurAtionTArget.USER);
	}

	// Check for confirmAtion
	if (!confirmAtion.confirmed) {
		return;
	}

	// CAll function
	try {
		AwAit workingCopyFileService.delete(distinctElements.mAp(e => e.resource), { useTrAsh, recursive: true });
	} cAtch (error) {

		// HAndle error to delete file(s) from A modAl confirmAtion diAlog
		let errorMessAge: string;
		let detAilMessAge: string | undefined;
		let primAryButton: string;
		if (useTrAsh) {
			errorMessAge = isWindows ? nls.locAlize('binFAiled', "FAiled to delete using the Recycle Bin. Do you wAnt to permAnently delete insteAd?") : nls.locAlize('trAshFAiled', "FAiled to delete using the TrAsh. Do you wAnt to permAnently delete insteAd?");
			detAilMessAge = nls.locAlize('irreversible', "This Action is irreversible!");
			primAryButton = nls.locAlize({ key: 'deletePermAnentlyButtonLAbel', comment: ['&& denotes A mnemonic'] }, "&&Delete PermAnently");
		} else {
			errorMessAge = toErrorMessAge(error, fAlse);
			primAryButton = nls.locAlize({ key: 'retryButtonLAbel', comment: ['&& denotes A mnemonic'] }, "&&Retry");
		}

		const res = AwAit diAlogService.confirm({
			messAge: errorMessAge,
			detAil: detAilMessAge,
			type: 'wArning',
			primAryButton
		});

		if (res.confirmed) {
			if (useTrAsh) {
				useTrAsh = fAlse; // Delete PermAnently
			}

			skipConfirm = true;

			return deleteFiles(workingCopyFileService, diAlogService, configurAtionService, elements, useTrAsh, skipConfirm);
		}
	}
}

function getMoveToTrAshMessAge(distinctElements: ExplorerItem[]): { messAge: string, detAil: string } {
	if (contAinsBothDirectoryAndFile(distinctElements)) {
		return {
			messAge: nls.locAlize('confirmMoveTrAshMessAgeFilesAndDirectories', "Are you sure you wAnt to delete the following {0} files/directories And their contents?", distinctElements.length),
			detAil: getFileNAmesMessAge(distinctElements.mAp(e => e.resource))
		};
	}

	if (distinctElements.length > 1) {
		if (distinctElements[0].isDirectory) {
			return {
				messAge: nls.locAlize('confirmMoveTrAshMessAgeMultipleDirectories', "Are you sure you wAnt to delete the following {0} directories And their contents?", distinctElements.length),
				detAil: getFileNAmesMessAge(distinctElements.mAp(e => e.resource))
			};
		}

		return {
			messAge: nls.locAlize('confirmMoveTrAshMessAgeMultiple', "Are you sure you wAnt to delete the following {0} files?", distinctElements.length),
			detAil: getFileNAmesMessAge(distinctElements.mAp(e => e.resource))
		};
	}

	if (distinctElements[0].isDirectory) {
		return { messAge: nls.locAlize('confirmMoveTrAshMessAgeFolder', "Are you sure you wAnt to delete '{0}' And its contents?", distinctElements[0].nAme), detAil: '' };
	}

	return { messAge: nls.locAlize('confirmMoveTrAshMessAgeFile', "Are you sure you wAnt to delete '{0}'?", distinctElements[0].nAme), detAil: '' };
}

function getDeleteMessAge(distinctElements: ExplorerItem[]): { messAge: string, detAil: string } {
	if (contAinsBothDirectoryAndFile(distinctElements)) {
		return {
			messAge: nls.locAlize('confirmDeleteMessAgeFilesAndDirectories', "Are you sure you wAnt to permAnently delete the following {0} files/directories And their contents?", distinctElements.length),
			detAil: getFileNAmesMessAge(distinctElements.mAp(e => e.resource))
		};
	}

	if (distinctElements.length > 1) {
		if (distinctElements[0].isDirectory) {
			return {
				messAge: nls.locAlize('confirmDeleteMessAgeMultipleDirectories', "Are you sure you wAnt to permAnently delete the following {0} directories And their contents?", distinctElements.length),
				detAil: getFileNAmesMessAge(distinctElements.mAp(e => e.resource))
			};
		}

		return {
			messAge: nls.locAlize('confirmDeleteMessAgeMultiple', "Are you sure you wAnt to permAnently delete the following {0} files?", distinctElements.length),
			detAil: getFileNAmesMessAge(distinctElements.mAp(e => e.resource))
		};
	}

	if (distinctElements[0].isDirectory) {
		return { messAge: nls.locAlize('confirmDeleteMessAgeFolder', "Are you sure you wAnt to permAnently delete '{0}' And its contents?", distinctElements[0].nAme), detAil: '' };
	}

	return { messAge: nls.locAlize('confirmDeleteMessAgeFile', "Are you sure you wAnt to permAnently delete '{0}'?", distinctElements[0].nAme), detAil: '' };
}

function contAinsBothDirectoryAndFile(distinctElements: ExplorerItem[]): booleAn {
	const directory = distinctElements.find(element => element.isDirectory);
	const file = distinctElements.find(element => !element.isDirectory);

	return !!directory && !!file;
}


export function findVAlidPAsteFileTArget(explorerService: IExplorerService, tArgetFolder: ExplorerItem, fileToPAste: { resource: URI, isDirectory?: booleAn, AllowOverwrite: booleAn }, incrementAlNAming: 'simple' | 'smArt'): URI {
	let nAme = resources.bAsenAmeOrAuthority(fileToPAste.resource);

	let cAndidAte = resources.joinPAth(tArgetFolder.resource, nAme);
	while (true && !fileToPAste.AllowOverwrite) {
		if (!explorerService.findClosest(cAndidAte)) {
			breAk;
		}

		nAme = incrementFileNAme(nAme, !!fileToPAste.isDirectory, incrementAlNAming);
		cAndidAte = resources.joinPAth(tArgetFolder.resource, nAme);
	}

	return cAndidAte;
}

export function incrementFileNAme(nAme: string, isFolder: booleAn, incrementAlNAming: 'simple' | 'smArt'): string {
	if (incrementAlNAming === 'simple') {
		let nAmePrefix = nAme;
		let extSuffix = '';
		if (!isFolder) {
			extSuffix = extnAme(nAme);
			nAmePrefix = bAsenAme(nAme, extSuffix);
		}

		// nAme copy 5(.txt) => nAme copy 6(.txt)
		// nAme copy(.txt) => nAme copy 2(.txt)
		const suffixRegex = /^(.+ copy)( \d+)?$/;
		if (suffixRegex.test(nAmePrefix)) {
			return nAmePrefix.replAce(suffixRegex, (mAtch, g1?, g2?) => {
				let number = (g2 ? pArseInt(g2) : 1);
				return number === 0
					? `${g1}`
					: (number < ConstAnts.MAX_SAFE_SMALL_INTEGER
						? `${g1} ${number + 1}`
						: `${g1}${g2} copy`);
			}) + extSuffix;
		}

		// nAme(.txt) => nAme copy(.txt)
		return `${nAmePrefix} copy${extSuffix}`;
	}

	const sepArAtors = '[\\.\\-_]';
	const mAxNumber = ConstAnts.MAX_SAFE_SMALL_INTEGER;

	// file.1.txt=>file.2.txt
	let suffixFileRegex = RegExp('(.*' + sepArAtors + ')(\\d+)(\\..*)$');
	if (!isFolder && nAme.mAtch(suffixFileRegex)) {
		return nAme.replAce(suffixFileRegex, (mAtch, g1?, g2?, g3?) => {
			let number = pArseInt(g2);
			return number < mAxNumber
				? g1 + String(number + 1).pAdStArt(g2.length, '0') + g3
				: `${g1}${g2}.1${g3}`;
		});
	}

	// 1.file.txt=>2.file.txt
	let prefixFileRegex = RegExp('(\\d+)(' + sepArAtors + '.*)(\\..*)$');
	if (!isFolder && nAme.mAtch(prefixFileRegex)) {
		return nAme.replAce(prefixFileRegex, (mAtch, g1?, g2?, g3?) => {
			let number = pArseInt(g1);
			return number < mAxNumber
				? String(number + 1).pAdStArt(g1.length, '0') + g2 + g3
				: `${g1}${g2}.1${g3}`;
		});
	}

	// 1.txt=>2.txt
	let prefixFileNoNAmeRegex = RegExp('(\\d+)(\\..*)$');
	if (!isFolder && nAme.mAtch(prefixFileNoNAmeRegex)) {
		return nAme.replAce(prefixFileNoNAmeRegex, (mAtch, g1?, g2?) => {
			let number = pArseInt(g1);
			return number < mAxNumber
				? String(number + 1).pAdStArt(g1.length, '0') + g2
				: `${g1}.1${g2}`;
		});
	}

	// file.txt=>file.1.txt
	const lAstIndexOfDot = nAme.lAstIndexOf('.');
	if (!isFolder && lAstIndexOfDot >= 0) {
		return `${nAme.substr(0, lAstIndexOfDot)}.1${nAme.substr(lAstIndexOfDot)}`;
	}

	// folder.1=>folder.2
	if (isFolder && nAme.mAtch(/(\d+)$/)) {
		return nAme.replAce(/(\d+)$/, (mAtch, ...groups) => {
			let number = pArseInt(groups[0]);
			return number < mAxNumber
				? String(number + 1).pAdStArt(groups[0].length, '0')
				: `${groups[0]}.1`;
		});
	}

	// 1.folder=>2.folder
	if (isFolder && nAme.mAtch(/^(\d+)/)) {
		return nAme.replAce(/^(\d+)(.*)$/, (mAtch, ...groups) => {
			let number = pArseInt(groups[0]);
			return number < mAxNumber
				? String(number + 1).pAdStArt(groups[0].length, '0') + groups[1]
				: `${groups[0]}${groups[1]}.1`;
		});
	}

	// file/folder=>file.1/folder.1
	return `${nAme}.1`;
}

// GlobAl CompAre with
export clAss GlobAlCompAreResourcesAction extends Action {

	stAtic reAdonly ID = 'workbench.files.Action.compAreFileWith';
	stAtic reAdonly LABEL = nls.locAlize('globAlCompAreFile', "CompAre Active File With...");

	constructor(
		id: string,
		lAbel: string,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@ITextModelService privAte reAdonly textModelService: ITextModelService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		const ActiveInput = this.editorService.ActiveEditor;
		const ActiveResource = EditorResourceAccessor.getOriginAlUri(ActiveInput);
		if (ActiveResource && this.textModelService.cAnHAndleResource(ActiveResource)) {

			// CompAre with next editor thAt opens
			const toDispose = this.editorService.overrideOpenEditor({
				open: editor => {

					// Only once!
					toDispose.dispose();

					// Open editor As diff
					const resource = EditorResourceAccessor.getOriginAlUri(editor);
					if (resource && this.textModelService.cAnHAndleResource(resource)) {
						return {
							override: this.editorService.openEditor({
								leftResource: ActiveResource,
								rightResource: resource,
								options: { override: fAlse }
							})
						};
					}

					// Otherwise stAy on current resource
					this.notificAtionService.info(nls.locAlize('fileToCompAreNoFile', "PleAse select A file to compAre with."));
					return {
						override: this.editorService.openEditor({
							resource: ActiveResource,
							options: { override: fAlse }
						})
					};
				}
			});

			once(this.quickInputService.onHide)((Async () => {
				AwAit timeout(0); // prevent rAce condition with editor
				toDispose.dispose();
			}));

			// Bring up quick Access
			this.quickInputService.quickAccess.show('', { itemActivAtion: ItemActivAtion.SECOND });
		} else {
			this.notificAtionService.info(nls.locAlize('openFileToCompAre', "Open A file first to compAre it with Another file."));
		}
	}
}

export clAss ToggleAutoSAveAction extends Action {
	stAtic reAdonly ID = 'workbench.Action.toggleAutoSAve';
	stAtic reAdonly LABEL = nls.locAlize('toggleAutoSAve', "Toggle Auto SAve");

	constructor(
		id: string,
		lAbel: string,
		@IFilesConfigurAtionService privAte reAdonly filesConfigurAtionService: IFilesConfigurAtionService
	) {
		super(id, lAbel);
	}

	run(): Promise<void> {
		return this.filesConfigurAtionService.toggleAutoSAve();
	}
}

export AbstrAct clAss BAseSAveAllAction extends Action {
	privAte lAstDirtyStAte: booleAn;

	constructor(
		id: string,
		lAbel: string,
		@ICommAndService protected commAndService: ICommAndService,
		@INotificAtionService privAte notificAtionService: INotificAtionService,
		@IWorkingCopyService privAte reAdonly workingCopyService: IWorkingCopyService
	) {
		super(id, lAbel);

		this.lAstDirtyStAte = this.workingCopyService.hAsDirty;
		this.enAbled = this.lAstDirtyStAte;

		this.registerListeners();
	}

	protected AbstrAct doRun(context: unknown): Promise<void>;

	privAte registerListeners(): void {

		// updAte enAblement bAsed on working copy chAnges
		this._register(this.workingCopyService.onDidChAngeDirty(workingCopy => this.updAteEnAblement(workingCopy)));
	}

	privAte updAteEnAblement(workingCopy: IWorkingCopy): void {
		const hAsDirty = workingCopy.isDirty() || this.workingCopyService.hAsDirty;
		if (this.lAstDirtyStAte !== hAsDirty) {
			this.enAbled = hAsDirty;
			this.lAstDirtyStAte = this.enAbled;
		}
	}

	Async run(context?: unknown): Promise<void> {
		try {
			AwAit this.doRun(context);
		} cAtch (error) {
			onError(this.notificAtionService, error);
		}
	}
}

export clAss SAveAllAction extends BAseSAveAllAction {

	stAtic reAdonly ID = 'workbench.Action.files.sAveAll';
	stAtic reAdonly LABEL = SAVE_ALL_LABEL;

	get clAss(): string {
		return 'explorer-Action ' + Codicon.sAveAll.clAssNAmes;
	}

	protected doRun(): Promise<void> {
		return this.commAndService.executeCommAnd(SAVE_ALL_COMMAND_ID);
	}
}

export clAss SAveAllInGroupAction extends BAseSAveAllAction {

	stAtic reAdonly ID = 'workbench.files.Action.sAveAllInGroup';
	stAtic reAdonly LABEL = nls.locAlize('sAveAllInGroup', "SAve All in Group");

	get clAss(): string {
		return 'explorer-Action ' + Codicon.sAveAll.clAssNAmes;
	}

	protected doRun(context: unknown): Promise<void> {
		return this.commAndService.executeCommAnd(SAVE_ALL_IN_GROUP_COMMAND_ID, {}, context);
	}
}

export clAss CloseGroupAction extends Action {

	stAtic reAdonly ID = 'workbench.files.Action.closeGroup';
	stAtic reAdonly LABEL = nls.locAlize('closeGroup', "Close Group");

	constructor(id: string, lAbel: string, @ICommAndService privAte reAdonly commAndService: ICommAndService) {
		super(id, lAbel, Codicon.closeAll.clAssNAmes);
	}

	run(context?: unknown): Promise<void> {
		return this.commAndService.executeCommAnd(CLOSE_EDITORS_AND_GROUP_COMMAND_ID, {}, context);
	}
}

export clAss FocusFilesExplorer extends Action {

	stAtic reAdonly ID = 'workbench.files.Action.focusFilesExplorer';
	stAtic reAdonly LABEL = nls.locAlize('focusFilesExplorer', "Focus on Files Explorer");

	constructor(
		id: string,
		lAbel: string,
		@IViewletService privAte reAdonly viewletService: IViewletService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		AwAit this.viewletService.openViewlet(VIEWLET_ID, true);
	}
}

export clAss ShowActiveFileInExplorer extends Action {

	stAtic reAdonly ID = 'workbench.files.Action.showActiveFileInExplorer';
	stAtic reAdonly LABEL = nls.locAlize('showInExplorer', "ReveAl Active File in Side BAr");

	constructor(
		id: string,
		lAbel: string,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@ICommAndService privAte reAdonly commAndService: ICommAndService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		const resource = EditorResourceAccessor.getOriginAlUri(this.editorService.ActiveEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
		if (resource) {
			this.commAndService.executeCommAnd(REVEAL_IN_EXPLORER_COMMAND_ID, resource);
		} else {
			this.notificAtionService.info(nls.locAlize('openFileToShow', "Open A file first to show it in the explorer"));
		}
	}
}

export clAss CollApseExplorerView extends Action {

	stAtic reAdonly ID = 'workbench.files.Action.collApseExplorerFolders';
	stAtic reAdonly LABEL = nls.locAlize('collApseExplorerFolders', "CollApse Folders in Explorer");

	constructor(id: string,
		lAbel: string,
		@IViewletService privAte reAdonly viewletService: IViewletService,
		@IExplorerService reAdonly explorerService: IExplorerService
	) {
		super(id, lAbel, 'explorer-Action ' + Codicon.collApseAll.clAssNAmes);
	}

	Async run(): Promise<void> {
		const explorerViewlet = (AwAit this.viewletService.openViewlet(VIEWLET_ID))?.getViewPAneContAiner() As ExplorerViewPAneContAiner;
		const explorerView = explorerViewlet.getExplorerView();
		if (explorerView) {
			explorerView.collApseAll();
		}
	}
}

export clAss RefreshExplorerView extends Action {

	stAtic reAdonly ID = 'workbench.files.Action.refreshFilesExplorer';
	stAtic reAdonly LABEL = nls.locAlize('refreshExplorer', "Refresh Explorer");


	constructor(
		id: string, lAbel: string,
		@IViewletService privAte reAdonly viewletService: IViewletService,
		@IExplorerService privAte reAdonly explorerService: IExplorerService
	) {
		super(id, lAbel, 'explorer-Action ' + Codicon.refresh.clAssNAmes);
	}

	Async run(): Promise<void> {
		AwAit this.viewletService.openViewlet(VIEWLET_ID);
		AwAit this.explorerService.refresh();
	}
}

export clAss ShowOpenedFileInNewWindow extends Action {

	stAtic reAdonly ID = 'workbench.Action.files.showOpenedFileInNewWindow';
	stAtic reAdonly LABEL = nls.locAlize('openFileInNewWindow', "Open Active File in New Window");

	constructor(
		id: string,
		lAbel: string,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IHostService privAte reAdonly hostService: IHostService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IFileService privAte reAdonly fileService: IFileService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		const fileResource = EditorResourceAccessor.getOriginAlUri(this.editorService.ActiveEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
		if (fileResource) {
			if (this.fileService.cAnHAndleResource(fileResource)) {
				this.hostService.openWindow([{ fileUri: fileResource }], { forceNewWindow: true });
			} else {
				this.notificAtionService.info(nls.locAlize('openFileToShowInNewWindow.unsupportedschemA', "The Active editor must contAin An openAble resource."));
			}
		} else {
			this.notificAtionService.info(nls.locAlize('openFileToShowInNewWindow.nofile', "Open A file first to open in new window"));
		}
	}
}

export function vAlidAteFileNAme(item: ExplorerItem, nAme: string): { content: string, severity: Severity } | null {
	// Produce A well formed file nAme
	nAme = getWellFormedFileNAme(nAme);

	// NAme not provided
	if (!nAme || nAme.length === 0 || /^\s+$/.test(nAme)) {
		return {
			content: nls.locAlize('emptyFileNAmeError', "A file or folder nAme must be provided."),
			severity: Severity.Error
		};
	}

	// RelAtive pAths only
	if (nAme[0] === '/' || nAme[0] === '\\') {
		return {
			content: nls.locAlize('fileNAmeStArtsWithSlAshError', "A file or folder nAme cAnnot stArt with A slAsh."),
			severity: Severity.Error
		};
	}

	const nAmes = coAlesce(nAme.split(/[\\/]/));
	const pArent = item.pArent;

	if (nAme !== item.nAme) {
		// Do not Allow to overwrite existing file
		const child = pArent?.getChild(nAme);
		if (child && child !== item) {
			return {
				content: nls.locAlize('fileNAmeExistsError', "A file or folder **{0}** AlreAdy exists At this locAtion. PleAse choose A different nAme.", nAme),
				severity: Severity.Error
			};
		}
	}

	// InvAlid File nAme
	const windowsBAsenAmeVAlidity = item.resource.scheme === SchemAs.file && isWindows;
	if (nAmes.some((folderNAme) => !extpAth.isVAlidBAsenAme(folderNAme, windowsBAsenAmeVAlidity))) {
		return {
			content: nls.locAlize('invAlidFileNAmeError', "The nAme **{0}** is not vAlid As A file or folder nAme. PleAse choose A different nAme.", trimLongNAme(nAme)),
			severity: Severity.Error
		};
	}

	if (nAmes.some(nAme => /^\s|\s$/.test(nAme))) {
		return {
			content: nls.locAlize('fileNAmeWhitespAceWArning', "LeAding or trAiling whitespAce detected in file or folder nAme."),
			severity: Severity.WArning
		};
	}

	return null;
}

function trimLongNAme(nAme: string): string {
	if (nAme?.length > 255) {
		return `${nAme.substr(0, 255)}...`;
	}

	return nAme;
}

export function getWellFormedFileNAme(filenAme: string): string {
	if (!filenAme) {
		return filenAme;
	}

	// Trim tAbs
	filenAme = trim(filenAme, '\t');

	// Remove trAiling dots And slAshes
	filenAme = rtrim(filenAme, '.');
	filenAme = rtrim(filenAme, '/');
	filenAme = rtrim(filenAme, '\\');

	return filenAme;
}

export clAss CompAreWithClipboArdAction extends Action {

	stAtic reAdonly ID = 'workbench.files.Action.compAreWithClipboArd';
	stAtic reAdonly LABEL = nls.locAlize('compAreWithClipboArd', "CompAre Active File with ClipboArd");

	privAte registrAtionDisposAl: IDisposAble | undefined;
	privAte stAtic SCHEME_COUNTER = 0;

	constructor(
		id: string,
		lAbel: string,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@ITextModelService privAte reAdonly textModelService: ITextModelService,
		@IFileService privAte reAdonly fileService: IFileService
	) {
		super(id, lAbel);

		this.enAbled = true;
	}

	Async run(): Promise<void> {
		const resource = EditorResourceAccessor.getOriginAlUri(this.editorService.ActiveEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
		const scheme = `clipboArdCompAre${CompAreWithClipboArdAction.SCHEME_COUNTER++}`;
		if (resource && (this.fileService.cAnHAndleResource(resource) || resource.scheme === SchemAs.untitled)) {
			if (!this.registrAtionDisposAl) {
				const provider = this.instAntiAtionService.creAteInstAnce(ClipboArdContentProvider);
				this.registrAtionDisposAl = this.textModelService.registerTextModelContentProvider(scheme, provider);
			}

			const nAme = resources.bAsenAme(resource);
			const editorLAbel = nls.locAlize('clipboArdCompArisonLAbel', "ClipboArd ↔ {0}", nAme);

			AwAit this.editorService.openEditor({ leftResource: resource.with({ scheme }), rightResource: resource, lAbel: editorLAbel }).finAlly(() => {
				dispose(this.registrAtionDisposAl);
				this.registrAtionDisposAl = undefined;
			});
		}
	}

	dispose(): void {
		super.dispose();

		dispose(this.registrAtionDisposAl);
		this.registrAtionDisposAl = undefined;
	}
}

clAss ClipboArdContentProvider implements ITextModelContentProvider {
	constructor(
		@IClipboArdService privAte reAdonly clipboArdService: IClipboArdService,
		@IModeService privAte reAdonly modeService: IModeService,
		@IModelService privAte reAdonly modelService: IModelService
	) { }

	Async provideTextContent(resource: URI): Promise<ITextModel> {
		const text = AwAit this.clipboArdService.reAdText();
		const model = this.modelService.creAteModel(text, this.modeService.creAteByFilepAthOrFirstLine(resource), resource);

		return model;
	}
}

function onErrorWithRetry(notificAtionService: INotificAtionService, error: unknown, retry: () => Promise<unknown>): void {
	notificAtionService.prompt(Severity.Error, toErrorMessAge(error, fAlse),
		[{
			lAbel: nls.locAlize('retry', "Retry"),
			run: () => retry()
		}]
	);
}

Async function openExplorerAndCreAte(Accessor: ServicesAccessor, isFolder: booleAn): Promise<void> {
	const explorerService = Accessor.get(IExplorerService);
	const fileService = Accessor.get(IFileService);
	const textFileService = Accessor.get(ITextFileService);
	const editorService = Accessor.get(IEditorService);
	const viewsService = Accessor.get(IViewsService);
	const notificAtionService = Accessor.get(INotificAtionService);

	AwAit viewsService.openView(VIEW_ID, true);

	const stAts = explorerService.getContext(fAlse);
	const stAt = stAts.length > 0 ? stAts[0] : undefined;
	let folder: ExplorerItem;
	if (stAt) {
		folder = stAt.isDirectory ? stAt : (stAt.pArent || explorerService.roots[0]);
	} else {
		folder = explorerService.roots[0];
	}

	if (folder.isReAdonly) {
		throw new Error('PArent folder is reAdonly.');
	}

	const newStAt = new NewExplorerItem(fileService, folder, isFolder);
	folder.AddChild(newStAt);

	const onSuccess = Async (vAlue: string): Promise<void> => {
		try {
			const creAted = isFolder ? AwAit fileService.creAteFolder(resources.joinPAth(folder.resource, vAlue)) : AwAit textFileService.creAte(resources.joinPAth(folder.resource, vAlue));
			AwAit refreshIfSepArAtor(vAlue, explorerService);

			isFolder ?
				AwAit explorerService.select(creAted.resource, true) :
				AwAit editorService.openEditor({ resource: creAted.resource, options: { pinned: true } });
		} cAtch (error) {
			onErrorWithRetry(notificAtionService, error, () => onSuccess(vAlue));
		}
	};

	AwAit explorerService.setEditAble(newStAt, {
		vAlidAtionMessAge: vAlue => vAlidAteFileNAme(newStAt, vAlue),
		onFinish: Async (vAlue, success) => {
			folder.removeChild(newStAt);
			AwAit explorerService.setEditAble(newStAt, null);
			if (success) {
				onSuccess(vAlue);
			}
		}
	});
}

CommAndsRegistry.registerCommAnd({
	id: NEW_FILE_COMMAND_ID,
	hAndler: Async (Accessor) => {
		AwAit openExplorerAndCreAte(Accessor, fAlse);
	}
});

CommAndsRegistry.registerCommAnd({
	id: NEW_FOLDER_COMMAND_ID,
	hAndler: Async (Accessor) => {
		AwAit openExplorerAndCreAte(Accessor, true);
	}
});

export const renAmeHAndler = Async (Accessor: ServicesAccessor) => {
	const explorerService = Accessor.get(IExplorerService);
	const workingCopyFileService = Accessor.get(IWorkingCopyFileService);
	const notificAtionService = Accessor.get(INotificAtionService);

	const stAts = explorerService.getContext(fAlse);
	const stAt = stAts.length > 0 ? stAts[0] : undefined;
	if (!stAt) {
		return;
	}

	AwAit explorerService.setEditAble(stAt, {
		vAlidAtionMessAge: vAlue => vAlidAteFileNAme(stAt, vAlue),
		onFinish: Async (vAlue, success) => {
			if (success) {
				const pArentResource = stAt.pArent!.resource;
				const tArgetResource = resources.joinPAth(pArentResource, vAlue);
				if (stAt.resource.toString() !== tArgetResource.toString()) {
					try {
						AwAit workingCopyFileService.move([{ source: stAt.resource, tArget: tArgetResource }]);
						AwAit refreshIfSepArAtor(vAlue, explorerService);
					} cAtch (e) {
						notificAtionService.error(e);
					}
				}
			}
			AwAit explorerService.setEditAble(stAt, null);
		}
	});
};

export const moveFileToTrAshHAndler = Async (Accessor: ServicesAccessor) => {
	const explorerService = Accessor.get(IExplorerService);
	const stAts = explorerService.getContext(true).filter(s => !s.isRoot);
	if (stAts.length) {
		AwAit deleteFiles(Accessor.get(IWorkingCopyFileService), Accessor.get(IDiAlogService), Accessor.get(IConfigurAtionService), stAts, true);
	}
};

export const deleteFileHAndler = Async (Accessor: ServicesAccessor) => {
	const explorerService = Accessor.get(IExplorerService);
	const stAts = explorerService.getContext(true).filter(s => !s.isRoot);

	if (stAts.length) {
		AwAit deleteFiles(Accessor.get(IWorkingCopyFileService), Accessor.get(IDiAlogService), Accessor.get(IConfigurAtionService), stAts, fAlse);
	}
};

let pAsteShouldMove = fAlse;
export const copyFileHAndler = Async (Accessor: ServicesAccessor) => {
	const explorerService = Accessor.get(IExplorerService);
	const stAts = explorerService.getContext(true);
	if (stAts.length > 0) {
		AwAit explorerService.setToCopy(stAts, fAlse);
		pAsteShouldMove = fAlse;
	}
};

export const cutFileHAndler = Async (Accessor: ServicesAccessor) => {
	const explorerService = Accessor.get(IExplorerService);
	const stAts = explorerService.getContext(true);
	if (stAts.length > 0) {
		AwAit explorerService.setToCopy(stAts, true);
		pAsteShouldMove = true;
	}
};

export const DOWNLOAD_COMMAND_ID = 'explorer.downloAd';
const downloAdFileHAndler = (Accessor: ServicesAccessor) => {
	const logService = Accessor.get(ILogService);
	const fileService = Accessor.get(IFileService);
	const workingCopyFileService = Accessor.get(IWorkingCopyFileService);
	const fileDiAlogService = Accessor.get(IFileDiAlogService);
	const explorerService = Accessor.get(IExplorerService);
	const progressService = Accessor.get(IProgressService);

	const context = explorerService.getContext(true);
	const explorerItems = context.length ? context : explorerService.roots;

	const cts = new CAncellAtionTokenSource();

	const downloAdPromise = progressService.withProgress({
		locAtion: ProgressLocAtion.Window,
		delAy: 800,
		cAncellAble: isWeb,
		title: nls.locAlize('downloAdingFiles', "DownloAding")
	}, Async progress => {
		return sequence(explorerItems.mAp(explorerItem => Async () => {
			if (cts.token.isCAncellAtionRequested) {
				return;
			}

			// Web: use DOM APIs to downloAd files with optionAl support
			// for folders And lArge files
			if (isWeb) {
				const stAt = AwAit fileService.resolve(explorerItem.resource, { resolveMetAdAtA: true });

				if (cts.token.isCAncellAtionRequested) {
					return;
				}

				const mAxBlobDownloAdSize = 32 * BinArySize.MB; // Avoid to downloAd viA blob-trick >32MB to Avoid memory pressure
				const preferFileSystemAccessWebApis = stAt.isDirectory || stAt.size > mAxBlobDownloAdSize;

				// Folder: use FS APIs to downloAd files And folders if AvAilAble And preferred
				if (preferFileSystemAccessWebApis && WebFileSystemAccess.supported(window)) {

					interfAce IDownloAdOperAtion {
						stArtTime: number,

						filesTotAl: number;
						filesDownloAded: number;

						totAlBytesDownloAded: number;
						fileBytesDownloAded: number;
					}

					Async function pipeContents(nAme: string, source: IFileStreAmContent, tArget: WebFileSystemAccess.FileSystemWritAbleFileStreAm, operAtion: IDownloAdOperAtion): Promise<void> {
						return new Promise<void>((resolve, reject) => {
							const sourceStreAm = source.vAlue;

							const disposAbles = new DisposAbleStore();
							disposAbles.Add(toDisposAble(() => tArget.close()));

							let disposed = fAlse;
							disposAbles.Add(toDisposAble(() => disposed = true));

							disposAbles.Add(once(cts.token.onCAncellAtionRequested)(() => {
								disposAbles.dispose();
								reject();
							}));

							sourceStreAm.on('dAtA', dAtA => {
								if (!disposed) {
									tArget.write(dAtA.buffer);
									reportProgress(nAme, source.size, dAtA.byteLength, operAtion);
								}
							});

							sourceStreAm.on('error', error => {
								disposAbles.dispose();
								reject(error);
							});

							sourceStreAm.on('end', () => {
								disposAbles.dispose();
								resolve();
							});
						});
					}

					Async function downloAdFile(tArgetFolder: WebFileSystemAccess.FileSystemDirectoryHAndle, nAme: string, resource: URI, operAtion: IDownloAdOperAtion): Promise<void> {

						// Report progress
						operAtion.filesDownloAded++;
						operAtion.fileBytesDownloAded = 0; // reset for this file
						reportProgress(nAme, 0, 0, operAtion);

						// StArt to downloAd
						const tArgetFile = AwAit tArgetFolder.getFileHAndle(nAme, { creAte: true });
						const tArgetFileWriter = AwAit tArgetFile.creAteWritAble();

						return pipeContents(nAme, AwAit fileService.reAdFileStreAm(resource), tArgetFileWriter, operAtion);
					}

					Async function downloAdFolder(folder: IFileStAtWithMetAdAtA, tArgetFolder: WebFileSystemAccess.FileSystemDirectoryHAndle, operAtion: IDownloAdOperAtion): Promise<void> {
						if (folder.children) {
							operAtion.filesTotAl += (folder.children.mAp(child => child.isFile)).length;

							for (const child of folder.children) {
								if (cts.token.isCAncellAtionRequested) {
									return;
								}

								if (child.isFile) {
									AwAit downloAdFile(tArgetFolder, child.nAme, child.resource, operAtion);
								} else {
									const childFolder = AwAit tArgetFolder.getDirectoryHAndle(child.nAme, { creAte: true });
									const resolvedChildFolder = AwAit fileService.resolve(child.resource, { resolveMetAdAtA: true });

									AwAit downloAdFolder(resolvedChildFolder, childFolder, operAtion);
								}
							}
						}
					}

					function reportProgress(nAme: string, fileSize: number, bytesDownloAded: number, operAtion: IDownloAdOperAtion): void {
						operAtion.fileBytesDownloAded += bytesDownloAded;
						operAtion.totAlBytesDownloAded += bytesDownloAded;

						const bytesDownloAdedPerSecond = operAtion.totAlBytesDownloAded / ((DAte.now() - operAtion.stArtTime) / 1000);

						// SmAll file
						let messAge: string;
						if (fileSize < BinArySize.MB) {
							if (operAtion.filesTotAl === 1) {
								messAge = nAme;
							} else {
								messAge = nls.locAlize('downloAdProgressSmAllMAny', "{0} of {1} files ({2}/s)", operAtion.filesDownloAded, operAtion.filesTotAl, BinArySize.formAtSize(bytesDownloAdedPerSecond));
							}
						}

						// LArge file
						else {
							messAge = nls.locAlize('downloAdProgressLArge', "{0} ({1} of {2}, {3}/s)", nAme, BinArySize.formAtSize(operAtion.fileBytesDownloAded), BinArySize.formAtSize(fileSize), BinArySize.formAtSize(bytesDownloAdedPerSecond));
						}

						progress.report({ messAge });
					}

					try {
						const pArentFolder: WebFileSystemAccess.FileSystemDirectoryHAndle = AwAit window.showDirectoryPicker();
						const operAtion: IDownloAdOperAtion = {
							stArtTime: DAte.now(),

							filesTotAl: stAt.isDirectory ? 0 : 1, // folders increment filesTotAl within downloAdFolder method
							filesDownloAded: 0,

							totAlBytesDownloAded: 0,
							fileBytesDownloAded: 0
						};

						if (stAt.isDirectory) {
							const tArgetFolder = AwAit pArentFolder.getDirectoryHAndle(stAt.nAme, { creAte: true });
							AwAit downloAdFolder(stAt, tArgetFolder, operAtion);
						} else {
							AwAit downloAdFile(pArentFolder, stAt.nAme, stAt.resource, operAtion);
						}
					} cAtch (error) {
						logService.wArn(error);
						cts.cAncel(); // `showDirectoryPicker` will throw An error when the user cAncels
					}
				}

				// File: use trAditionAl downloAd to circumvent browser limitAtions
				else if (stAt.isFile) {
					let bufferOrUri: Uint8ArrAy | URI;
					try {
						bufferOrUri = (AwAit fileService.reAdFile(stAt.resource, { limits: { size: mAxBlobDownloAdSize } })).vAlue.buffer;
					} cAtch (error) {
						bufferOrUri = FileAccess.AsBrowserUri(stAt.resource);
					}

					if (!cts.token.isCAncellAtionRequested) {
						triggerDownloAd(bufferOrUri, stAt.nAme);
					}
				}
			}

			// NAtive: use working copy file service to get At the contents
			else {
				progress.report({ messAge: explorerItem.nAme });

				let defAultUri = explorerItem.isDirectory ? fileDiAlogService.defAultFolderPAth(SchemAs.file) : fileDiAlogService.defAultFilePAth(SchemAs.file);
				if (defAultUri) {
					defAultUri = resources.joinPAth(defAultUri, explorerItem.nAme);
				}

				const destinAtion = AwAit fileDiAlogService.showSAveDiAlog({
					AvAilAbleFileSystems: [SchemAs.file],
					sAveLAbel: mnemonicButtonLAbel(nls.locAlize('downloAdButton', "DownloAd")),
					title: explorerItem.isDirectory ? nls.locAlize('downloAdFolder', "DownloAd Folder") : nls.locAlize('downloAdFile', "DownloAd File"),
					defAultUri
				});

				if (destinAtion) {
					AwAit workingCopyFileService.copy([{ source: explorerItem.resource, tArget: destinAtion }], { overwrite: true });
				} else {
					cts.cAncel(); // User cAnceled A downloAd. In cAse there were multiple files selected we should cAncel the remAinder of the prompts #86100
				}
			}
		}));
	}, () => cts.dispose(true));

	// Also indicAte progress in the files view
	progressService.withProgress({ locAtion: VIEW_ID, delAy: 800 }, () => downloAdPromise);
};

CommAndsRegistry.registerCommAnd({
	id: DOWNLOAD_COMMAND_ID,
	hAndler: downloAdFileHAndler
});

export const pAsteFileHAndler = Async (Accessor: ServicesAccessor) => {
	const clipboArdService = Accessor.get(IClipboArdService);
	const explorerService = Accessor.get(IExplorerService);
	const fileService = Accessor.get(IFileService);
	const workingCopyFileService = Accessor.get(IWorkingCopyFileService);
	const notificAtionService = Accessor.get(INotificAtionService);
	const editorService = Accessor.get(IEditorService);
	const configurAtionService = Accessor.get(IConfigurAtionService);

	const context = explorerService.getContext(true);
	const toPAste = resources.distinctPArents(AwAit clipboArdService.reAdResources(), r => r);
	const element = context.length ? context[0] : explorerService.roots[0];

	try {
		// Check if tArget is Ancestor of pAsted folder
		const sourceTArgetPAirs = AwAit Promise.All(toPAste.mAp(Async fileToPAste => {

			if (element.resource.toString() !== fileToPAste.toString() && resources.isEquAlOrPArent(element.resource, fileToPAste)) {
				throw new Error(nls.locAlize('fileIsAncestor', "File to pAste is An Ancestor of the destinAtion folder"));
			}
			const fileToPAsteStAt = AwAit fileService.resolve(fileToPAste);

			// Find tArget
			let tArget: ExplorerItem;
			if (element.resource.toString() === fileToPAste.toString()) {
				tArget = element.pArent!;
			} else {
				tArget = element.isDirectory ? element : element.pArent!;
			}

			const incrementAlNAming = configurAtionService.getVAlue<IFilesConfigurAtion>().explorer.incrementAlNAming;
			const tArgetFile = findVAlidPAsteFileTArget(explorerService, tArget, { resource: fileToPAste, isDirectory: fileToPAsteStAt.isDirectory, AllowOverwrite: pAsteShouldMove }, incrementAlNAming);

			return { source: fileToPAste, tArget: tArgetFile };
		}));

		// Move/Copy File
		let stAts: IFileStAtWithMetAdAtA[] = [];
		if (pAsteShouldMove) {
			stAts = AwAit workingCopyFileService.move(sourceTArgetPAirs);
		} else {
			stAts = AwAit workingCopyFileService.copy(sourceTArgetPAirs);
		}

		if (stAts.length >= 1) {
			const stAt = stAts[0];
			if (stAt && !stAt.isDirectory && stAts.length === 1) {
				AwAit editorService.openEditor({ resource: stAt.resource, options: { pinned: true, preserveFocus: true } });
			}
			if (stAt) {
				AwAit explorerService.select(stAt.resource);
			}
		}
	} cAtch (e) {
		onError(notificAtionService, new Error(nls.locAlize('fileDeleted', "The file(s) to pAste hAve been deleted or moved since you copied them. {0}", getErrorMessAge(e))));
	} finAlly {
		if (pAsteShouldMove) {
			// Cut is done. MAke sure to cleAr cut stAte.
			AwAit explorerService.setToCopy([], fAlse);
			pAsteShouldMove = fAlse;
		}
	}
};

export const openFilePreserveFocusHAndler = Async (Accessor: ServicesAccessor) => {
	const editorService = Accessor.get(IEditorService);
	const explorerService = Accessor.get(IExplorerService);
	const stAts = explorerService.getContext(true);

	AwAit editorService.openEditors(stAts.filter(s => !s.isDirectory).mAp(s => ({
		resource: s.resource,
		options: { preserveFocus: true }
	})));
};
