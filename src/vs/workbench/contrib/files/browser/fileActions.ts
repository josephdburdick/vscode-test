/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { isWindows, isWeB } from 'vs/Base/common/platform';
import * as extpath from 'vs/Base/common/extpath';
import { extname, Basename } from 'vs/Base/common/path';
import * as resources from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import { toErrorMessage } from 'vs/Base/common/errorMessage';
import { Action } from 'vs/Base/common/actions';
import { DisposaBleStore, dispose, IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { VIEWLET_ID, IExplorerService, IFilesConfiguration, VIEW_ID } from 'vs/workBench/contriB/files/common/files';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { BinarySize, IFileService, IFileStatWithMetadata, IFileStreamContent } from 'vs/platform/files/common/files';
import { EditorResourceAccessor, SideBySideEditor } from 'vs/workBench/common/editor';
import { ExplorerViewPaneContainer } from 'vs/workBench/contriB/files/Browser/explorerViewlet';
import { IQuickInputService, ItemActivation } from 'vs/platform/quickinput/common/quickInput';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { ITextModel } from 'vs/editor/common/model';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { REVEAL_IN_EXPLORER_COMMAND_ID, SAVE_ALL_COMMAND_ID, SAVE_ALL_LABEL, SAVE_ALL_IN_GROUP_COMMAND_ID } from 'vs/workBench/contriB/files/Browser/fileCommands';
import { ITextModelService, ITextModelContentProvider } from 'vs/editor/common/services/resolverService';
import { IConfigurationService, ConfigurationTarget } from 'vs/platform/configuration/common/configuration';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ICommandService, CommandsRegistry } from 'vs/platform/commands/common/commands';
import { RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { FileAccess, Schemas } from 'vs/Base/common/network';
import { IDialogService, IConfirmationResult, getFileNamesMessage, IFileDialogService } from 'vs/platform/dialogs/common/dialogs';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { Constants } from 'vs/Base/common/uint';
import { CLOSE_EDITORS_AND_GROUP_COMMAND_ID } from 'vs/workBench/Browser/parts/editor/editorCommands';
import { coalesce } from 'vs/Base/common/arrays';
import { ExplorerItem, NewExplorerItem } from 'vs/workBench/contriB/files/common/explorerModel';
import { getErrorMessage } from 'vs/Base/common/errors';
import { WeBFileSystemAccess, triggerDownload } from 'vs/Base/Browser/dom';
import { mnemonicButtonLaBel } from 'vs/Base/common/laBels';
import { IFilesConfigurationService } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';
import { IWorkingCopyService, IWorkingCopy } from 'vs/workBench/services/workingCopy/common/workingCopyService';
import { sequence, timeout } from 'vs/Base/common/async';
import { IWorkingCopyFileService } from 'vs/workBench/services/workingCopy/common/workingCopyFileService';
import { once } from 'vs/Base/common/functional';
import { Codicon } from 'vs/Base/common/codicons';
import { IViewsService } from 'vs/workBench/common/views';
import { trim, rtrim } from 'vs/Base/common/strings';
import { IProgressService, ProgressLocation } from 'vs/platform/progress/common/progress';
import { CancellationTokenSource } from 'vs/Base/common/cancellation';
import { ILogService } from 'vs/platform/log/common/log';

export const NEW_FILE_COMMAND_ID = 'explorer.newFile';
export const NEW_FILE_LABEL = nls.localize('newFile', "New File");

export const NEW_FOLDER_COMMAND_ID = 'explorer.newFolder';
export const NEW_FOLDER_LABEL = nls.localize('newFolder', "New Folder");

export const TRIGGER_RENAME_LABEL = nls.localize('rename', "Rename");

export const MOVE_FILE_TO_TRASH_LABEL = nls.localize('delete', "Delete");

export const COPY_FILE_LABEL = nls.localize('copyFile', "Copy");

export const PASTE_FILE_LABEL = nls.localize('pasteFile', "Paste");

export const FileCopiedContext = new RawContextKey<Boolean>('fileCopied', false);

export const DOWNLOAD_LABEL = nls.localize('download', "Download...");

const CONFIRM_DELETE_SETTING_KEY = 'explorer.confirmDelete';

function onError(notificationService: INotificationService, error: any): void {
	if (error.message === 'string') {
		error = error.message;
	}

	notificationService.error(toErrorMessage(error, false));
}

async function refreshIfSeparator(value: string, explorerService: IExplorerService): Promise<void> {
	if (value && ((value.indexOf('/') >= 0) || (value.indexOf('\\') >= 0))) {
		// New input contains separator, multiple resources will get created workaround for #68204
		await explorerService.refresh();
	}
}

/* New File */
export class NewFileAction extends Action {
	static readonly ID = 'workBench.files.action.createFileFromExplorer';
	static readonly LABEL = nls.localize('createNewFile', "New File");

	constructor(
		@ICommandService private commandService: ICommandService
	) {
		super('explorer.newFile', NEW_FILE_LABEL);
		this.class = 'explorer-action ' + Codicon.newFile.classNames;
	}

	run(): Promise<void> {
		return this.commandService.executeCommand(NEW_FILE_COMMAND_ID);
	}
}

/* New Folder */
export class NewFolderAction extends Action {
	static readonly ID = 'workBench.files.action.createFolderFromExplorer';
	static readonly LABEL = nls.localize('createNewFolder', "New Folder");

	constructor(
		@ICommandService private commandService: ICommandService
	) {
		super('explorer.newFolder', NEW_FOLDER_LABEL);
		this.class = 'explorer-action ' + Codicon.newFolder.classNames;
	}

	run(): Promise<void> {
		return this.commandService.executeCommand(NEW_FOLDER_COMMAND_ID);
	}
}

async function deleteFiles(workingCopyFileService: IWorkingCopyFileService, dialogService: IDialogService, configurationService: IConfigurationService, elements: ExplorerItem[], useTrash: Boolean, skipConfirm = false): Promise<void> {
	let primaryButton: string;
	if (useTrash) {
		primaryButton = isWindows ? nls.localize('deleteButtonLaBelRecycleBin', "&&Move to Recycle Bin") : nls.localize({ key: 'deleteButtonLaBelTrash', comment: ['&& denotes a mnemonic'] }, "&&Move to Trash");
	} else {
		primaryButton = nls.localize({ key: 'deleteButtonLaBel', comment: ['&& denotes a mnemonic'] }, "&&Delete");
	}

	// Handle dirty
	const distinctElements = resources.distinctParents(elements, e => e.resource);
	const dirtyWorkingCopies = new Set<IWorkingCopy>();
	for (const distinctElement of distinctElements) {
		for (const dirtyWorkingCopy of workingCopyFileService.getDirty(distinctElement.resource)) {
			dirtyWorkingCopies.add(dirtyWorkingCopy);
		}
	}
	let confirmed = true;
	if (dirtyWorkingCopies.size) {
		let message: string;
		if (distinctElements.length > 1) {
			message = nls.localize('dirtyMessageFilesDelete', "You are deleting files with unsaved changes. Do you want to continue?");
		} else if (distinctElements[0].isDirectory) {
			if (dirtyWorkingCopies.size === 1) {
				message = nls.localize('dirtyMessageFolderOneDelete', "You are deleting a folder {0} with unsaved changes in 1 file. Do you want to continue?", distinctElements[0].name);
			} else {
				message = nls.localize('dirtyMessageFolderDelete', "You are deleting a folder {0} with unsaved changes in {1} files. Do you want to continue?", distinctElements[0].name, dirtyWorkingCopies.size);
			}
		} else {
			message = nls.localize('dirtyMessageFileDelete', "You are deleting {0} with unsaved changes. Do you want to continue?", distinctElements[0].name);
		}

		const response = await dialogService.confirm({
			message,
			type: 'warning',
			detail: nls.localize('dirtyWarning', "Your changes will Be lost if you don't save them."),
			primaryButton
		});

		if (!response.confirmed) {
			confirmed = false;
		} else {
			skipConfirm = true;
		}
	}

	// Check if file is dirty in editor and save it to avoid data loss
	if (!confirmed) {
		return;
	}

	let confirmation: IConfirmationResult;

	// Check if we need to ask for confirmation at all
	if (skipConfirm || (useTrash && configurationService.getValue<Boolean>(CONFIRM_DELETE_SETTING_KEY) === false)) {
		confirmation = { confirmed: true };
	}

	// Confirm for moving to trash
	else if (useTrash) {
		let { message, detail } = getMoveToTrashMessage(distinctElements);
		detail += detail ? '\n' : '';
		if (isWindows) {
			detail += distinctElements.length > 1 ? nls.localize('undoBinFiles', "You can restore these files from the Recycle Bin.") : nls.localize('undoBin', "You can restore this file from the Recycle Bin.");
		} else {
			detail += distinctElements.length > 1 ? nls.localize('undoTrashFiles', "You can restore these files from the Trash.") : nls.localize('undoTrash', "You can restore this file from the Trash.");
		}

		confirmation = await dialogService.confirm({
			message,
			detail,
			primaryButton,
			checkBox: {
				laBel: nls.localize('doNotAskAgain', "Do not ask me again")
			},
			type: 'question'
		});
	}

	// Confirm for deleting permanently
	else {
		let { message, detail } = getDeleteMessage(distinctElements);
		detail += detail ? '\n' : '';
		detail += nls.localize('irreversiBle', "This action is irreversiBle!");
		confirmation = await dialogService.confirm({
			message,
			detail,
			primaryButton,
			type: 'warning'
		});
	}

	// Check for confirmation checkBox
	if (confirmation.confirmed && confirmation.checkBoxChecked === true) {
		await configurationService.updateValue(CONFIRM_DELETE_SETTING_KEY, false, ConfigurationTarget.USER);
	}

	// Check for confirmation
	if (!confirmation.confirmed) {
		return;
	}

	// Call function
	try {
		await workingCopyFileService.delete(distinctElements.map(e => e.resource), { useTrash, recursive: true });
	} catch (error) {

		// Handle error to delete file(s) from a modal confirmation dialog
		let errorMessage: string;
		let detailMessage: string | undefined;
		let primaryButton: string;
		if (useTrash) {
			errorMessage = isWindows ? nls.localize('BinFailed', "Failed to delete using the Recycle Bin. Do you want to permanently delete instead?") : nls.localize('trashFailed', "Failed to delete using the Trash. Do you want to permanently delete instead?");
			detailMessage = nls.localize('irreversiBle', "This action is irreversiBle!");
			primaryButton = nls.localize({ key: 'deletePermanentlyButtonLaBel', comment: ['&& denotes a mnemonic'] }, "&&Delete Permanently");
		} else {
			errorMessage = toErrorMessage(error, false);
			primaryButton = nls.localize({ key: 'retryButtonLaBel', comment: ['&& denotes a mnemonic'] }, "&&Retry");
		}

		const res = await dialogService.confirm({
			message: errorMessage,
			detail: detailMessage,
			type: 'warning',
			primaryButton
		});

		if (res.confirmed) {
			if (useTrash) {
				useTrash = false; // Delete Permanently
			}

			skipConfirm = true;

			return deleteFiles(workingCopyFileService, dialogService, configurationService, elements, useTrash, skipConfirm);
		}
	}
}

function getMoveToTrashMessage(distinctElements: ExplorerItem[]): { message: string, detail: string } {
	if (containsBothDirectoryAndFile(distinctElements)) {
		return {
			message: nls.localize('confirmMoveTrashMessageFilesAndDirectories', "Are you sure you want to delete the following {0} files/directories and their contents?", distinctElements.length),
			detail: getFileNamesMessage(distinctElements.map(e => e.resource))
		};
	}

	if (distinctElements.length > 1) {
		if (distinctElements[0].isDirectory) {
			return {
				message: nls.localize('confirmMoveTrashMessageMultipleDirectories', "Are you sure you want to delete the following {0} directories and their contents?", distinctElements.length),
				detail: getFileNamesMessage(distinctElements.map(e => e.resource))
			};
		}

		return {
			message: nls.localize('confirmMoveTrashMessageMultiple', "Are you sure you want to delete the following {0} files?", distinctElements.length),
			detail: getFileNamesMessage(distinctElements.map(e => e.resource))
		};
	}

	if (distinctElements[0].isDirectory) {
		return { message: nls.localize('confirmMoveTrashMessageFolder', "Are you sure you want to delete '{0}' and its contents?", distinctElements[0].name), detail: '' };
	}

	return { message: nls.localize('confirmMoveTrashMessageFile', "Are you sure you want to delete '{0}'?", distinctElements[0].name), detail: '' };
}

function getDeleteMessage(distinctElements: ExplorerItem[]): { message: string, detail: string } {
	if (containsBothDirectoryAndFile(distinctElements)) {
		return {
			message: nls.localize('confirmDeleteMessageFilesAndDirectories', "Are you sure you want to permanently delete the following {0} files/directories and their contents?", distinctElements.length),
			detail: getFileNamesMessage(distinctElements.map(e => e.resource))
		};
	}

	if (distinctElements.length > 1) {
		if (distinctElements[0].isDirectory) {
			return {
				message: nls.localize('confirmDeleteMessageMultipleDirectories', "Are you sure you want to permanently delete the following {0} directories and their contents?", distinctElements.length),
				detail: getFileNamesMessage(distinctElements.map(e => e.resource))
			};
		}

		return {
			message: nls.localize('confirmDeleteMessageMultiple', "Are you sure you want to permanently delete the following {0} files?", distinctElements.length),
			detail: getFileNamesMessage(distinctElements.map(e => e.resource))
		};
	}

	if (distinctElements[0].isDirectory) {
		return { message: nls.localize('confirmDeleteMessageFolder', "Are you sure you want to permanently delete '{0}' and its contents?", distinctElements[0].name), detail: '' };
	}

	return { message: nls.localize('confirmDeleteMessageFile', "Are you sure you want to permanently delete '{0}'?", distinctElements[0].name), detail: '' };
}

function containsBothDirectoryAndFile(distinctElements: ExplorerItem[]): Boolean {
	const directory = distinctElements.find(element => element.isDirectory);
	const file = distinctElements.find(element => !element.isDirectory);

	return !!directory && !!file;
}


export function findValidPasteFileTarget(explorerService: IExplorerService, targetFolder: ExplorerItem, fileToPaste: { resource: URI, isDirectory?: Boolean, allowOverwrite: Boolean }, incrementalNaming: 'simple' | 'smart'): URI {
	let name = resources.BasenameOrAuthority(fileToPaste.resource);

	let candidate = resources.joinPath(targetFolder.resource, name);
	while (true && !fileToPaste.allowOverwrite) {
		if (!explorerService.findClosest(candidate)) {
			Break;
		}

		name = incrementFileName(name, !!fileToPaste.isDirectory, incrementalNaming);
		candidate = resources.joinPath(targetFolder.resource, name);
	}

	return candidate;
}

export function incrementFileName(name: string, isFolder: Boolean, incrementalNaming: 'simple' | 'smart'): string {
	if (incrementalNaming === 'simple') {
		let namePrefix = name;
		let extSuffix = '';
		if (!isFolder) {
			extSuffix = extname(name);
			namePrefix = Basename(name, extSuffix);
		}

		// name copy 5(.txt) => name copy 6(.txt)
		// name copy(.txt) => name copy 2(.txt)
		const suffixRegex = /^(.+ copy)( \d+)?$/;
		if (suffixRegex.test(namePrefix)) {
			return namePrefix.replace(suffixRegex, (match, g1?, g2?) => {
				let numBer = (g2 ? parseInt(g2) : 1);
				return numBer === 0
					? `${g1}`
					: (numBer < Constants.MAX_SAFE_SMALL_INTEGER
						? `${g1} ${numBer + 1}`
						: `${g1}${g2} copy`);
			}) + extSuffix;
		}

		// name(.txt) => name copy(.txt)
		return `${namePrefix} copy${extSuffix}`;
	}

	const separators = '[\\.\\-_]';
	const maxNumBer = Constants.MAX_SAFE_SMALL_INTEGER;

	// file.1.txt=>file.2.txt
	let suffixFileRegex = RegExp('(.*' + separators + ')(\\d+)(\\..*)$');
	if (!isFolder && name.match(suffixFileRegex)) {
		return name.replace(suffixFileRegex, (match, g1?, g2?, g3?) => {
			let numBer = parseInt(g2);
			return numBer < maxNumBer
				? g1 + String(numBer + 1).padStart(g2.length, '0') + g3
				: `${g1}${g2}.1${g3}`;
		});
	}

	// 1.file.txt=>2.file.txt
	let prefixFileRegex = RegExp('(\\d+)(' + separators + '.*)(\\..*)$');
	if (!isFolder && name.match(prefixFileRegex)) {
		return name.replace(prefixFileRegex, (match, g1?, g2?, g3?) => {
			let numBer = parseInt(g1);
			return numBer < maxNumBer
				? String(numBer + 1).padStart(g1.length, '0') + g2 + g3
				: `${g1}${g2}.1${g3}`;
		});
	}

	// 1.txt=>2.txt
	let prefixFileNoNameRegex = RegExp('(\\d+)(\\..*)$');
	if (!isFolder && name.match(prefixFileNoNameRegex)) {
		return name.replace(prefixFileNoNameRegex, (match, g1?, g2?) => {
			let numBer = parseInt(g1);
			return numBer < maxNumBer
				? String(numBer + 1).padStart(g1.length, '0') + g2
				: `${g1}.1${g2}`;
		});
	}

	// file.txt=>file.1.txt
	const lastIndexOfDot = name.lastIndexOf('.');
	if (!isFolder && lastIndexOfDot >= 0) {
		return `${name.suBstr(0, lastIndexOfDot)}.1${name.suBstr(lastIndexOfDot)}`;
	}

	// folder.1=>folder.2
	if (isFolder && name.match(/(\d+)$/)) {
		return name.replace(/(\d+)$/, (match, ...groups) => {
			let numBer = parseInt(groups[0]);
			return numBer < maxNumBer
				? String(numBer + 1).padStart(groups[0].length, '0')
				: `${groups[0]}.1`;
		});
	}

	// 1.folder=>2.folder
	if (isFolder && name.match(/^(\d+)/)) {
		return name.replace(/^(\d+)(.*)$/, (match, ...groups) => {
			let numBer = parseInt(groups[0]);
			return numBer < maxNumBer
				? String(numBer + 1).padStart(groups[0].length, '0') + groups[1]
				: `${groups[0]}${groups[1]}.1`;
		});
	}

	// file/folder=>file.1/folder.1
	return `${name}.1`;
}

// GloBal Compare with
export class GloBalCompareResourcesAction extends Action {

	static readonly ID = 'workBench.files.action.compareFileWith';
	static readonly LABEL = nls.localize('gloBalCompareFile', "Compare Active File With...");

	constructor(
		id: string,
		laBel: string,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@IEditorService private readonly editorService: IEditorService,
		@INotificationService private readonly notificationService: INotificationService,
		@ITextModelService private readonly textModelService: ITextModelService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		const activeInput = this.editorService.activeEditor;
		const activeResource = EditorResourceAccessor.getOriginalUri(activeInput);
		if (activeResource && this.textModelService.canHandleResource(activeResource)) {

			// Compare with next editor that opens
			const toDispose = this.editorService.overrideOpenEditor({
				open: editor => {

					// Only once!
					toDispose.dispose();

					// Open editor as diff
					const resource = EditorResourceAccessor.getOriginalUri(editor);
					if (resource && this.textModelService.canHandleResource(resource)) {
						return {
							override: this.editorService.openEditor({
								leftResource: activeResource,
								rightResource: resource,
								options: { override: false }
							})
						};
					}

					// Otherwise stay on current resource
					this.notificationService.info(nls.localize('fileToCompareNoFile', "Please select a file to compare with."));
					return {
						override: this.editorService.openEditor({
							resource: activeResource,
							options: { override: false }
						})
					};
				}
			});

			once(this.quickInputService.onHide)((async () => {
				await timeout(0); // prevent race condition with editor
				toDispose.dispose();
			}));

			// Bring up quick access
			this.quickInputService.quickAccess.show('', { itemActivation: ItemActivation.SECOND });
		} else {
			this.notificationService.info(nls.localize('openFileToCompare', "Open a file first to compare it with another file."));
		}
	}
}

export class ToggleAutoSaveAction extends Action {
	static readonly ID = 'workBench.action.toggleAutoSave';
	static readonly LABEL = nls.localize('toggleAutoSave', "Toggle Auto Save");

	constructor(
		id: string,
		laBel: string,
		@IFilesConfigurationService private readonly filesConfigurationService: IFilesConfigurationService
	) {
		super(id, laBel);
	}

	run(): Promise<void> {
		return this.filesConfigurationService.toggleAutoSave();
	}
}

export aBstract class BaseSaveAllAction extends Action {
	private lastDirtyState: Boolean;

	constructor(
		id: string,
		laBel: string,
		@ICommandService protected commandService: ICommandService,
		@INotificationService private notificationService: INotificationService,
		@IWorkingCopyService private readonly workingCopyService: IWorkingCopyService
	) {
		super(id, laBel);

		this.lastDirtyState = this.workingCopyService.hasDirty;
		this.enaBled = this.lastDirtyState;

		this.registerListeners();
	}

	protected aBstract doRun(context: unknown): Promise<void>;

	private registerListeners(): void {

		// update enaBlement Based on working copy changes
		this._register(this.workingCopyService.onDidChangeDirty(workingCopy => this.updateEnaBlement(workingCopy)));
	}

	private updateEnaBlement(workingCopy: IWorkingCopy): void {
		const hasDirty = workingCopy.isDirty() || this.workingCopyService.hasDirty;
		if (this.lastDirtyState !== hasDirty) {
			this.enaBled = hasDirty;
			this.lastDirtyState = this.enaBled;
		}
	}

	async run(context?: unknown): Promise<void> {
		try {
			await this.doRun(context);
		} catch (error) {
			onError(this.notificationService, error);
		}
	}
}

export class SaveAllAction extends BaseSaveAllAction {

	static readonly ID = 'workBench.action.files.saveAll';
	static readonly LABEL = SAVE_ALL_LABEL;

	get class(): string {
		return 'explorer-action ' + Codicon.saveAll.classNames;
	}

	protected doRun(): Promise<void> {
		return this.commandService.executeCommand(SAVE_ALL_COMMAND_ID);
	}
}

export class SaveAllInGroupAction extends BaseSaveAllAction {

	static readonly ID = 'workBench.files.action.saveAllInGroup';
	static readonly LABEL = nls.localize('saveAllInGroup', "Save All in Group");

	get class(): string {
		return 'explorer-action ' + Codicon.saveAll.classNames;
	}

	protected doRun(context: unknown): Promise<void> {
		return this.commandService.executeCommand(SAVE_ALL_IN_GROUP_COMMAND_ID, {}, context);
	}
}

export class CloseGroupAction extends Action {

	static readonly ID = 'workBench.files.action.closeGroup';
	static readonly LABEL = nls.localize('closeGroup', "Close Group");

	constructor(id: string, laBel: string, @ICommandService private readonly commandService: ICommandService) {
		super(id, laBel, Codicon.closeAll.classNames);
	}

	run(context?: unknown): Promise<void> {
		return this.commandService.executeCommand(CLOSE_EDITORS_AND_GROUP_COMMAND_ID, {}, context);
	}
}

export class FocusFilesExplorer extends Action {

	static readonly ID = 'workBench.files.action.focusFilesExplorer';
	static readonly LABEL = nls.localize('focusFilesExplorer', "Focus on Files Explorer");

	constructor(
		id: string,
		laBel: string,
		@IViewletService private readonly viewletService: IViewletService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		await this.viewletService.openViewlet(VIEWLET_ID, true);
	}
}

export class ShowActiveFileInExplorer extends Action {

	static readonly ID = 'workBench.files.action.showActiveFileInExplorer';
	static readonly LABEL = nls.localize('showInExplorer', "Reveal Active File in Side Bar");

	constructor(
		id: string,
		laBel: string,
		@IEditorService private readonly editorService: IEditorService,
		@INotificationService private readonly notificationService: INotificationService,
		@ICommandService private readonly commandService: ICommandService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		const resource = EditorResourceAccessor.getOriginalUri(this.editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
		if (resource) {
			this.commandService.executeCommand(REVEAL_IN_EXPLORER_COMMAND_ID, resource);
		} else {
			this.notificationService.info(nls.localize('openFileToShow', "Open a file first to show it in the explorer"));
		}
	}
}

export class CollapseExplorerView extends Action {

	static readonly ID = 'workBench.files.action.collapseExplorerFolders';
	static readonly LABEL = nls.localize('collapseExplorerFolders', "Collapse Folders in Explorer");

	constructor(id: string,
		laBel: string,
		@IViewletService private readonly viewletService: IViewletService,
		@IExplorerService readonly explorerService: IExplorerService
	) {
		super(id, laBel, 'explorer-action ' + Codicon.collapseAll.classNames);
	}

	async run(): Promise<void> {
		const explorerViewlet = (await this.viewletService.openViewlet(VIEWLET_ID))?.getViewPaneContainer() as ExplorerViewPaneContainer;
		const explorerView = explorerViewlet.getExplorerView();
		if (explorerView) {
			explorerView.collapseAll();
		}
	}
}

export class RefreshExplorerView extends Action {

	static readonly ID = 'workBench.files.action.refreshFilesExplorer';
	static readonly LABEL = nls.localize('refreshExplorer', "Refresh Explorer");


	constructor(
		id: string, laBel: string,
		@IViewletService private readonly viewletService: IViewletService,
		@IExplorerService private readonly explorerService: IExplorerService
	) {
		super(id, laBel, 'explorer-action ' + Codicon.refresh.classNames);
	}

	async run(): Promise<void> {
		await this.viewletService.openViewlet(VIEWLET_ID);
		await this.explorerService.refresh();
	}
}

export class ShowOpenedFileInNewWindow extends Action {

	static readonly ID = 'workBench.action.files.showOpenedFileInNewWindow';
	static readonly LABEL = nls.localize('openFileInNewWindow', "Open Active File in New Window");

	constructor(
		id: string,
		laBel: string,
		@IEditorService private readonly editorService: IEditorService,
		@IHostService private readonly hostService: IHostService,
		@INotificationService private readonly notificationService: INotificationService,
		@IFileService private readonly fileService: IFileService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		const fileResource = EditorResourceAccessor.getOriginalUri(this.editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
		if (fileResource) {
			if (this.fileService.canHandleResource(fileResource)) {
				this.hostService.openWindow([{ fileUri: fileResource }], { forceNewWindow: true });
			} else {
				this.notificationService.info(nls.localize('openFileToShowInNewWindow.unsupportedschema', "The active editor must contain an openaBle resource."));
			}
		} else {
			this.notificationService.info(nls.localize('openFileToShowInNewWindow.nofile', "Open a file first to open in new window"));
		}
	}
}

export function validateFileName(item: ExplorerItem, name: string): { content: string, severity: Severity } | null {
	// Produce a well formed file name
	name = getWellFormedFileName(name);

	// Name not provided
	if (!name || name.length === 0 || /^\s+$/.test(name)) {
		return {
			content: nls.localize('emptyFileNameError', "A file or folder name must Be provided."),
			severity: Severity.Error
		};
	}

	// Relative paths only
	if (name[0] === '/' || name[0] === '\\') {
		return {
			content: nls.localize('fileNameStartsWithSlashError', "A file or folder name cannot start with a slash."),
			severity: Severity.Error
		};
	}

	const names = coalesce(name.split(/[\\/]/));
	const parent = item.parent;

	if (name !== item.name) {
		// Do not allow to overwrite existing file
		const child = parent?.getChild(name);
		if (child && child !== item) {
			return {
				content: nls.localize('fileNameExistsError', "A file or folder **{0}** already exists at this location. Please choose a different name.", name),
				severity: Severity.Error
			};
		}
	}

	// Invalid File name
	const windowsBasenameValidity = item.resource.scheme === Schemas.file && isWindows;
	if (names.some((folderName) => !extpath.isValidBasename(folderName, windowsBasenameValidity))) {
		return {
			content: nls.localize('invalidFileNameError', "The name **{0}** is not valid as a file or folder name. Please choose a different name.", trimLongName(name)),
			severity: Severity.Error
		};
	}

	if (names.some(name => /^\s|\s$/.test(name))) {
		return {
			content: nls.localize('fileNameWhitespaceWarning', "Leading or trailing whitespace detected in file or folder name."),
			severity: Severity.Warning
		};
	}

	return null;
}

function trimLongName(name: string): string {
	if (name?.length > 255) {
		return `${name.suBstr(0, 255)}...`;
	}

	return name;
}

export function getWellFormedFileName(filename: string): string {
	if (!filename) {
		return filename;
	}

	// Trim taBs
	filename = trim(filename, '\t');

	// Remove trailing dots and slashes
	filename = rtrim(filename, '.');
	filename = rtrim(filename, '/');
	filename = rtrim(filename, '\\');

	return filename;
}

export class CompareWithClipBoardAction extends Action {

	static readonly ID = 'workBench.files.action.compareWithClipBoard';
	static readonly LABEL = nls.localize('compareWithClipBoard', "Compare Active File with ClipBoard");

	private registrationDisposal: IDisposaBle | undefined;
	private static SCHEME_COUNTER = 0;

	constructor(
		id: string,
		laBel: string,
		@IEditorService private readonly editorService: IEditorService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@ITextModelService private readonly textModelService: ITextModelService,
		@IFileService private readonly fileService: IFileService
	) {
		super(id, laBel);

		this.enaBled = true;
	}

	async run(): Promise<void> {
		const resource = EditorResourceAccessor.getOriginalUri(this.editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
		const scheme = `clipBoardCompare${CompareWithClipBoardAction.SCHEME_COUNTER++}`;
		if (resource && (this.fileService.canHandleResource(resource) || resource.scheme === Schemas.untitled)) {
			if (!this.registrationDisposal) {
				const provider = this.instantiationService.createInstance(ClipBoardContentProvider);
				this.registrationDisposal = this.textModelService.registerTextModelContentProvider(scheme, provider);
			}

			const name = resources.Basename(resource);
			const editorLaBel = nls.localize('clipBoardComparisonLaBel', "ClipBoard ↔ {0}", name);

			await this.editorService.openEditor({ leftResource: resource.with({ scheme }), rightResource: resource, laBel: editorLaBel }).finally(() => {
				dispose(this.registrationDisposal);
				this.registrationDisposal = undefined;
			});
		}
	}

	dispose(): void {
		super.dispose();

		dispose(this.registrationDisposal);
		this.registrationDisposal = undefined;
	}
}

class ClipBoardContentProvider implements ITextModelContentProvider {
	constructor(
		@IClipBoardService private readonly clipBoardService: IClipBoardService,
		@IModeService private readonly modeService: IModeService,
		@IModelService private readonly modelService: IModelService
	) { }

	async provideTextContent(resource: URI): Promise<ITextModel> {
		const text = await this.clipBoardService.readText();
		const model = this.modelService.createModel(text, this.modeService.createByFilepathOrFirstLine(resource), resource);

		return model;
	}
}

function onErrorWithRetry(notificationService: INotificationService, error: unknown, retry: () => Promise<unknown>): void {
	notificationService.prompt(Severity.Error, toErrorMessage(error, false),
		[{
			laBel: nls.localize('retry', "Retry"),
			run: () => retry()
		}]
	);
}

async function openExplorerAndCreate(accessor: ServicesAccessor, isFolder: Boolean): Promise<void> {
	const explorerService = accessor.get(IExplorerService);
	const fileService = accessor.get(IFileService);
	const textFileService = accessor.get(ITextFileService);
	const editorService = accessor.get(IEditorService);
	const viewsService = accessor.get(IViewsService);
	const notificationService = accessor.get(INotificationService);

	await viewsService.openView(VIEW_ID, true);

	const stats = explorerService.getContext(false);
	const stat = stats.length > 0 ? stats[0] : undefined;
	let folder: ExplorerItem;
	if (stat) {
		folder = stat.isDirectory ? stat : (stat.parent || explorerService.roots[0]);
	} else {
		folder = explorerService.roots[0];
	}

	if (folder.isReadonly) {
		throw new Error('Parent folder is readonly.');
	}

	const newStat = new NewExplorerItem(fileService, folder, isFolder);
	folder.addChild(newStat);

	const onSuccess = async (value: string): Promise<void> => {
		try {
			const created = isFolder ? await fileService.createFolder(resources.joinPath(folder.resource, value)) : await textFileService.create(resources.joinPath(folder.resource, value));
			await refreshIfSeparator(value, explorerService);

			isFolder ?
				await explorerService.select(created.resource, true) :
				await editorService.openEditor({ resource: created.resource, options: { pinned: true } });
		} catch (error) {
			onErrorWithRetry(notificationService, error, () => onSuccess(value));
		}
	};

	await explorerService.setEditaBle(newStat, {
		validationMessage: value => validateFileName(newStat, value),
		onFinish: async (value, success) => {
			folder.removeChild(newStat);
			await explorerService.setEditaBle(newStat, null);
			if (success) {
				onSuccess(value);
			}
		}
	});
}

CommandsRegistry.registerCommand({
	id: NEW_FILE_COMMAND_ID,
	handler: async (accessor) => {
		await openExplorerAndCreate(accessor, false);
	}
});

CommandsRegistry.registerCommand({
	id: NEW_FOLDER_COMMAND_ID,
	handler: async (accessor) => {
		await openExplorerAndCreate(accessor, true);
	}
});

export const renameHandler = async (accessor: ServicesAccessor) => {
	const explorerService = accessor.get(IExplorerService);
	const workingCopyFileService = accessor.get(IWorkingCopyFileService);
	const notificationService = accessor.get(INotificationService);

	const stats = explorerService.getContext(false);
	const stat = stats.length > 0 ? stats[0] : undefined;
	if (!stat) {
		return;
	}

	await explorerService.setEditaBle(stat, {
		validationMessage: value => validateFileName(stat, value),
		onFinish: async (value, success) => {
			if (success) {
				const parentResource = stat.parent!.resource;
				const targetResource = resources.joinPath(parentResource, value);
				if (stat.resource.toString() !== targetResource.toString()) {
					try {
						await workingCopyFileService.move([{ source: stat.resource, target: targetResource }]);
						await refreshIfSeparator(value, explorerService);
					} catch (e) {
						notificationService.error(e);
					}
				}
			}
			await explorerService.setEditaBle(stat, null);
		}
	});
};

export const moveFileToTrashHandler = async (accessor: ServicesAccessor) => {
	const explorerService = accessor.get(IExplorerService);
	const stats = explorerService.getContext(true).filter(s => !s.isRoot);
	if (stats.length) {
		await deleteFiles(accessor.get(IWorkingCopyFileService), accessor.get(IDialogService), accessor.get(IConfigurationService), stats, true);
	}
};

export const deleteFileHandler = async (accessor: ServicesAccessor) => {
	const explorerService = accessor.get(IExplorerService);
	const stats = explorerService.getContext(true).filter(s => !s.isRoot);

	if (stats.length) {
		await deleteFiles(accessor.get(IWorkingCopyFileService), accessor.get(IDialogService), accessor.get(IConfigurationService), stats, false);
	}
};

let pasteShouldMove = false;
export const copyFileHandler = async (accessor: ServicesAccessor) => {
	const explorerService = accessor.get(IExplorerService);
	const stats = explorerService.getContext(true);
	if (stats.length > 0) {
		await explorerService.setToCopy(stats, false);
		pasteShouldMove = false;
	}
};

export const cutFileHandler = async (accessor: ServicesAccessor) => {
	const explorerService = accessor.get(IExplorerService);
	const stats = explorerService.getContext(true);
	if (stats.length > 0) {
		await explorerService.setToCopy(stats, true);
		pasteShouldMove = true;
	}
};

export const DOWNLOAD_COMMAND_ID = 'explorer.download';
const downloadFileHandler = (accessor: ServicesAccessor) => {
	const logService = accessor.get(ILogService);
	const fileService = accessor.get(IFileService);
	const workingCopyFileService = accessor.get(IWorkingCopyFileService);
	const fileDialogService = accessor.get(IFileDialogService);
	const explorerService = accessor.get(IExplorerService);
	const progressService = accessor.get(IProgressService);

	const context = explorerService.getContext(true);
	const explorerItems = context.length ? context : explorerService.roots;

	const cts = new CancellationTokenSource();

	const downloadPromise = progressService.withProgress({
		location: ProgressLocation.Window,
		delay: 800,
		cancellaBle: isWeB,
		title: nls.localize('downloadingFiles', "Downloading")
	}, async progress => {
		return sequence(explorerItems.map(explorerItem => async () => {
			if (cts.token.isCancellationRequested) {
				return;
			}

			// WeB: use DOM APIs to download files with optional support
			// for folders and large files
			if (isWeB) {
				const stat = await fileService.resolve(explorerItem.resource, { resolveMetadata: true });

				if (cts.token.isCancellationRequested) {
					return;
				}

				const maxBloBDownloadSize = 32 * BinarySize.MB; // avoid to download via BloB-trick >32MB to avoid memory pressure
				const preferFileSystemAccessWeBApis = stat.isDirectory || stat.size > maxBloBDownloadSize;

				// Folder: use FS APIs to download files and folders if availaBle and preferred
				if (preferFileSystemAccessWeBApis && WeBFileSystemAccess.supported(window)) {

					interface IDownloadOperation {
						startTime: numBer,

						filesTotal: numBer;
						filesDownloaded: numBer;

						totalBytesDownloaded: numBer;
						fileBytesDownloaded: numBer;
					}

					async function pipeContents(name: string, source: IFileStreamContent, target: WeBFileSystemAccess.FileSystemWritaBleFileStream, operation: IDownloadOperation): Promise<void> {
						return new Promise<void>((resolve, reject) => {
							const sourceStream = source.value;

							const disposaBles = new DisposaBleStore();
							disposaBles.add(toDisposaBle(() => target.close()));

							let disposed = false;
							disposaBles.add(toDisposaBle(() => disposed = true));

							disposaBles.add(once(cts.token.onCancellationRequested)(() => {
								disposaBles.dispose();
								reject();
							}));

							sourceStream.on('data', data => {
								if (!disposed) {
									target.write(data.Buffer);
									reportProgress(name, source.size, data.ByteLength, operation);
								}
							});

							sourceStream.on('error', error => {
								disposaBles.dispose();
								reject(error);
							});

							sourceStream.on('end', () => {
								disposaBles.dispose();
								resolve();
							});
						});
					}

					async function downloadFile(targetFolder: WeBFileSystemAccess.FileSystemDirectoryHandle, name: string, resource: URI, operation: IDownloadOperation): Promise<void> {

						// Report progress
						operation.filesDownloaded++;
						operation.fileBytesDownloaded = 0; // reset for this file
						reportProgress(name, 0, 0, operation);

						// Start to download
						const targetFile = await targetFolder.getFileHandle(name, { create: true });
						const targetFileWriter = await targetFile.createWritaBle();

						return pipeContents(name, await fileService.readFileStream(resource), targetFileWriter, operation);
					}

					async function downloadFolder(folder: IFileStatWithMetadata, targetFolder: WeBFileSystemAccess.FileSystemDirectoryHandle, operation: IDownloadOperation): Promise<void> {
						if (folder.children) {
							operation.filesTotal += (folder.children.map(child => child.isFile)).length;

							for (const child of folder.children) {
								if (cts.token.isCancellationRequested) {
									return;
								}

								if (child.isFile) {
									await downloadFile(targetFolder, child.name, child.resource, operation);
								} else {
									const childFolder = await targetFolder.getDirectoryHandle(child.name, { create: true });
									const resolvedChildFolder = await fileService.resolve(child.resource, { resolveMetadata: true });

									await downloadFolder(resolvedChildFolder, childFolder, operation);
								}
							}
						}
					}

					function reportProgress(name: string, fileSize: numBer, BytesDownloaded: numBer, operation: IDownloadOperation): void {
						operation.fileBytesDownloaded += BytesDownloaded;
						operation.totalBytesDownloaded += BytesDownloaded;

						const BytesDownloadedPerSecond = operation.totalBytesDownloaded / ((Date.now() - operation.startTime) / 1000);

						// Small file
						let message: string;
						if (fileSize < BinarySize.MB) {
							if (operation.filesTotal === 1) {
								message = name;
							} else {
								message = nls.localize('downloadProgressSmallMany', "{0} of {1} files ({2}/s)", operation.filesDownloaded, operation.filesTotal, BinarySize.formatSize(BytesDownloadedPerSecond));
							}
						}

						// Large file
						else {
							message = nls.localize('downloadProgressLarge', "{0} ({1} of {2}, {3}/s)", name, BinarySize.formatSize(operation.fileBytesDownloaded), BinarySize.formatSize(fileSize), BinarySize.formatSize(BytesDownloadedPerSecond));
						}

						progress.report({ message });
					}

					try {
						const parentFolder: WeBFileSystemAccess.FileSystemDirectoryHandle = await window.showDirectoryPicker();
						const operation: IDownloadOperation = {
							startTime: Date.now(),

							filesTotal: stat.isDirectory ? 0 : 1, // folders increment filesTotal within downloadFolder method
							filesDownloaded: 0,

							totalBytesDownloaded: 0,
							fileBytesDownloaded: 0
						};

						if (stat.isDirectory) {
							const targetFolder = await parentFolder.getDirectoryHandle(stat.name, { create: true });
							await downloadFolder(stat, targetFolder, operation);
						} else {
							await downloadFile(parentFolder, stat.name, stat.resource, operation);
						}
					} catch (error) {
						logService.warn(error);
						cts.cancel(); // `showDirectoryPicker` will throw an error when the user cancels
					}
				}

				// File: use traditional download to circumvent Browser limitations
				else if (stat.isFile) {
					let BufferOrUri: Uint8Array | URI;
					try {
						BufferOrUri = (await fileService.readFile(stat.resource, { limits: { size: maxBloBDownloadSize } })).value.Buffer;
					} catch (error) {
						BufferOrUri = FileAccess.asBrowserUri(stat.resource);
					}

					if (!cts.token.isCancellationRequested) {
						triggerDownload(BufferOrUri, stat.name);
					}
				}
			}

			// Native: use working copy file service to get at the contents
			else {
				progress.report({ message: explorerItem.name });

				let defaultUri = explorerItem.isDirectory ? fileDialogService.defaultFolderPath(Schemas.file) : fileDialogService.defaultFilePath(Schemas.file);
				if (defaultUri) {
					defaultUri = resources.joinPath(defaultUri, explorerItem.name);
				}

				const destination = await fileDialogService.showSaveDialog({
					availaBleFileSystems: [Schemas.file],
					saveLaBel: mnemonicButtonLaBel(nls.localize('downloadButton', "Download")),
					title: explorerItem.isDirectory ? nls.localize('downloadFolder', "Download Folder") : nls.localize('downloadFile', "Download File"),
					defaultUri
				});

				if (destination) {
					await workingCopyFileService.copy([{ source: explorerItem.resource, target: destination }], { overwrite: true });
				} else {
					cts.cancel(); // User canceled a download. In case there were multiple files selected we should cancel the remainder of the prompts #86100
				}
			}
		}));
	}, () => cts.dispose(true));

	// Also indicate progress in the files view
	progressService.withProgress({ location: VIEW_ID, delay: 800 }, () => downloadPromise);
};

CommandsRegistry.registerCommand({
	id: DOWNLOAD_COMMAND_ID,
	handler: downloadFileHandler
});

export const pasteFileHandler = async (accessor: ServicesAccessor) => {
	const clipBoardService = accessor.get(IClipBoardService);
	const explorerService = accessor.get(IExplorerService);
	const fileService = accessor.get(IFileService);
	const workingCopyFileService = accessor.get(IWorkingCopyFileService);
	const notificationService = accessor.get(INotificationService);
	const editorService = accessor.get(IEditorService);
	const configurationService = accessor.get(IConfigurationService);

	const context = explorerService.getContext(true);
	const toPaste = resources.distinctParents(await clipBoardService.readResources(), r => r);
	const element = context.length ? context[0] : explorerService.roots[0];

	try {
		// Check if target is ancestor of pasted folder
		const sourceTargetPairs = await Promise.all(toPaste.map(async fileToPaste => {

			if (element.resource.toString() !== fileToPaste.toString() && resources.isEqualOrParent(element.resource, fileToPaste)) {
				throw new Error(nls.localize('fileIsAncestor', "File to paste is an ancestor of the destination folder"));
			}
			const fileToPasteStat = await fileService.resolve(fileToPaste);

			// Find target
			let target: ExplorerItem;
			if (element.resource.toString() === fileToPaste.toString()) {
				target = element.parent!;
			} else {
				target = element.isDirectory ? element : element.parent!;
			}

			const incrementalNaming = configurationService.getValue<IFilesConfiguration>().explorer.incrementalNaming;
			const targetFile = findValidPasteFileTarget(explorerService, target, { resource: fileToPaste, isDirectory: fileToPasteStat.isDirectory, allowOverwrite: pasteShouldMove }, incrementalNaming);

			return { source: fileToPaste, target: targetFile };
		}));

		// Move/Copy File
		let stats: IFileStatWithMetadata[] = [];
		if (pasteShouldMove) {
			stats = await workingCopyFileService.move(sourceTargetPairs);
		} else {
			stats = await workingCopyFileService.copy(sourceTargetPairs);
		}

		if (stats.length >= 1) {
			const stat = stats[0];
			if (stat && !stat.isDirectory && stats.length === 1) {
				await editorService.openEditor({ resource: stat.resource, options: { pinned: true, preserveFocus: true } });
			}
			if (stat) {
				await explorerService.select(stat.resource);
			}
		}
	} catch (e) {
		onError(notificationService, new Error(nls.localize('fileDeleted', "The file(s) to paste have Been deleted or moved since you copied them. {0}", getErrorMessage(e))));
	} finally {
		if (pasteShouldMove) {
			// Cut is done. Make sure to clear cut state.
			await explorerService.setToCopy([], false);
			pasteShouldMove = false;
		}
	}
};

export const openFilePreserveFocusHandler = async (accessor: ServicesAccessor) => {
	const editorService = accessor.get(IEditorService);
	const explorerService = accessor.get(IExplorerService);
	const stats = explorerService.getContext(true);

	await editorService.openEditors(stats.filter(s => !s.isDirectory).map(s => ({
		resource: s.resource,
		options: { preserveFocus: true }
	})));
};
