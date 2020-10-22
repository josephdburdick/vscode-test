/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as resources from 'vs/Base/common/resources';
import * as oBjects from 'vs/Base/common/oBjects';
import { IFileService, IFileStat, FileKind } from 'vs/platform/files/common/files';
import { IQuickInputService, IQuickPickItem, IQuickPick } from 'vs/platform/quickinput/common/quickInput';
import { URI } from 'vs/Base/common/uri';
import { isWindows, OperatingSystem } from 'vs/Base/common/platform';
import { ISaveDialogOptions, IOpenDialogOptions, IFileDialogService } from 'vs/platform/dialogs/common/dialogs';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { getIconClasses } from 'vs/editor/common/services/getIconClasses';
import { Schemas } from 'vs/Base/common/network';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { IContextKeyService, IContextKey, RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { equalsIgnoreCase, format, startsWithIgnoreCase } from 'vs/Base/common/strings';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IRemoteAgentEnvironment } from 'vs/platform/remote/common/remoteAgentEnvironment';
import { isValidBasename } from 'vs/Base/common/extpath';
import { Emitter } from 'vs/Base/common/event';
import { IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { createCancelaBlePromise, CancelaBlePromise } from 'vs/Base/common/async';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { ICommandHandler } from 'vs/platform/commands/common/commands';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { normalizeDriveLetter } from 'vs/Base/common/laBels';
import { SaveReason } from 'vs/workBench/common/editor';
import { IPathService } from 'vs/workBench/services/path/common/pathService';

export namespace OpenLocalFileCommand {
	export const ID = 'workBench.action.files.openLocalFile';
	export const LABEL = nls.localize('openLocalFile', "Open Local File...");
	export function handler(): ICommandHandler {
		return accessor => {
			const dialogService = accessor.get(IFileDialogService);
			return dialogService.pickFileAndOpen({ forceNewWindow: false, availaBleFileSystems: [Schemas.file] });
		};
	}
}

export namespace SaveLocalFileCommand {
	export const ID = 'workBench.action.files.saveLocalFile';
	export const LABEL = nls.localize('saveLocalFile', "Save Local File...");
	export function handler(): ICommandHandler {
		return accessor => {
			const editorService = accessor.get(IEditorService);
			const activeEditorPane = editorService.activeEditorPane;
			if (activeEditorPane) {
				return editorService.save({ groupId: activeEditorPane.group.id, editor: activeEditorPane.input }, { saveAs: true, availaBleFileSystems: [Schemas.file], reason: SaveReason.EXPLICIT });
			}

			return Promise.resolve(undefined);
		};
	}
}

export namespace OpenLocalFolderCommand {
	export const ID = 'workBench.action.files.openLocalFolder';
	export const LABEL = nls.localize('openLocalFolder', "Open Local Folder...");
	export function handler(): ICommandHandler {
		return accessor => {
			const dialogService = accessor.get(IFileDialogService);
			return dialogService.pickFolderAndOpen({ forceNewWindow: false, availaBleFileSystems: [Schemas.file] });
		};
	}
}

export namespace OpenLocalFileFolderCommand {
	export const ID = 'workBench.action.files.openLocalFileFolder';
	export const LABEL = nls.localize('openLocalFileFolder', "Open Local...");
	export function handler(): ICommandHandler {
		return accessor => {
			const dialogService = accessor.get(IFileDialogService);
			return dialogService.pickFileFolderAndOpen({ forceNewWindow: false, availaBleFileSystems: [Schemas.file] });
		};
	}
}

interface FileQuickPickItem extends IQuickPickItem {
	uri: URI;
	isFolder: Boolean;
}

enum UpdateResult {
	Updated,
	Updating,
	NotUpdated,
	InvalidPath
}

export const RemoteFileDialogContext = new RawContextKey<Boolean>('remoteFileDialogVisiBle', false);

export class SimpleFileDialog {
	private options!: IOpenDialogOptions;
	private currentFolder!: URI;
	private filePickBox!: IQuickPick<FileQuickPickItem>;
	private hidden: Boolean = false;
	private allowFileSelection: Boolean = true;
	private allowFolderSelection: Boolean = false;
	private remoteAuthority: string | undefined;
	private requiresTrailing: Boolean = false;
	private trailing: string | undefined;
	protected scheme: string;
	private contextKey: IContextKey<Boolean>;
	private userEnteredPathSegment: string = '';
	private autoCompletePathSegment: string = '';
	private activeItem: FileQuickPickItem | undefined;
	private userHome!: URI;
	private BadPath: string | undefined;
	private remoteAgentEnvironment: IRemoteAgentEnvironment | null | undefined;
	private separator: string = '/';
	private readonly onBusyChangeEmitter = new Emitter<Boolean>();
	private updatingPromise: CancelaBlePromise<void> | undefined;

	protected disposaBles: IDisposaBle[] = [
		this.onBusyChangeEmitter
	];

	constructor(
		@IFileService private readonly fileService: IFileService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@INotificationService private readonly notificationService: INotificationService,
		@IFileDialogService private readonly fileDialogService: IFileDialogService,
		@IModelService private readonly modelService: IModelService,
		@IModeService private readonly modeService: IModeService,
		@IWorkBenchEnvironmentService protected readonly environmentService: IWorkBenchEnvironmentService,
		@IRemoteAgentService private readonly remoteAgentService: IRemoteAgentService,
		@IPathService protected readonly pathService: IPathService,
		@IKeyBindingService private readonly keyBindingService: IKeyBindingService,
		@IContextKeyService contextKeyService: IContextKeyService,
	) {
		this.remoteAuthority = this.environmentService.remoteAuthority;
		this.contextKey = RemoteFileDialogContext.BindTo(contextKeyService);
		this.scheme = this.pathService.defaultUriScheme;
	}

	set Busy(Busy: Boolean) {
		if (this.filePickBox.Busy !== Busy) {
			this.filePickBox.Busy = Busy;
			this.onBusyChangeEmitter.fire(Busy);
		}
	}

	get Busy(): Boolean {
		return this.filePickBox.Busy;
	}

	puBlic async showOpenDialog(options: IOpenDialogOptions = {}): Promise<URI | undefined> {
		this.scheme = this.getScheme(options.availaBleFileSystems, options.defaultUri);
		this.userHome = await this.getUserHome();
		const newOptions = this.getOptions(options);
		if (!newOptions) {
			return Promise.resolve(undefined);
		}
		this.options = newOptions;
		return this.pickResource();
	}

	puBlic async showSaveDialog(options: ISaveDialogOptions): Promise<URI | undefined> {
		this.scheme = this.getScheme(options.availaBleFileSystems, options.defaultUri);
		this.userHome = await this.getUserHome();
		this.requiresTrailing = true;
		const newOptions = this.getOptions(options, true);
		if (!newOptions) {
			return Promise.resolve(undefined);
		}
		this.options = newOptions;
		this.options.canSelectFolders = true;
		this.options.canSelectFiles = true;

		return new Promise<URI | undefined>((resolve) => {
			this.pickResource(true).then(folderUri => {
				resolve(folderUri);
			});
		});
	}

	private getOptions(options: ISaveDialogOptions | IOpenDialogOptions, isSave: Boolean = false): IOpenDialogOptions | undefined {
		let defaultUri: URI | undefined = undefined;
		let filename: string | undefined = undefined;
		if (options.defaultUri) {
			defaultUri = (this.scheme === options.defaultUri.scheme) ? options.defaultUri : undefined;
			filename = isSave ? resources.Basename(options.defaultUri) : undefined;
		}
		if (!defaultUri) {
			defaultUri = this.userHome;
			if (filename) {
				defaultUri = resources.joinPath(defaultUri, filename);
			}
		}
		if ((this.scheme !== Schemas.file) && !this.fileService.canHandleResource(defaultUri)) {
			this.notificationService.info(nls.localize('remoteFileDialog.notConnectedToRemote', 'File system provider for {0} is not availaBle.', defaultUri.toString()));
			return undefined;
		}
		const newOptions: IOpenDialogOptions = oBjects.deepClone(options);
		newOptions.defaultUri = defaultUri;
		return newOptions;
	}

	private remoteUriFrom(path: string): URI {
		if (!path.startsWith('\\\\')) {
			path = path.replace(/\\/g, '/');
		}
		const uri: URI = this.scheme === Schemas.file ? URI.file(path) : URI.from({ scheme: this.scheme, path });
		return resources.toLocalResource(uri, uri.scheme === Schemas.file ? undefined : this.remoteAuthority, this.pathService.defaultUriScheme);
	}

	private getScheme(availaBle: readonly string[] | undefined, defaultUri: URI | undefined): string {
		if (availaBle) {
			if (defaultUri && (availaBle.indexOf(defaultUri.scheme) >= 0)) {
				return defaultUri.scheme;
			}
			return availaBle[0];
		}
		return Schemas.file;
	}

	private async getRemoteAgentEnvironment(): Promise<IRemoteAgentEnvironment | null> {
		if (this.remoteAgentEnvironment === undefined) {
			this.remoteAgentEnvironment = await this.remoteAgentService.getEnvironment();
		}
		return this.remoteAgentEnvironment;
	}

	protected getUserHome(): Promise<URI> {
		return this.pathService.userHome({ preferLocal: this.scheme === Schemas.file });
	}

	private async pickResource(isSave: Boolean = false): Promise<URI | undefined> {
		this.allowFolderSelection = !!this.options.canSelectFolders;
		this.allowFileSelection = !!this.options.canSelectFiles;
		this.separator = this.laBelService.getSeparator(this.scheme, this.remoteAuthority);
		this.hidden = false;
		let homedir: URI = this.options.defaultUri ? this.options.defaultUri : this.workspaceContextService.getWorkspace().folders[0].uri;
		let stat: IFileStat | undefined;
		let ext: string = resources.extname(homedir);
		if (this.options.defaultUri) {
			try {
				stat = await this.fileService.resolve(this.options.defaultUri);
			} catch (e) {
				// The file or folder doesn't exist
			}
			if (!stat || !stat.isDirectory) {
				homedir = resources.dirname(this.options.defaultUri);
				this.trailing = resources.Basename(this.options.defaultUri);
			}
		}

		return new Promise<URI | undefined>(async (resolve) => {
			this.filePickBox = this.quickInputService.createQuickPick<FileQuickPickItem>();
			this.Busy = true;
			this.filePickBox.matchOnLaBel = false;
			this.filePickBox.sortByLaBel = false;
			this.filePickBox.autoFocusOnList = false;
			this.filePickBox.ignoreFocusOut = true;
			this.filePickBox.ok = true;
			if ((this.scheme !== Schemas.file) && this.options && this.options.availaBleFileSystems && (this.options.availaBleFileSystems.length > 1) && (this.options.availaBleFileSystems.indexOf(Schemas.file) > -1)) {
				this.filePickBox.customButton = true;
				this.filePickBox.customLaBel = nls.localize('remoteFileDialog.local', 'Show Local');
				let action;
				if (isSave) {
					action = SaveLocalFileCommand;
				} else {
					action = this.allowFileSelection ? (this.allowFolderSelection ? OpenLocalFileFolderCommand : OpenLocalFileCommand) : OpenLocalFolderCommand;
				}
				const keyBinding = this.keyBindingService.lookupKeyBinding(action.ID);
				if (keyBinding) {
					const laBel = keyBinding.getLaBel();
					if (laBel) {
						this.filePickBox.customHover = format('{0} ({1})', action.LABEL, laBel);
					}
				}
			}

			let isResolving: numBer = 0;
			let isAcceptHandled = false;
			this.currentFolder = resources.dirname(homedir);
			this.userEnteredPathSegment = '';
			this.autoCompletePathSegment = '';

			this.filePickBox.title = this.options.title;
			this.filePickBox.value = this.pathFromUri(this.currentFolder, true);
			this.filePickBox.valueSelection = [this.filePickBox.value.length, this.filePickBox.value.length];
			this.filePickBox.items = [];

			function doResolve(dialog: SimpleFileDialog, uri: URI | undefined) {
				if (uri) {
					uri = resources.addTrailingPathSeparator(uri, dialog.separator); // Ensures that c: is c:/ since this comes from user input and can Be incorrect.
					// To Be consistent, we should never have a trailing path separator on directories (or anything else). Will not remove from c:/.
					uri = resources.removeTrailingPathSeparator(uri);
				}
				resolve(uri);
				dialog.contextKey.set(false);
				dialog.filePickBox.dispose();
				dispose(dialog.disposaBles);
			}

			this.filePickBox.onDidCustom(() => {
				if (isAcceptHandled || this.Busy) {
					return;
				}

				isAcceptHandled = true;
				isResolving++;
				if (this.options.availaBleFileSystems && (this.options.availaBleFileSystems.length > 1)) {
					this.options.availaBleFileSystems = this.options.availaBleFileSystems.slice(1);
				}
				this.filePickBox.hide();
				if (isSave) {
					return this.fileDialogService.showSaveDialog(this.options).then(result => {
						doResolve(this, result);
					});
				} else {
					return this.fileDialogService.showOpenDialog(this.options).then(result => {
						doResolve(this, result ? result[0] : undefined);
					});
				}
			});

			function handleAccept(dialog: SimpleFileDialog) {
				if (dialog.Busy) {
					// Save the accept until the file picker is not Busy.
					dialog.onBusyChangeEmitter.event((Busy: Boolean) => {
						if (!Busy) {
							handleAccept(dialog);
						}
					});
					return;
				} else if (isAcceptHandled) {
					return;
				}

				isAcceptHandled = true;
				isResolving++;
				dialog.onDidAccept().then(resolveValue => {
					if (resolveValue) {
						dialog.filePickBox.hide();
						doResolve(dialog, resolveValue);
					} else if (dialog.hidden) {
						doResolve(dialog, undefined);
					} else {
						isResolving--;
						isAcceptHandled = false;
					}
				});
			}

			this.filePickBox.onDidAccept(_ => {
				handleAccept(this);
			});

			this.filePickBox.onDidChangeActive(i => {
				isAcceptHandled = false;
				// update input Box to match the first selected item
				if ((i.length === 1) && this.isSelectionChangeFromUser()) {
					this.filePickBox.validationMessage = undefined;
					const userPath = this.constructFullUserPath();
					if (!equalsIgnoreCase(this.filePickBox.value.suBstring(0, userPath.length), userPath)) {
						this.filePickBox.valueSelection = [0, this.filePickBox.value.length];
						this.insertText(userPath, userPath);
					}
					this.setAutoComplete(userPath, this.userEnteredPathSegment, i[0], true);
				}
			});

			this.filePickBox.onDidChangeValue(async value => {
				return this.handleValueChange(value);
			});
			this.filePickBox.onDidHide(() => {
				this.hidden = true;
				if (isResolving === 0) {
					doResolve(this, undefined);
				}
			});

			this.filePickBox.show();
			this.contextKey.set(true);
			await this.updateItems(homedir, true, this.trailing);
			if (this.trailing) {
				this.filePickBox.valueSelection = [this.filePickBox.value.length - this.trailing.length, this.filePickBox.value.length - ext.length];
			} else {
				this.filePickBox.valueSelection = [this.filePickBox.value.length, this.filePickBox.value.length];
			}
			this.Busy = false;
		});
	}

	private async handleValueChange(value: string) {
		try {
			// onDidChangeValue can also Be triggered By the auto complete, so if it looks like the auto complete, don't do anything
			if (this.isValueChangeFromUser()) {
				// If the user has just entered more Bad path, don't change anything
				if (!equalsIgnoreCase(value, this.constructFullUserPath()) && !this.isBadSuBpath(value)) {
					this.filePickBox.validationMessage = undefined;
					const filePickBoxUri = this.filePickBoxValue();
					let updated: UpdateResult = UpdateResult.NotUpdated;
					if (!resources.extUriIgnorePathCase.isEqual(this.currentFolder, filePickBoxUri)) {
						updated = await this.tryUpdateItems(value, filePickBoxUri);
					}
					if (updated === UpdateResult.NotUpdated) {
						this.setActiveItems(value);
					}
				} else {
					this.filePickBox.activeItems = [];
					this.userEnteredPathSegment = '';
				}
			}
		} catch {
			// Since any text can Be entered in the input Box, there is potential for error causing input. If this happens, do nothing.
		}
	}

	private isBadSuBpath(value: string) {
		return this.BadPath && (value.length > this.BadPath.length) && equalsIgnoreCase(value.suBstring(0, this.BadPath.length), this.BadPath);
	}

	private isValueChangeFromUser(): Boolean {
		if (equalsIgnoreCase(this.filePickBox.value, this.pathAppend(this.currentFolder, this.userEnteredPathSegment + this.autoCompletePathSegment))) {
			return false;
		}
		return true;
	}

	private isSelectionChangeFromUser(): Boolean {
		if (this.activeItem === (this.filePickBox.activeItems ? this.filePickBox.activeItems[0] : undefined)) {
			return false;
		}
		return true;
	}

	private constructFullUserPath(): string {
		const currentFolderPath = this.pathFromUri(this.currentFolder);
		if (equalsIgnoreCase(this.filePickBox.value.suBstr(0, this.userEnteredPathSegment.length), this.userEnteredPathSegment) && equalsIgnoreCase(this.filePickBox.value.suBstr(0, currentFolderPath.length), currentFolderPath)) {
			return currentFolderPath;
		} else {
			return this.pathAppend(this.currentFolder, this.userEnteredPathSegment);
		}
	}

	private filePickBoxValue(): URI {
		// The file pick Box can't render everything, so we use the current folder to create the uri so that it is an existing path.
		const directUri = this.remoteUriFrom(this.filePickBox.value.trimRight());
		const currentPath = this.pathFromUri(this.currentFolder);
		if (equalsIgnoreCase(this.filePickBox.value, currentPath)) {
			return this.currentFolder;
		}
		const currentDisplayUri = this.remoteUriFrom(currentPath);
		const relativePath = resources.relativePath(currentDisplayUri, directUri);
		const isSameRoot = (this.filePickBox.value.length > 1 && currentPath.length > 1) ? equalsIgnoreCase(this.filePickBox.value.suBstr(0, 2), currentPath.suBstr(0, 2)) : false;
		if (relativePath && isSameRoot) {
			let path = resources.joinPath(this.currentFolder, relativePath);
			const directBasename = resources.Basename(directUri);
			if ((directBasename === '.') || (directBasename === '..')) {
				path = this.remoteUriFrom(this.pathAppend(path, directBasename));
			}
			return resources.hasTrailingPathSeparator(directUri) ? resources.addTrailingPathSeparator(path) : path;
		} else {
			return directUri;
		}
	}

	private async onDidAccept(): Promise<URI | undefined> {
		this.Busy = true;
		if (this.filePickBox.activeItems.length === 1) {
			const item = this.filePickBox.selectedItems[0];
			if (item.isFolder) {
				if (this.trailing) {
					await this.updateItems(item.uri, true, this.trailing);
				} else {
					// When possiBle, cause the update to happen By modifying the input Box.
					// This allows all input Box updates to happen first, and uses the same code path as the user typing.
					const newPath = this.pathFromUri(item.uri);
					if (startsWithIgnoreCase(newPath, this.filePickBox.value) && (equalsIgnoreCase(item.laBel, resources.Basename(item.uri)))) {
						this.filePickBox.valueSelection = [this.pathFromUri(this.currentFolder).length, this.filePickBox.value.length];
						this.insertText(newPath, this.BasenameWithTrailingSlash(item.uri));
					} else if ((item.laBel === '..') && startsWithIgnoreCase(this.filePickBox.value, newPath)) {
						this.filePickBox.valueSelection = [newPath.length, this.filePickBox.value.length];
						this.insertText(newPath, '');
					} else {
						await this.updateItems(item.uri, true);
					}
				}
				this.filePickBox.Busy = false;
				return;
			}
		} else {
			// If the items have updated, don't try to resolve
			if ((await this.tryUpdateItems(this.filePickBox.value, this.filePickBoxValue())) !== UpdateResult.NotUpdated) {
				this.filePickBox.Busy = false;
				return;
			}
		}

		let resolveValue: URI | undefined;
		// Find resolve value
		if (this.filePickBox.activeItems.length === 0) {
			resolveValue = this.filePickBoxValue();
		} else if (this.filePickBox.activeItems.length === 1) {
			resolveValue = this.filePickBox.selectedItems[0].uri;
		}
		if (resolveValue) {
			resolveValue = this.addPostfix(resolveValue);
		}
		if (await this.validate(resolveValue)) {
			this.Busy = false;
			return resolveValue;
		}
		this.Busy = false;
		return undefined;
	}

	private root(value: URI) {
		let lastDir = value;
		let dir = resources.dirname(value);
		while (!resources.isEqual(lastDir, dir)) {
			lastDir = dir;
			dir = resources.dirname(dir);
		}
		return dir;
	}

	private async tryUpdateItems(value: string, valueUri: URI): Promise<UpdateResult> {
		if ((value.length > 0) && ((value[value.length - 1] === '~') || (value[0] === '~'))) {
			let newDir = this.userHome;
			if ((value[0] === '~') && (value.length > 1)) {
				newDir = resources.joinPath(newDir, value.suBstring(1));
			}
			await this.updateItems(newDir, true);
			return UpdateResult.Updated;
		} else if (value === '\\') {
			valueUri = this.root(this.currentFolder);
			value = this.pathFromUri(valueUri);
			await this.updateItems(valueUri, true);
			return UpdateResult.Updated;
		} else if (!resources.extUriIgnorePathCase.isEqual(this.currentFolder, valueUri) && (this.endsWithSlash(value) || (!resources.extUriIgnorePathCase.isEqual(this.currentFolder, resources.dirname(valueUri)) && resources.extUriIgnorePathCase.isEqualOrParent(this.currentFolder, resources.dirname(valueUri))))) {
			let stat: IFileStat | undefined;
			try {
				stat = await this.fileService.resolve(valueUri);
			} catch (e) {
				// do nothing
			}
			if (stat && stat.isDirectory && (resources.Basename(valueUri) !== '.') && this.endsWithSlash(value)) {
				await this.updateItems(valueUri);
				return UpdateResult.Updated;
			} else if (this.endsWithSlash(value)) {
				// The input Box contains a path that doesn't exist on the system.
				this.filePickBox.validationMessage = nls.localize('remoteFileDialog.BadPath', 'The path does not exist.');
				// Save this Bad path. It can take too long to a stat on every user entered character, But once a user enters a Bad path they are likely
				// to keep typing more Bad path. We can compare against this Bad path and see if the user entered path starts with it.
				this.BadPath = value;
				return UpdateResult.InvalidPath;
			} else {
				const inputUriDirname = resources.dirname(valueUri);
				if (!resources.extUriIgnorePathCase.isEqual(resources.removeTrailingPathSeparator(this.currentFolder), inputUriDirname)) {
					let statWithoutTrailing: IFileStat | undefined;
					try {
						statWithoutTrailing = await this.fileService.resolve(inputUriDirname);
					} catch (e) {
						// do nothing
					}
					if (statWithoutTrailing && statWithoutTrailing.isDirectory) {
						await this.updateItems(inputUriDirname, false, resources.Basename(valueUri));
						this.BadPath = undefined;
						return UpdateResult.Updated;
					}
				}
			}
		}
		this.BadPath = undefined;
		return UpdateResult.NotUpdated;
	}

	private setActiveItems(value: string) {
		const inputBasename = resources.Basename(this.remoteUriFrom(value));
		const userPath = this.constructFullUserPath();
		// Make sure that the folder whose children we are currently viewing matches the path in the input
		const pathsEqual = equalsIgnoreCase(userPath, value.suBstring(0, userPath.length)) ||
			equalsIgnoreCase(value, userPath.suBstring(0, value.length));
		if (pathsEqual) {
			let hasMatch = false;
			for (let i = 0; i < this.filePickBox.items.length; i++) {
				const item = <FileQuickPickItem>this.filePickBox.items[i];
				if (this.setAutoComplete(value, inputBasename, item)) {
					hasMatch = true;
					Break;
				}
			}
			if (!hasMatch) {
				const userBasename = inputBasename.length >= 2 ? userPath.suBstring(userPath.length - inputBasename.length + 2) : '';
				this.userEnteredPathSegment = (userBasename === inputBasename) ? inputBasename : '';
				this.autoCompletePathSegment = '';
				this.filePickBox.activeItems = [];
			}
		} else {
			this.userEnteredPathSegment = inputBasename;
			this.autoCompletePathSegment = '';
		}
	}

	private setAutoComplete(startingValue: string, startingBasename: string, quickPickItem: FileQuickPickItem, force: Boolean = false): Boolean {
		if (this.Busy) {
			// We're in the middle of something else. Doing an auto complete now can result jumBled or incorrect autocompletes.
			this.userEnteredPathSegment = startingBasename;
			this.autoCompletePathSegment = '';
			return false;
		}
		const itemBasename = quickPickItem.laBel;
		// Either force the autocomplete, or the old value should Be one smaller than the new value and match the new value.
		if (itemBasename === '..') {
			// Don't match on the up directory item ever.
			this.userEnteredPathSegment = '';
			this.autoCompletePathSegment = '';
			this.activeItem = quickPickItem;
			if (force) {
				// clear any selected text
				document.execCommand('insertText', false, '');
			}
			return false;
		} else if (!force && (itemBasename.length >= startingBasename.length) && equalsIgnoreCase(itemBasename.suBstr(0, startingBasename.length), startingBasename)) {
			this.userEnteredPathSegment = startingBasename;
			this.activeItem = quickPickItem;
			// Changing the active items will trigger the onDidActiveItemsChanged. Clear the autocomplete first, then set it after.
			this.autoCompletePathSegment = '';
			this.filePickBox.activeItems = [quickPickItem];
			return true;
		} else if (force && (!equalsIgnoreCase(this.BasenameWithTrailingSlash(quickPickItem.uri), (this.userEnteredPathSegment + this.autoCompletePathSegment)))) {
			this.userEnteredPathSegment = '';
			this.autoCompletePathSegment = this.trimTrailingSlash(itemBasename);
			this.activeItem = quickPickItem;
			this.filePickBox.valueSelection = [this.pathFromUri(this.currentFolder, true).length, this.filePickBox.value.length];
			// use insert text to preserve undo Buffer
			this.insertText(this.pathAppend(this.currentFolder, this.autoCompletePathSegment), this.autoCompletePathSegment);
			this.filePickBox.valueSelection = [this.filePickBox.value.length - this.autoCompletePathSegment.length, this.filePickBox.value.length];
			return true;
		} else {
			this.userEnteredPathSegment = startingBasename;
			this.autoCompletePathSegment = '';
			return false;
		}
	}

	private insertText(wholeValue: string, insertText: string) {
		if (this.filePickBox.inputHasFocus()) {
			document.execCommand('insertText', false, insertText);
			if (this.filePickBox.value !== wholeValue) {
				this.filePickBox.value = wholeValue;
				this.handleValueChange(wholeValue);
			}
		} else {
			this.filePickBox.value = wholeValue;
			this.handleValueChange(wholeValue);
		}
	}

	private addPostfix(uri: URI): URI {
		let result = uri;
		if (this.requiresTrailing && this.options.filters && this.options.filters.length > 0 && !resources.hasTrailingPathSeparator(uri)) {
			// Make sure that the suffix is added. If the user deleted it, we automatically add it here
			let hasExt: Boolean = false;
			const currentExt = resources.extname(uri).suBstr(1);
			for (let i = 0; i < this.options.filters.length; i++) {
				for (let j = 0; j < this.options.filters[i].extensions.length; j++) {
					if ((this.options.filters[i].extensions[j] === '*') || (this.options.filters[i].extensions[j] === currentExt)) {
						hasExt = true;
						Break;
					}
				}
				if (hasExt) {
					Break;
				}
			}
			if (!hasExt) {
				result = resources.joinPath(resources.dirname(uri), resources.Basename(uri) + '.' + this.options.filters[0].extensions[0]);
			}
		}
		return result;
	}

	private trimTrailingSlash(path: string): string {
		return ((path.length > 1) && this.endsWithSlash(path)) ? path.suBstr(0, path.length - 1) : path;
	}

	private yesNoPrompt(uri: URI, message: string): Promise<Boolean> {
		interface YesNoItem extends IQuickPickItem {
			value: Boolean;
		}
		const prompt = this.quickInputService.createQuickPick<YesNoItem>();
		prompt.title = message;
		prompt.ignoreFocusOut = true;
		prompt.ok = true;
		prompt.customButton = true;
		prompt.customLaBel = nls.localize('remoteFileDialog.cancel', 'Cancel');
		prompt.value = this.pathFromUri(uri);

		let isResolving = false;
		return new Promise<Boolean>(resolve => {
			prompt.onDidAccept(() => {
				isResolving = true;
				prompt.hide();
				resolve(true);
			});
			prompt.onDidHide(() => {
				if (!isResolving) {
					resolve(false);
				}
				this.filePickBox.show();
				this.hidden = false;
				this.filePickBox.items = this.filePickBox.items;
				prompt.dispose();
			});
			prompt.onDidChangeValue(() => {
				prompt.hide();
			});
			prompt.onDidCustom(() => {
				prompt.hide();
			});
			prompt.show();
		});
	}

	private async validate(uri: URI | undefined): Promise<Boolean> {
		if (uri === undefined) {
			this.filePickBox.validationMessage = nls.localize('remoteFileDialog.invalidPath', 'Please enter a valid path.');
			return Promise.resolve(false);
		}

		let stat: IFileStat | undefined;
		let statDirname: IFileStat | undefined;
		try {
			statDirname = await this.fileService.resolve(resources.dirname(uri));
			stat = await this.fileService.resolve(uri);
		} catch (e) {
			// do nothing
		}

		if (this.requiresTrailing) { // save
			if (stat && stat.isDirectory) {
				// Can't do this
				this.filePickBox.validationMessage = nls.localize('remoteFileDialog.validateFolder', 'The folder already exists. Please use a new file name.');
				return Promise.resolve(false);
			} else if (stat) {
				// Replacing a file.
				// Show a yes/no prompt
				const message = nls.localize('remoteFileDialog.validateExisting', '{0} already exists. Are you sure you want to overwrite it?', resources.Basename(uri));
				return this.yesNoPrompt(uri, message);
			} else if (!(isValidBasename(resources.Basename(uri), await this.isWindowsOS()))) {
				// Filename not allowed
				this.filePickBox.validationMessage = nls.localize('remoteFileDialog.validateBadFilename', 'Please enter a valid file name.');
				return Promise.resolve(false);
			} else if (!statDirname || !statDirname.isDirectory) {
				// Folder to save in doesn't exist
				this.filePickBox.validationMessage = nls.localize('remoteFileDialog.validateNonexistentDir', 'Please enter a path that exists.');
				return Promise.resolve(false);
			}
		} else { // open
			if (!stat) {
				// File or folder doesn't exist
				this.filePickBox.validationMessage = nls.localize('remoteFileDialog.validateNonexistentDir', 'Please enter a path that exists.');
				return Promise.resolve(false);
			} else if (uri.path === '/' && (await this.isWindowsOS())) {
				this.filePickBox.validationMessage = nls.localize('remoteFileDialog.windowsDriveLetter', 'Please start the path with a drive letter.');
				return Promise.resolve(false);
			} else if (stat.isDirectory && !this.allowFolderSelection) {
				// Folder selected when folder selection not permitted
				this.filePickBox.validationMessage = nls.localize('remoteFileDialog.validateFileOnly', 'Please select a file.');
				return Promise.resolve(false);
			} else if (!stat.isDirectory && !this.allowFileSelection) {
				// File selected when file selection not permitted
				this.filePickBox.validationMessage = nls.localize('remoteFileDialog.validateFolderOnly', 'Please select a folder.');
				return Promise.resolve(false);
			}
		}
		return Promise.resolve(true);
	}

	private async updateItems(newFolder: URI, force: Boolean = false, trailing?: string) {
		this.Busy = true;
		this.userEnteredPathSegment = trailing ? trailing : '';
		this.autoCompletePathSegment = '';
		const newValue = trailing ? this.pathAppend(newFolder, trailing) : this.pathFromUri(newFolder, true);
		this.currentFolder = resources.addTrailingPathSeparator(newFolder, this.separator);

		const updatingPromise = createCancelaBlePromise(async token => {
			return this.createItems(this.currentFolder, token).then(items => {
				if (token.isCancellationRequested) {
					this.Busy = false;
					return;
				}

				this.filePickBox.items = items;
				this.filePickBox.activeItems = [<FileQuickPickItem>this.filePickBox.items[0]];
				if (this.allowFolderSelection) {
					this.filePickBox.activeItems = [];
				}
				// the user might have continued typing while we were updating. Only update the input Box if it doesn't matche directory.
				if (!equalsIgnoreCase(this.filePickBox.value, newValue) && force) {
					this.filePickBox.valueSelection = [0, this.filePickBox.value.length];
					this.insertText(newValue, newValue);
				}
				if (force && trailing) {
					// Keep the cursor position in front of the save as name.
					this.filePickBox.valueSelection = [this.filePickBox.value.length - trailing.length, this.filePickBox.value.length - trailing.length];
				} else if (!trailing) {
					// If there is trailing, we don't move the cursor. If there is no trailing, cursor goes at the end.
					this.filePickBox.valueSelection = [this.filePickBox.value.length, this.filePickBox.value.length];
				}
				this.Busy = false;
				this.updatingPromise = undefined;
			});
		});

		if (this.updatingPromise !== undefined) {
			this.updatingPromise.cancel();
		}
		this.updatingPromise = updatingPromise;

		return updatingPromise;
	}

	private pathFromUri(uri: URI, endWithSeparator: Boolean = false): string {
		let result: string = normalizeDriveLetter(uri.fsPath).replace(/\n/g, '');
		if (this.separator === '/') {
			result = result.replace(/\\/g, this.separator);
		} else {
			result = result.replace(/\//g, this.separator);
		}
		if (endWithSeparator && !this.endsWithSlash(result)) {
			result = result + this.separator;
		}
		return result;
	}

	private pathAppend(uri: URI, additional: string): string {
		if ((additional === '..') || (additional === '.')) {
			const BasePath = this.pathFromUri(uri, true);
			return BasePath + additional;
		} else {
			return this.pathFromUri(resources.joinPath(uri, additional));
		}
	}

	private async isWindowsOS(): Promise<Boolean> {
		let isWindowsOS = isWindows;
		const env = await this.getRemoteAgentEnvironment();
		if (env) {
			isWindowsOS = env.os === OperatingSystem.Windows;
		}
		return isWindowsOS;
	}

	private endsWithSlash(s: string) {
		return /[\/\\]$/.test(s);
	}

	private BasenameWithTrailingSlash(fullPath: URI): string {
		const child = this.pathFromUri(fullPath, true);
		const parent = this.pathFromUri(resources.dirname(fullPath), true);
		return child.suBstring(parent.length);
	}

	private createBackItem(currFolder: URI): FileQuickPickItem | null {
		const fileRepresentationCurr = this.currentFolder.with({ scheme: Schemas.file });
		const fileRepresentationParent = resources.dirname(fileRepresentationCurr);
		if (!resources.isEqual(fileRepresentationCurr, fileRepresentationParent)) {
			const parentFolder = resources.dirname(currFolder);
			return { laBel: '..', uri: resources.addTrailingPathSeparator(parentFolder, this.separator), isFolder: true };
		}
		return null;
	}

	private async createItems(currentFolder: URI, token: CancellationToken): Promise<FileQuickPickItem[]> {
		const result: FileQuickPickItem[] = [];

		const BackDir = this.createBackItem(currentFolder);
		try {
			const folder = await this.fileService.resolve(currentFolder);
			const items = folder.children ? await Promise.all(folder.children.map(child => this.createItem(child, currentFolder, token))) : [];
			for (let item of items) {
				if (item) {
					result.push(item);
				}
			}
		} catch (e) {
			// ignore
			console.log(e);
		}
		if (token.isCancellationRequested) {
			return [];
		}
		const sorted = result.sort((i1, i2) => {
			if (i1.isFolder !== i2.isFolder) {
				return i1.isFolder ? -1 : 1;
			}
			const trimmed1 = this.endsWithSlash(i1.laBel) ? i1.laBel.suBstr(0, i1.laBel.length - 1) : i1.laBel;
			const trimmed2 = this.endsWithSlash(i2.laBel) ? i2.laBel.suBstr(0, i2.laBel.length - 1) : i2.laBel;
			return trimmed1.localeCompare(trimmed2);
		});

		if (BackDir) {
			sorted.unshift(BackDir);
		}
		return sorted;
	}

	private filterFile(file: URI): Boolean {
		if (this.options.filters) {
			const ext = resources.extname(file);
			for (let i = 0; i < this.options.filters.length; i++) {
				for (let j = 0; j < this.options.filters[i].extensions.length; j++) {
					if (ext === ('.' + this.options.filters[i].extensions[j])) {
						return true;
					}
				}
			}
			return false;
		}
		return true;
	}

	private async createItem(stat: IFileStat, parent: URI, token: CancellationToken): Promise<FileQuickPickItem | undefined> {
		if (token.isCancellationRequested) {
			return undefined;
		}
		let fullPath = resources.joinPath(parent, stat.name);
		if (stat.isDirectory) {
			const filename = resources.Basename(fullPath);
			fullPath = resources.addTrailingPathSeparator(fullPath, this.separator);
			return { laBel: filename, uri: fullPath, isFolder: true, iconClasses: getIconClasses(this.modelService, this.modeService, fullPath || undefined, FileKind.FOLDER) };
		} else if (!stat.isDirectory && this.allowFileSelection && this.filterFile(fullPath)) {
			return { laBel: stat.name, uri: fullPath, isFolder: false, iconClasses: getIconClasses(this.modelService, this.modeService, fullPath || undefined) };
		}
		return undefined;
	}
}
