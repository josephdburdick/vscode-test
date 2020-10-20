/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As resources from 'vs/bAse/common/resources';
import * As objects from 'vs/bAse/common/objects';
import { IFileService, IFileStAt, FileKind } from 'vs/plAtform/files/common/files';
import { IQuickInputService, IQuickPickItem, IQuickPick } from 'vs/plAtform/quickinput/common/quickInput';
import { URI } from 'vs/bAse/common/uri';
import { isWindows, OperAtingSystem } from 'vs/bAse/common/plAtform';
import { ISAveDiAlogOptions, IOpenDiAlogOptions, IFileDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { getIconClAsses } from 'vs/editor/common/services/getIconClAsses';
import { SchemAs } from 'vs/bAse/common/network';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
import { IContextKeyService, IContextKey, RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { equAlsIgnoreCAse, formAt, stArtsWithIgnoreCAse } from 'vs/bAse/common/strings';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IRemoteAgentEnvironment } from 'vs/plAtform/remote/common/remoteAgentEnvironment';
import { isVAlidBAsenAme } from 'vs/bAse/common/extpAth';
import { Emitter } from 'vs/bAse/common/event';
import { IDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { creAteCAncelAblePromise, CAncelAblePromise } from 'vs/bAse/common/Async';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { ICommAndHAndler } from 'vs/plAtform/commAnds/common/commAnds';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { normAlizeDriveLetter } from 'vs/bAse/common/lAbels';
import { SAveReAson } from 'vs/workbench/common/editor';
import { IPAthService } from 'vs/workbench/services/pAth/common/pAthService';

export nAmespAce OpenLocAlFileCommAnd {
	export const ID = 'workbench.Action.files.openLocAlFile';
	export const LABEL = nls.locAlize('openLocAlFile', "Open LocAl File...");
	export function hAndler(): ICommAndHAndler {
		return Accessor => {
			const diAlogService = Accessor.get(IFileDiAlogService);
			return diAlogService.pickFileAndOpen({ forceNewWindow: fAlse, AvAilAbleFileSystems: [SchemAs.file] });
		};
	}
}

export nAmespAce SAveLocAlFileCommAnd {
	export const ID = 'workbench.Action.files.sAveLocAlFile';
	export const LABEL = nls.locAlize('sAveLocAlFile', "SAve LocAl File...");
	export function hAndler(): ICommAndHAndler {
		return Accessor => {
			const editorService = Accessor.get(IEditorService);
			const ActiveEditorPAne = editorService.ActiveEditorPAne;
			if (ActiveEditorPAne) {
				return editorService.sAve({ groupId: ActiveEditorPAne.group.id, editor: ActiveEditorPAne.input }, { sAveAs: true, AvAilAbleFileSystems: [SchemAs.file], reAson: SAveReAson.EXPLICIT });
			}

			return Promise.resolve(undefined);
		};
	}
}

export nAmespAce OpenLocAlFolderCommAnd {
	export const ID = 'workbench.Action.files.openLocAlFolder';
	export const LABEL = nls.locAlize('openLocAlFolder', "Open LocAl Folder...");
	export function hAndler(): ICommAndHAndler {
		return Accessor => {
			const diAlogService = Accessor.get(IFileDiAlogService);
			return diAlogService.pickFolderAndOpen({ forceNewWindow: fAlse, AvAilAbleFileSystems: [SchemAs.file] });
		};
	}
}

export nAmespAce OpenLocAlFileFolderCommAnd {
	export const ID = 'workbench.Action.files.openLocAlFileFolder';
	export const LABEL = nls.locAlize('openLocAlFileFolder', "Open LocAl...");
	export function hAndler(): ICommAndHAndler {
		return Accessor => {
			const diAlogService = Accessor.get(IFileDiAlogService);
			return diAlogService.pickFileFolderAndOpen({ forceNewWindow: fAlse, AvAilAbleFileSystems: [SchemAs.file] });
		};
	}
}

interfAce FileQuickPickItem extends IQuickPickItem {
	uri: URI;
	isFolder: booleAn;
}

enum UpdAteResult {
	UpdAted,
	UpdAting,
	NotUpdAted,
	InvAlidPAth
}

export const RemoteFileDiAlogContext = new RAwContextKey<booleAn>('remoteFileDiAlogVisible', fAlse);

export clAss SimpleFileDiAlog {
	privAte options!: IOpenDiAlogOptions;
	privAte currentFolder!: URI;
	privAte filePickBox!: IQuickPick<FileQuickPickItem>;
	privAte hidden: booleAn = fAlse;
	privAte AllowFileSelection: booleAn = true;
	privAte AllowFolderSelection: booleAn = fAlse;
	privAte remoteAuthority: string | undefined;
	privAte requiresTrAiling: booleAn = fAlse;
	privAte trAiling: string | undefined;
	protected scheme: string;
	privAte contextKey: IContextKey<booleAn>;
	privAte userEnteredPAthSegment: string = '';
	privAte AutoCompletePAthSegment: string = '';
	privAte ActiveItem: FileQuickPickItem | undefined;
	privAte userHome!: URI;
	privAte bAdPAth: string | undefined;
	privAte remoteAgentEnvironment: IRemoteAgentEnvironment | null | undefined;
	privAte sepArAtor: string = '/';
	privAte reAdonly onBusyChAngeEmitter = new Emitter<booleAn>();
	privAte updAtingPromise: CAncelAblePromise<void> | undefined;

	protected disposAbles: IDisposAble[] = [
		this.onBusyChAngeEmitter
	];

	constructor(
		@IFileService privAte reAdonly fileService: IFileService,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService,
		@ILAbelService privAte reAdonly lAbelService: ILAbelService,
		@IWorkspAceContextService privAte reAdonly workspAceContextService: IWorkspAceContextService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IFileDiAlogService privAte reAdonly fileDiAlogService: IFileDiAlogService,
		@IModelService privAte reAdonly modelService: IModelService,
		@IModeService privAte reAdonly modeService: IModeService,
		@IWorkbenchEnvironmentService protected reAdonly environmentService: IWorkbenchEnvironmentService,
		@IRemoteAgentService privAte reAdonly remoteAgentService: IRemoteAgentService,
		@IPAthService protected reAdonly pAthService: IPAthService,
		@IKeybindingService privAte reAdonly keybindingService: IKeybindingService,
		@IContextKeyService contextKeyService: IContextKeyService,
	) {
		this.remoteAuthority = this.environmentService.remoteAuthority;
		this.contextKey = RemoteFileDiAlogContext.bindTo(contextKeyService);
		this.scheme = this.pAthService.defAultUriScheme;
	}

	set busy(busy: booleAn) {
		if (this.filePickBox.busy !== busy) {
			this.filePickBox.busy = busy;
			this.onBusyChAngeEmitter.fire(busy);
		}
	}

	get busy(): booleAn {
		return this.filePickBox.busy;
	}

	public Async showOpenDiAlog(options: IOpenDiAlogOptions = {}): Promise<URI | undefined> {
		this.scheme = this.getScheme(options.AvAilAbleFileSystems, options.defAultUri);
		this.userHome = AwAit this.getUserHome();
		const newOptions = this.getOptions(options);
		if (!newOptions) {
			return Promise.resolve(undefined);
		}
		this.options = newOptions;
		return this.pickResource();
	}

	public Async showSAveDiAlog(options: ISAveDiAlogOptions): Promise<URI | undefined> {
		this.scheme = this.getScheme(options.AvAilAbleFileSystems, options.defAultUri);
		this.userHome = AwAit this.getUserHome();
		this.requiresTrAiling = true;
		const newOptions = this.getOptions(options, true);
		if (!newOptions) {
			return Promise.resolve(undefined);
		}
		this.options = newOptions;
		this.options.cAnSelectFolders = true;
		this.options.cAnSelectFiles = true;

		return new Promise<URI | undefined>((resolve) => {
			this.pickResource(true).then(folderUri => {
				resolve(folderUri);
			});
		});
	}

	privAte getOptions(options: ISAveDiAlogOptions | IOpenDiAlogOptions, isSAve: booleAn = fAlse): IOpenDiAlogOptions | undefined {
		let defAultUri: URI | undefined = undefined;
		let filenAme: string | undefined = undefined;
		if (options.defAultUri) {
			defAultUri = (this.scheme === options.defAultUri.scheme) ? options.defAultUri : undefined;
			filenAme = isSAve ? resources.bAsenAme(options.defAultUri) : undefined;
		}
		if (!defAultUri) {
			defAultUri = this.userHome;
			if (filenAme) {
				defAultUri = resources.joinPAth(defAultUri, filenAme);
			}
		}
		if ((this.scheme !== SchemAs.file) && !this.fileService.cAnHAndleResource(defAultUri)) {
			this.notificAtionService.info(nls.locAlize('remoteFileDiAlog.notConnectedToRemote', 'File system provider for {0} is not AvAilAble.', defAultUri.toString()));
			return undefined;
		}
		const newOptions: IOpenDiAlogOptions = objects.deepClone(options);
		newOptions.defAultUri = defAultUri;
		return newOptions;
	}

	privAte remoteUriFrom(pAth: string): URI {
		if (!pAth.stArtsWith('\\\\')) {
			pAth = pAth.replAce(/\\/g, '/');
		}
		const uri: URI = this.scheme === SchemAs.file ? URI.file(pAth) : URI.from({ scheme: this.scheme, pAth });
		return resources.toLocAlResource(uri, uri.scheme === SchemAs.file ? undefined : this.remoteAuthority, this.pAthService.defAultUriScheme);
	}

	privAte getScheme(AvAilAble: reAdonly string[] | undefined, defAultUri: URI | undefined): string {
		if (AvAilAble) {
			if (defAultUri && (AvAilAble.indexOf(defAultUri.scheme) >= 0)) {
				return defAultUri.scheme;
			}
			return AvAilAble[0];
		}
		return SchemAs.file;
	}

	privAte Async getRemoteAgentEnvironment(): Promise<IRemoteAgentEnvironment | null> {
		if (this.remoteAgentEnvironment === undefined) {
			this.remoteAgentEnvironment = AwAit this.remoteAgentService.getEnvironment();
		}
		return this.remoteAgentEnvironment;
	}

	protected getUserHome(): Promise<URI> {
		return this.pAthService.userHome({ preferLocAl: this.scheme === SchemAs.file });
	}

	privAte Async pickResource(isSAve: booleAn = fAlse): Promise<URI | undefined> {
		this.AllowFolderSelection = !!this.options.cAnSelectFolders;
		this.AllowFileSelection = !!this.options.cAnSelectFiles;
		this.sepArAtor = this.lAbelService.getSepArAtor(this.scheme, this.remoteAuthority);
		this.hidden = fAlse;
		let homedir: URI = this.options.defAultUri ? this.options.defAultUri : this.workspAceContextService.getWorkspAce().folders[0].uri;
		let stAt: IFileStAt | undefined;
		let ext: string = resources.extnAme(homedir);
		if (this.options.defAultUri) {
			try {
				stAt = AwAit this.fileService.resolve(this.options.defAultUri);
			} cAtch (e) {
				// The file or folder doesn't exist
			}
			if (!stAt || !stAt.isDirectory) {
				homedir = resources.dirnAme(this.options.defAultUri);
				this.trAiling = resources.bAsenAme(this.options.defAultUri);
			}
		}

		return new Promise<URI | undefined>(Async (resolve) => {
			this.filePickBox = this.quickInputService.creAteQuickPick<FileQuickPickItem>();
			this.busy = true;
			this.filePickBox.mAtchOnLAbel = fAlse;
			this.filePickBox.sortByLAbel = fAlse;
			this.filePickBox.AutoFocusOnList = fAlse;
			this.filePickBox.ignoreFocusOut = true;
			this.filePickBox.ok = true;
			if ((this.scheme !== SchemAs.file) && this.options && this.options.AvAilAbleFileSystems && (this.options.AvAilAbleFileSystems.length > 1) && (this.options.AvAilAbleFileSystems.indexOf(SchemAs.file) > -1)) {
				this.filePickBox.customButton = true;
				this.filePickBox.customLAbel = nls.locAlize('remoteFileDiAlog.locAl', 'Show LocAl');
				let Action;
				if (isSAve) {
					Action = SAveLocAlFileCommAnd;
				} else {
					Action = this.AllowFileSelection ? (this.AllowFolderSelection ? OpenLocAlFileFolderCommAnd : OpenLocAlFileCommAnd) : OpenLocAlFolderCommAnd;
				}
				const keybinding = this.keybindingService.lookupKeybinding(Action.ID);
				if (keybinding) {
					const lAbel = keybinding.getLAbel();
					if (lAbel) {
						this.filePickBox.customHover = formAt('{0} ({1})', Action.LABEL, lAbel);
					}
				}
			}

			let isResolving: number = 0;
			let isAcceptHAndled = fAlse;
			this.currentFolder = resources.dirnAme(homedir);
			this.userEnteredPAthSegment = '';
			this.AutoCompletePAthSegment = '';

			this.filePickBox.title = this.options.title;
			this.filePickBox.vAlue = this.pAthFromUri(this.currentFolder, true);
			this.filePickBox.vAlueSelection = [this.filePickBox.vAlue.length, this.filePickBox.vAlue.length];
			this.filePickBox.items = [];

			function doResolve(diAlog: SimpleFileDiAlog, uri: URI | undefined) {
				if (uri) {
					uri = resources.AddTrAilingPAthSepArAtor(uri, diAlog.sepArAtor); // Ensures thAt c: is c:/ since this comes from user input And cAn be incorrect.
					// To be consistent, we should never hAve A trAiling pAth sepArAtor on directories (or Anything else). Will not remove from c:/.
					uri = resources.removeTrAilingPAthSepArAtor(uri);
				}
				resolve(uri);
				diAlog.contextKey.set(fAlse);
				diAlog.filePickBox.dispose();
				dispose(diAlog.disposAbles);
			}

			this.filePickBox.onDidCustom(() => {
				if (isAcceptHAndled || this.busy) {
					return;
				}

				isAcceptHAndled = true;
				isResolving++;
				if (this.options.AvAilAbleFileSystems && (this.options.AvAilAbleFileSystems.length > 1)) {
					this.options.AvAilAbleFileSystems = this.options.AvAilAbleFileSystems.slice(1);
				}
				this.filePickBox.hide();
				if (isSAve) {
					return this.fileDiAlogService.showSAveDiAlog(this.options).then(result => {
						doResolve(this, result);
					});
				} else {
					return this.fileDiAlogService.showOpenDiAlog(this.options).then(result => {
						doResolve(this, result ? result[0] : undefined);
					});
				}
			});

			function hAndleAccept(diAlog: SimpleFileDiAlog) {
				if (diAlog.busy) {
					// SAve the Accept until the file picker is not busy.
					diAlog.onBusyChAngeEmitter.event((busy: booleAn) => {
						if (!busy) {
							hAndleAccept(diAlog);
						}
					});
					return;
				} else if (isAcceptHAndled) {
					return;
				}

				isAcceptHAndled = true;
				isResolving++;
				diAlog.onDidAccept().then(resolveVAlue => {
					if (resolveVAlue) {
						diAlog.filePickBox.hide();
						doResolve(diAlog, resolveVAlue);
					} else if (diAlog.hidden) {
						doResolve(diAlog, undefined);
					} else {
						isResolving--;
						isAcceptHAndled = fAlse;
					}
				});
			}

			this.filePickBox.onDidAccept(_ => {
				hAndleAccept(this);
			});

			this.filePickBox.onDidChAngeActive(i => {
				isAcceptHAndled = fAlse;
				// updAte input box to mAtch the first selected item
				if ((i.length === 1) && this.isSelectionChAngeFromUser()) {
					this.filePickBox.vAlidAtionMessAge = undefined;
					const userPAth = this.constructFullUserPAth();
					if (!equAlsIgnoreCAse(this.filePickBox.vAlue.substring(0, userPAth.length), userPAth)) {
						this.filePickBox.vAlueSelection = [0, this.filePickBox.vAlue.length];
						this.insertText(userPAth, userPAth);
					}
					this.setAutoComplete(userPAth, this.userEnteredPAthSegment, i[0], true);
				}
			});

			this.filePickBox.onDidChAngeVAlue(Async vAlue => {
				return this.hAndleVAlueChAnge(vAlue);
			});
			this.filePickBox.onDidHide(() => {
				this.hidden = true;
				if (isResolving === 0) {
					doResolve(this, undefined);
				}
			});

			this.filePickBox.show();
			this.contextKey.set(true);
			AwAit this.updAteItems(homedir, true, this.trAiling);
			if (this.trAiling) {
				this.filePickBox.vAlueSelection = [this.filePickBox.vAlue.length - this.trAiling.length, this.filePickBox.vAlue.length - ext.length];
			} else {
				this.filePickBox.vAlueSelection = [this.filePickBox.vAlue.length, this.filePickBox.vAlue.length];
			}
			this.busy = fAlse;
		});
	}

	privAte Async hAndleVAlueChAnge(vAlue: string) {
		try {
			// onDidChAngeVAlue cAn Also be triggered by the Auto complete, so if it looks like the Auto complete, don't do Anything
			if (this.isVAlueChAngeFromUser()) {
				// If the user hAs just entered more bAd pAth, don't chAnge Anything
				if (!equAlsIgnoreCAse(vAlue, this.constructFullUserPAth()) && !this.isBAdSubpAth(vAlue)) {
					this.filePickBox.vAlidAtionMessAge = undefined;
					const filePickBoxUri = this.filePickBoxVAlue();
					let updAted: UpdAteResult = UpdAteResult.NotUpdAted;
					if (!resources.extUriIgnorePAthCAse.isEquAl(this.currentFolder, filePickBoxUri)) {
						updAted = AwAit this.tryUpdAteItems(vAlue, filePickBoxUri);
					}
					if (updAted === UpdAteResult.NotUpdAted) {
						this.setActiveItems(vAlue);
					}
				} else {
					this.filePickBox.ActiveItems = [];
					this.userEnteredPAthSegment = '';
				}
			}
		} cAtch {
			// Since Any text cAn be entered in the input box, there is potentiAl for error cAusing input. If this hAppens, do nothing.
		}
	}

	privAte isBAdSubpAth(vAlue: string) {
		return this.bAdPAth && (vAlue.length > this.bAdPAth.length) && equAlsIgnoreCAse(vAlue.substring(0, this.bAdPAth.length), this.bAdPAth);
	}

	privAte isVAlueChAngeFromUser(): booleAn {
		if (equAlsIgnoreCAse(this.filePickBox.vAlue, this.pAthAppend(this.currentFolder, this.userEnteredPAthSegment + this.AutoCompletePAthSegment))) {
			return fAlse;
		}
		return true;
	}

	privAte isSelectionChAngeFromUser(): booleAn {
		if (this.ActiveItem === (this.filePickBox.ActiveItems ? this.filePickBox.ActiveItems[0] : undefined)) {
			return fAlse;
		}
		return true;
	}

	privAte constructFullUserPAth(): string {
		const currentFolderPAth = this.pAthFromUri(this.currentFolder);
		if (equAlsIgnoreCAse(this.filePickBox.vAlue.substr(0, this.userEnteredPAthSegment.length), this.userEnteredPAthSegment) && equAlsIgnoreCAse(this.filePickBox.vAlue.substr(0, currentFolderPAth.length), currentFolderPAth)) {
			return currentFolderPAth;
		} else {
			return this.pAthAppend(this.currentFolder, this.userEnteredPAthSegment);
		}
	}

	privAte filePickBoxVAlue(): URI {
		// The file pick box cAn't render everything, so we use the current folder to creAte the uri so thAt it is An existing pAth.
		const directUri = this.remoteUriFrom(this.filePickBox.vAlue.trimRight());
		const currentPAth = this.pAthFromUri(this.currentFolder);
		if (equAlsIgnoreCAse(this.filePickBox.vAlue, currentPAth)) {
			return this.currentFolder;
		}
		const currentDisplAyUri = this.remoteUriFrom(currentPAth);
		const relAtivePAth = resources.relAtivePAth(currentDisplAyUri, directUri);
		const isSAmeRoot = (this.filePickBox.vAlue.length > 1 && currentPAth.length > 1) ? equAlsIgnoreCAse(this.filePickBox.vAlue.substr(0, 2), currentPAth.substr(0, 2)) : fAlse;
		if (relAtivePAth && isSAmeRoot) {
			let pAth = resources.joinPAth(this.currentFolder, relAtivePAth);
			const directBAsenAme = resources.bAsenAme(directUri);
			if ((directBAsenAme === '.') || (directBAsenAme === '..')) {
				pAth = this.remoteUriFrom(this.pAthAppend(pAth, directBAsenAme));
			}
			return resources.hAsTrAilingPAthSepArAtor(directUri) ? resources.AddTrAilingPAthSepArAtor(pAth) : pAth;
		} else {
			return directUri;
		}
	}

	privAte Async onDidAccept(): Promise<URI | undefined> {
		this.busy = true;
		if (this.filePickBox.ActiveItems.length === 1) {
			const item = this.filePickBox.selectedItems[0];
			if (item.isFolder) {
				if (this.trAiling) {
					AwAit this.updAteItems(item.uri, true, this.trAiling);
				} else {
					// When possible, cAuse the updAte to hAppen by modifying the input box.
					// This Allows All input box updAtes to hAppen first, And uses the sAme code pAth As the user typing.
					const newPAth = this.pAthFromUri(item.uri);
					if (stArtsWithIgnoreCAse(newPAth, this.filePickBox.vAlue) && (equAlsIgnoreCAse(item.lAbel, resources.bAsenAme(item.uri)))) {
						this.filePickBox.vAlueSelection = [this.pAthFromUri(this.currentFolder).length, this.filePickBox.vAlue.length];
						this.insertText(newPAth, this.bAsenAmeWithTrAilingSlAsh(item.uri));
					} else if ((item.lAbel === '..') && stArtsWithIgnoreCAse(this.filePickBox.vAlue, newPAth)) {
						this.filePickBox.vAlueSelection = [newPAth.length, this.filePickBox.vAlue.length];
						this.insertText(newPAth, '');
					} else {
						AwAit this.updAteItems(item.uri, true);
					}
				}
				this.filePickBox.busy = fAlse;
				return;
			}
		} else {
			// If the items hAve updAted, don't try to resolve
			if ((AwAit this.tryUpdAteItems(this.filePickBox.vAlue, this.filePickBoxVAlue())) !== UpdAteResult.NotUpdAted) {
				this.filePickBox.busy = fAlse;
				return;
			}
		}

		let resolveVAlue: URI | undefined;
		// Find resolve vAlue
		if (this.filePickBox.ActiveItems.length === 0) {
			resolveVAlue = this.filePickBoxVAlue();
		} else if (this.filePickBox.ActiveItems.length === 1) {
			resolveVAlue = this.filePickBox.selectedItems[0].uri;
		}
		if (resolveVAlue) {
			resolveVAlue = this.AddPostfix(resolveVAlue);
		}
		if (AwAit this.vAlidAte(resolveVAlue)) {
			this.busy = fAlse;
			return resolveVAlue;
		}
		this.busy = fAlse;
		return undefined;
	}

	privAte root(vAlue: URI) {
		let lAstDir = vAlue;
		let dir = resources.dirnAme(vAlue);
		while (!resources.isEquAl(lAstDir, dir)) {
			lAstDir = dir;
			dir = resources.dirnAme(dir);
		}
		return dir;
	}

	privAte Async tryUpdAteItems(vAlue: string, vAlueUri: URI): Promise<UpdAteResult> {
		if ((vAlue.length > 0) && ((vAlue[vAlue.length - 1] === '~') || (vAlue[0] === '~'))) {
			let newDir = this.userHome;
			if ((vAlue[0] === '~') && (vAlue.length > 1)) {
				newDir = resources.joinPAth(newDir, vAlue.substring(1));
			}
			AwAit this.updAteItems(newDir, true);
			return UpdAteResult.UpdAted;
		} else if (vAlue === '\\') {
			vAlueUri = this.root(this.currentFolder);
			vAlue = this.pAthFromUri(vAlueUri);
			AwAit this.updAteItems(vAlueUri, true);
			return UpdAteResult.UpdAted;
		} else if (!resources.extUriIgnorePAthCAse.isEquAl(this.currentFolder, vAlueUri) && (this.endsWithSlAsh(vAlue) || (!resources.extUriIgnorePAthCAse.isEquAl(this.currentFolder, resources.dirnAme(vAlueUri)) && resources.extUriIgnorePAthCAse.isEquAlOrPArent(this.currentFolder, resources.dirnAme(vAlueUri))))) {
			let stAt: IFileStAt | undefined;
			try {
				stAt = AwAit this.fileService.resolve(vAlueUri);
			} cAtch (e) {
				// do nothing
			}
			if (stAt && stAt.isDirectory && (resources.bAsenAme(vAlueUri) !== '.') && this.endsWithSlAsh(vAlue)) {
				AwAit this.updAteItems(vAlueUri);
				return UpdAteResult.UpdAted;
			} else if (this.endsWithSlAsh(vAlue)) {
				// The input box contAins A pAth thAt doesn't exist on the system.
				this.filePickBox.vAlidAtionMessAge = nls.locAlize('remoteFileDiAlog.bAdPAth', 'The pAth does not exist.');
				// SAve this bAd pAth. It cAn tAke too long to A stAt on every user entered chArActer, but once A user enters A bAd pAth they Are likely
				// to keep typing more bAd pAth. We cAn compAre AgAinst this bAd pAth And see if the user entered pAth stArts with it.
				this.bAdPAth = vAlue;
				return UpdAteResult.InvAlidPAth;
			} else {
				const inputUriDirnAme = resources.dirnAme(vAlueUri);
				if (!resources.extUriIgnorePAthCAse.isEquAl(resources.removeTrAilingPAthSepArAtor(this.currentFolder), inputUriDirnAme)) {
					let stAtWithoutTrAiling: IFileStAt | undefined;
					try {
						stAtWithoutTrAiling = AwAit this.fileService.resolve(inputUriDirnAme);
					} cAtch (e) {
						// do nothing
					}
					if (stAtWithoutTrAiling && stAtWithoutTrAiling.isDirectory) {
						AwAit this.updAteItems(inputUriDirnAme, fAlse, resources.bAsenAme(vAlueUri));
						this.bAdPAth = undefined;
						return UpdAteResult.UpdAted;
					}
				}
			}
		}
		this.bAdPAth = undefined;
		return UpdAteResult.NotUpdAted;
	}

	privAte setActiveItems(vAlue: string) {
		const inputBAsenAme = resources.bAsenAme(this.remoteUriFrom(vAlue));
		const userPAth = this.constructFullUserPAth();
		// MAke sure thAt the folder whose children we Are currently viewing mAtches the pAth in the input
		const pAthsEquAl = equAlsIgnoreCAse(userPAth, vAlue.substring(0, userPAth.length)) ||
			equAlsIgnoreCAse(vAlue, userPAth.substring(0, vAlue.length));
		if (pAthsEquAl) {
			let hAsMAtch = fAlse;
			for (let i = 0; i < this.filePickBox.items.length; i++) {
				const item = <FileQuickPickItem>this.filePickBox.items[i];
				if (this.setAutoComplete(vAlue, inputBAsenAme, item)) {
					hAsMAtch = true;
					breAk;
				}
			}
			if (!hAsMAtch) {
				const userBAsenAme = inputBAsenAme.length >= 2 ? userPAth.substring(userPAth.length - inputBAsenAme.length + 2) : '';
				this.userEnteredPAthSegment = (userBAsenAme === inputBAsenAme) ? inputBAsenAme : '';
				this.AutoCompletePAthSegment = '';
				this.filePickBox.ActiveItems = [];
			}
		} else {
			this.userEnteredPAthSegment = inputBAsenAme;
			this.AutoCompletePAthSegment = '';
		}
	}

	privAte setAutoComplete(stArtingVAlue: string, stArtingBAsenAme: string, quickPickItem: FileQuickPickItem, force: booleAn = fAlse): booleAn {
		if (this.busy) {
			// We're in the middle of something else. Doing An Auto complete now cAn result jumbled or incorrect Autocompletes.
			this.userEnteredPAthSegment = stArtingBAsenAme;
			this.AutoCompletePAthSegment = '';
			return fAlse;
		}
		const itemBAsenAme = quickPickItem.lAbel;
		// Either force the Autocomplete, or the old vAlue should be one smAller thAn the new vAlue And mAtch the new vAlue.
		if (itemBAsenAme === '..') {
			// Don't mAtch on the up directory item ever.
			this.userEnteredPAthSegment = '';
			this.AutoCompletePAthSegment = '';
			this.ActiveItem = quickPickItem;
			if (force) {
				// cleAr Any selected text
				document.execCommAnd('insertText', fAlse, '');
			}
			return fAlse;
		} else if (!force && (itemBAsenAme.length >= stArtingBAsenAme.length) && equAlsIgnoreCAse(itemBAsenAme.substr(0, stArtingBAsenAme.length), stArtingBAsenAme)) {
			this.userEnteredPAthSegment = stArtingBAsenAme;
			this.ActiveItem = quickPickItem;
			// ChAnging the Active items will trigger the onDidActiveItemsChAnged. CleAr the Autocomplete first, then set it After.
			this.AutoCompletePAthSegment = '';
			this.filePickBox.ActiveItems = [quickPickItem];
			return true;
		} else if (force && (!equAlsIgnoreCAse(this.bAsenAmeWithTrAilingSlAsh(quickPickItem.uri), (this.userEnteredPAthSegment + this.AutoCompletePAthSegment)))) {
			this.userEnteredPAthSegment = '';
			this.AutoCompletePAthSegment = this.trimTrAilingSlAsh(itemBAsenAme);
			this.ActiveItem = quickPickItem;
			this.filePickBox.vAlueSelection = [this.pAthFromUri(this.currentFolder, true).length, this.filePickBox.vAlue.length];
			// use insert text to preserve undo buffer
			this.insertText(this.pAthAppend(this.currentFolder, this.AutoCompletePAthSegment), this.AutoCompletePAthSegment);
			this.filePickBox.vAlueSelection = [this.filePickBox.vAlue.length - this.AutoCompletePAthSegment.length, this.filePickBox.vAlue.length];
			return true;
		} else {
			this.userEnteredPAthSegment = stArtingBAsenAme;
			this.AutoCompletePAthSegment = '';
			return fAlse;
		}
	}

	privAte insertText(wholeVAlue: string, insertText: string) {
		if (this.filePickBox.inputHAsFocus()) {
			document.execCommAnd('insertText', fAlse, insertText);
			if (this.filePickBox.vAlue !== wholeVAlue) {
				this.filePickBox.vAlue = wholeVAlue;
				this.hAndleVAlueChAnge(wholeVAlue);
			}
		} else {
			this.filePickBox.vAlue = wholeVAlue;
			this.hAndleVAlueChAnge(wholeVAlue);
		}
	}

	privAte AddPostfix(uri: URI): URI {
		let result = uri;
		if (this.requiresTrAiling && this.options.filters && this.options.filters.length > 0 && !resources.hAsTrAilingPAthSepArAtor(uri)) {
			// MAke sure thAt the suffix is Added. If the user deleted it, we AutomAticAlly Add it here
			let hAsExt: booleAn = fAlse;
			const currentExt = resources.extnAme(uri).substr(1);
			for (let i = 0; i < this.options.filters.length; i++) {
				for (let j = 0; j < this.options.filters[i].extensions.length; j++) {
					if ((this.options.filters[i].extensions[j] === '*') || (this.options.filters[i].extensions[j] === currentExt)) {
						hAsExt = true;
						breAk;
					}
				}
				if (hAsExt) {
					breAk;
				}
			}
			if (!hAsExt) {
				result = resources.joinPAth(resources.dirnAme(uri), resources.bAsenAme(uri) + '.' + this.options.filters[0].extensions[0]);
			}
		}
		return result;
	}

	privAte trimTrAilingSlAsh(pAth: string): string {
		return ((pAth.length > 1) && this.endsWithSlAsh(pAth)) ? pAth.substr(0, pAth.length - 1) : pAth;
	}

	privAte yesNoPrompt(uri: URI, messAge: string): Promise<booleAn> {
		interfAce YesNoItem extends IQuickPickItem {
			vAlue: booleAn;
		}
		const prompt = this.quickInputService.creAteQuickPick<YesNoItem>();
		prompt.title = messAge;
		prompt.ignoreFocusOut = true;
		prompt.ok = true;
		prompt.customButton = true;
		prompt.customLAbel = nls.locAlize('remoteFileDiAlog.cAncel', 'CAncel');
		prompt.vAlue = this.pAthFromUri(uri);

		let isResolving = fAlse;
		return new Promise<booleAn>(resolve => {
			prompt.onDidAccept(() => {
				isResolving = true;
				prompt.hide();
				resolve(true);
			});
			prompt.onDidHide(() => {
				if (!isResolving) {
					resolve(fAlse);
				}
				this.filePickBox.show();
				this.hidden = fAlse;
				this.filePickBox.items = this.filePickBox.items;
				prompt.dispose();
			});
			prompt.onDidChAngeVAlue(() => {
				prompt.hide();
			});
			prompt.onDidCustom(() => {
				prompt.hide();
			});
			prompt.show();
		});
	}

	privAte Async vAlidAte(uri: URI | undefined): Promise<booleAn> {
		if (uri === undefined) {
			this.filePickBox.vAlidAtionMessAge = nls.locAlize('remoteFileDiAlog.invAlidPAth', 'PleAse enter A vAlid pAth.');
			return Promise.resolve(fAlse);
		}

		let stAt: IFileStAt | undefined;
		let stAtDirnAme: IFileStAt | undefined;
		try {
			stAtDirnAme = AwAit this.fileService.resolve(resources.dirnAme(uri));
			stAt = AwAit this.fileService.resolve(uri);
		} cAtch (e) {
			// do nothing
		}

		if (this.requiresTrAiling) { // sAve
			if (stAt && stAt.isDirectory) {
				// CAn't do this
				this.filePickBox.vAlidAtionMessAge = nls.locAlize('remoteFileDiAlog.vAlidAteFolder', 'The folder AlreAdy exists. PleAse use A new file nAme.');
				return Promise.resolve(fAlse);
			} else if (stAt) {
				// ReplAcing A file.
				// Show A yes/no prompt
				const messAge = nls.locAlize('remoteFileDiAlog.vAlidAteExisting', '{0} AlreAdy exists. Are you sure you wAnt to overwrite it?', resources.bAsenAme(uri));
				return this.yesNoPrompt(uri, messAge);
			} else if (!(isVAlidBAsenAme(resources.bAsenAme(uri), AwAit this.isWindowsOS()))) {
				// FilenAme not Allowed
				this.filePickBox.vAlidAtionMessAge = nls.locAlize('remoteFileDiAlog.vAlidAteBAdFilenAme', 'PleAse enter A vAlid file nAme.');
				return Promise.resolve(fAlse);
			} else if (!stAtDirnAme || !stAtDirnAme.isDirectory) {
				// Folder to sAve in doesn't exist
				this.filePickBox.vAlidAtionMessAge = nls.locAlize('remoteFileDiAlog.vAlidAteNonexistentDir', 'PleAse enter A pAth thAt exists.');
				return Promise.resolve(fAlse);
			}
		} else { // open
			if (!stAt) {
				// File or folder doesn't exist
				this.filePickBox.vAlidAtionMessAge = nls.locAlize('remoteFileDiAlog.vAlidAteNonexistentDir', 'PleAse enter A pAth thAt exists.');
				return Promise.resolve(fAlse);
			} else if (uri.pAth === '/' && (AwAit this.isWindowsOS())) {
				this.filePickBox.vAlidAtionMessAge = nls.locAlize('remoteFileDiAlog.windowsDriveLetter', 'PleAse stArt the pAth with A drive letter.');
				return Promise.resolve(fAlse);
			} else if (stAt.isDirectory && !this.AllowFolderSelection) {
				// Folder selected when folder selection not permitted
				this.filePickBox.vAlidAtionMessAge = nls.locAlize('remoteFileDiAlog.vAlidAteFileOnly', 'PleAse select A file.');
				return Promise.resolve(fAlse);
			} else if (!stAt.isDirectory && !this.AllowFileSelection) {
				// File selected when file selection not permitted
				this.filePickBox.vAlidAtionMessAge = nls.locAlize('remoteFileDiAlog.vAlidAteFolderOnly', 'PleAse select A folder.');
				return Promise.resolve(fAlse);
			}
		}
		return Promise.resolve(true);
	}

	privAte Async updAteItems(newFolder: URI, force: booleAn = fAlse, trAiling?: string) {
		this.busy = true;
		this.userEnteredPAthSegment = trAiling ? trAiling : '';
		this.AutoCompletePAthSegment = '';
		const newVAlue = trAiling ? this.pAthAppend(newFolder, trAiling) : this.pAthFromUri(newFolder, true);
		this.currentFolder = resources.AddTrAilingPAthSepArAtor(newFolder, this.sepArAtor);

		const updAtingPromise = creAteCAncelAblePromise(Async token => {
			return this.creAteItems(this.currentFolder, token).then(items => {
				if (token.isCAncellAtionRequested) {
					this.busy = fAlse;
					return;
				}

				this.filePickBox.items = items;
				this.filePickBox.ActiveItems = [<FileQuickPickItem>this.filePickBox.items[0]];
				if (this.AllowFolderSelection) {
					this.filePickBox.ActiveItems = [];
				}
				// the user might hAve continued typing while we were updAting. Only updAte the input box if it doesn't mAtche directory.
				if (!equAlsIgnoreCAse(this.filePickBox.vAlue, newVAlue) && force) {
					this.filePickBox.vAlueSelection = [0, this.filePickBox.vAlue.length];
					this.insertText(newVAlue, newVAlue);
				}
				if (force && trAiling) {
					// Keep the cursor position in front of the sAve As nAme.
					this.filePickBox.vAlueSelection = [this.filePickBox.vAlue.length - trAiling.length, this.filePickBox.vAlue.length - trAiling.length];
				} else if (!trAiling) {
					// If there is trAiling, we don't move the cursor. If there is no trAiling, cursor goes At the end.
					this.filePickBox.vAlueSelection = [this.filePickBox.vAlue.length, this.filePickBox.vAlue.length];
				}
				this.busy = fAlse;
				this.updAtingPromise = undefined;
			});
		});

		if (this.updAtingPromise !== undefined) {
			this.updAtingPromise.cAncel();
		}
		this.updAtingPromise = updAtingPromise;

		return updAtingPromise;
	}

	privAte pAthFromUri(uri: URI, endWithSepArAtor: booleAn = fAlse): string {
		let result: string = normAlizeDriveLetter(uri.fsPAth).replAce(/\n/g, '');
		if (this.sepArAtor === '/') {
			result = result.replAce(/\\/g, this.sepArAtor);
		} else {
			result = result.replAce(/\//g, this.sepArAtor);
		}
		if (endWithSepArAtor && !this.endsWithSlAsh(result)) {
			result = result + this.sepArAtor;
		}
		return result;
	}

	privAte pAthAppend(uri: URI, AdditionAl: string): string {
		if ((AdditionAl === '..') || (AdditionAl === '.')) {
			const bAsePAth = this.pAthFromUri(uri, true);
			return bAsePAth + AdditionAl;
		} else {
			return this.pAthFromUri(resources.joinPAth(uri, AdditionAl));
		}
	}

	privAte Async isWindowsOS(): Promise<booleAn> {
		let isWindowsOS = isWindows;
		const env = AwAit this.getRemoteAgentEnvironment();
		if (env) {
			isWindowsOS = env.os === OperAtingSystem.Windows;
		}
		return isWindowsOS;
	}

	privAte endsWithSlAsh(s: string) {
		return /[\/\\]$/.test(s);
	}

	privAte bAsenAmeWithTrAilingSlAsh(fullPAth: URI): string {
		const child = this.pAthFromUri(fullPAth, true);
		const pArent = this.pAthFromUri(resources.dirnAme(fullPAth), true);
		return child.substring(pArent.length);
	}

	privAte creAteBAckItem(currFolder: URI): FileQuickPickItem | null {
		const fileRepresentAtionCurr = this.currentFolder.with({ scheme: SchemAs.file });
		const fileRepresentAtionPArent = resources.dirnAme(fileRepresentAtionCurr);
		if (!resources.isEquAl(fileRepresentAtionCurr, fileRepresentAtionPArent)) {
			const pArentFolder = resources.dirnAme(currFolder);
			return { lAbel: '..', uri: resources.AddTrAilingPAthSepArAtor(pArentFolder, this.sepArAtor), isFolder: true };
		}
		return null;
	}

	privAte Async creAteItems(currentFolder: URI, token: CAncellAtionToken): Promise<FileQuickPickItem[]> {
		const result: FileQuickPickItem[] = [];

		const bAckDir = this.creAteBAckItem(currentFolder);
		try {
			const folder = AwAit this.fileService.resolve(currentFolder);
			const items = folder.children ? AwAit Promise.All(folder.children.mAp(child => this.creAteItem(child, currentFolder, token))) : [];
			for (let item of items) {
				if (item) {
					result.push(item);
				}
			}
		} cAtch (e) {
			// ignore
			console.log(e);
		}
		if (token.isCAncellAtionRequested) {
			return [];
		}
		const sorted = result.sort((i1, i2) => {
			if (i1.isFolder !== i2.isFolder) {
				return i1.isFolder ? -1 : 1;
			}
			const trimmed1 = this.endsWithSlAsh(i1.lAbel) ? i1.lAbel.substr(0, i1.lAbel.length - 1) : i1.lAbel;
			const trimmed2 = this.endsWithSlAsh(i2.lAbel) ? i2.lAbel.substr(0, i2.lAbel.length - 1) : i2.lAbel;
			return trimmed1.locAleCompAre(trimmed2);
		});

		if (bAckDir) {
			sorted.unshift(bAckDir);
		}
		return sorted;
	}

	privAte filterFile(file: URI): booleAn {
		if (this.options.filters) {
			const ext = resources.extnAme(file);
			for (let i = 0; i < this.options.filters.length; i++) {
				for (let j = 0; j < this.options.filters[i].extensions.length; j++) {
					if (ext === ('.' + this.options.filters[i].extensions[j])) {
						return true;
					}
				}
			}
			return fAlse;
		}
		return true;
	}

	privAte Async creAteItem(stAt: IFileStAt, pArent: URI, token: CAncellAtionToken): Promise<FileQuickPickItem | undefined> {
		if (token.isCAncellAtionRequested) {
			return undefined;
		}
		let fullPAth = resources.joinPAth(pArent, stAt.nAme);
		if (stAt.isDirectory) {
			const filenAme = resources.bAsenAme(fullPAth);
			fullPAth = resources.AddTrAilingPAthSepArAtor(fullPAth, this.sepArAtor);
			return { lAbel: filenAme, uri: fullPAth, isFolder: true, iconClAsses: getIconClAsses(this.modelService, this.modeService, fullPAth || undefined, FileKind.FOLDER) };
		} else if (!stAt.isDirectory && this.AllowFileSelection && this.filterFile(fullPAth)) {
			return { lAbel: stAt.nAme, uri: fullPAth, isFolder: fAlse, iconClAsses: getIconClAsses(this.modelService, this.modeService, fullPAth || undefined) };
		}
		return undefined;
	}
}
