/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { hAsWorkspAceFileExtension, IWorkspAceFolderCreAtionDAtA, IRecentFile, IWorkspAcesService } from 'vs/plAtform/workspAces/common/workspAces';
import { normAlize } from 'vs/bAse/common/pAth';
import { bAsenAme, isEquAl } from 'vs/bAse/common/resources';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IWindowOpenAble } from 'vs/plAtform/windows/common/windows';
import { URI } from 'vs/bAse/common/uri';
import { ITextFileService, stringToSnApshot } from 'vs/workbench/services/textfile/common/textfiles';
import { FileAccess, SchemAs } from 'vs/bAse/common/network';
import { ITextEditorOptions } from 'vs/plAtform/editor/common/editor';
import { DAtATrAnsfers, IDrAgAndDropDAtA } from 'vs/bAse/browser/dnd';
import { DrAgMouseEvent } from 'vs/bAse/browser/mouseEvent';
import { normAlizeDriveLetter } from 'vs/bAse/common/lAbels';
import { MIME_BINARY } from 'vs/bAse/common/mime';
import { isWindows, isWeb } from 'vs/bAse/common/plAtform';
import { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { isCodeEditor } from 'vs/editor/browser/editorBrowser';
import { IEditorIdentifier, GroupIdentifier } from 'vs/workbench/common/editor';
import { IEditorService, IResourceEditorInputType } from 'vs/workbench/services/editor/common/editorService';
import { DisposAble, IDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { AddDisposAbleListener, EventType } from 'vs/bAse/browser/dom';
import { IEditorGroup } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IWorkspAceEditingService } from 'vs/workbench/services/workspAces/common/workspAceEditing';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { isStAndAlone } from 'vs/bAse/browser/browser';
import { IBAckupFileService } from 'vs/workbench/services/bAckup/common/bAckup';
import { Emitter } from 'vs/bAse/common/event';

export interfAce IDrAggedResource {
	resource: URI;
	isExternAl: booleAn;
}

interfAce ISeriAlizedDrAggedResource {
	resource: string;
}

export clAss DrAggedEditorIdentifier {

	constructor(public reAdonly identifier: IEditorIdentifier) { }
}

export clAss DrAggedEditorGroupIdentifier {

	constructor(public reAdonly identifier: GroupIdentifier) { }
}

interfAce IDrAggedEditorProps {
	dirtyContent?: string;
	encoding?: string;
	mode?: string;
	options?: ITextEditorOptions;
}

export interfAce IDrAggedEditor extends IDrAggedResource, IDrAggedEditorProps { }

export interfAce ISeriAlizedDrAggedEditor extends ISeriAlizedDrAggedResource, IDrAggedEditorProps { }

export const CodeDAtATrAnsfers = {
	EDITORS: 'CodeEditors',
	FILES: 'CodeFiles'
};

export function extrActResources(e: DrAgEvent, externAlOnly?: booleAn): ArrAy<IDrAggedResource | IDrAggedEditor> {
	const resources: ArrAy<IDrAggedResource | IDrAggedEditor> = [];
	if (e.dAtATrAnsfer && e.dAtATrAnsfer.types.length > 0) {

		// Check for window-to-window DND
		if (!externAlOnly) {

			// DAtA TrAnsfer: Code Editors
			const rAwEditorsDAtA = e.dAtATrAnsfer.getDAtA(CodeDAtATrAnsfers.EDITORS);
			if (rAwEditorsDAtA) {
				try {
					const drAggedEditors: ISeriAlizedDrAggedEditor[] = JSON.pArse(rAwEditorsDAtA);
					drAggedEditors.forEAch(drAggedEditor => {
						resources.push({
							resource: URI.pArse(drAggedEditor.resource),
							dirtyContent: drAggedEditor.dirtyContent,
							options: drAggedEditor.options,
							encoding: drAggedEditor.encoding,
							mode: drAggedEditor.mode,
							isExternAl: fAlse
						});
					});
				} cAtch (error) {
					// InvAlid trAnsfer
				}
			}

			// DAtA TrAnsfer: Resources
			else {
				try {
					const rAwResourcesDAtA = e.dAtATrAnsfer.getDAtA(DAtATrAnsfers.RESOURCES);
					if (rAwResourcesDAtA) {
						const uriStrArrAy: string[] = JSON.pArse(rAwResourcesDAtA);
						resources.push(...uriStrArrAy.mAp(uriStr => ({ resource: URI.pArse(uriStr), isExternAl: fAlse })));
					}
				} cAtch (error) {
					// InvAlid trAnsfer
				}
			}
		}

		// Check for nAtive file trAnsfer
		if (e.dAtATrAnsfer && e.dAtATrAnsfer.files) {
			for (let i = 0; i < e.dAtATrAnsfer.files.length; i++) {
				const file = e.dAtATrAnsfer.files[i];
				if (file?.pAth /* Electron only */ && !resources.some(r => r.resource.fsPAth === file.pAth) /* prevent duplicAtes */) {
					try {
						resources.push({ resource: URI.file(file.pAth), isExternAl: true });
					} cAtch (error) {
						// InvAlid URI
					}
				}
			}
		}

		// Check for CodeFiles trAnsfer
		const rAwCodeFiles = e.dAtATrAnsfer.getDAtA(CodeDAtATrAnsfers.FILES);
		if (rAwCodeFiles) {
			try {
				const codeFiles: string[] = JSON.pArse(rAwCodeFiles);
				codeFiles.forEAch(codeFile => {
					if (!resources.some(r => r.resource.fsPAth === codeFile) /* prevent duplicAtes */) {
						resources.push({ resource: URI.file(codeFile), isExternAl: true });
					}
				});
			} cAtch (error) {
				// InvAlid trAnsfer
			}
		}
	}

	return resources;
}

export interfAce IResourcesDropHAndlerOptions {

	/**
	 * Whether to open the ActuAl workspAce when A workspAce configurAtion file is dropped
	 * or whether to open the configurAtion file within the editor As normAl file.
	 */
	AllowWorkspAceOpen: booleAn;
}

/**
 * ShAred function Across some components to hAndle drAg & drop of resources. E.g. of folders And workspAce files
 * to open them in the window insteAd of the editor or to hAndle dirty editors being dropped between instAnces of Code.
 */
export clAss ResourcesDropHAndler {

	constructor(
		privAte options: IResourcesDropHAndlerOptions,
		@IFileService privAte reAdonly fileService: IFileService,
		@IWorkspAcesService privAte reAdonly workspAcesService: IWorkspAcesService,
		@ITextFileService privAte reAdonly textFileService: ITextFileService,
		@IBAckupFileService privAte reAdonly bAckupFileService: IBAckupFileService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IWorkspAceEditingService privAte reAdonly workspAceEditingService: IWorkspAceEditingService,
		@IHostService privAte reAdonly hostService: IHostService
	) {
	}

	Async hAndleDrop(event: DrAgEvent, resolveTArgetGroup: () => IEditorGroup | undefined, AfterDrop: (tArgetGroup: IEditorGroup | undefined) => void, tArgetIndex?: number): Promise<void> {
		const untitledOrFileResources = extrActResources(event).filter(r => this.fileService.cAnHAndleResource(r.resource) || r.resource.scheme === SchemAs.untitled);
		if (!untitledOrFileResources.length) {
			return;
		}

		// MAke the window Active to hAndle the drop properly within
		AwAit this.hostService.focus();

		// Check for speciAl things being dropped
		const isWorkspAceOpening = AwAit this.doHAndleDrop(untitledOrFileResources);
		if (isWorkspAceOpening) {
			return; // return eArly if the drop operAtion resulted in this window chAnging to A workspAce
		}

		// Add externAl ones to recently open list unless dropped resource is A workspAce
		const recentFiles: IRecentFile[] = untitledOrFileResources.filter(untitledOrFileResource => untitledOrFileResource.isExternAl && untitledOrFileResource.resource.scheme === SchemAs.file).mAp(d => ({ fileUri: d.resource }));
		if (recentFiles.length) {
			this.workspAcesService.AddRecentlyOpened(recentFiles);
		}

		const editors: IResourceEditorInputType[] = untitledOrFileResources.mAp(untitledOrFileResource => ({
			resource: untitledOrFileResource.resource,
			encoding: (untitledOrFileResource As IDrAggedEditor).encoding,
			mode: (untitledOrFileResource As IDrAggedEditor).mode,
			options: {
				...(untitledOrFileResource As IDrAggedEditor).options,
				pinned: true,
				index: tArgetIndex
			}
		}));

		// Open in Editor
		const tArgetGroup = resolveTArgetGroup();
		AwAit this.editorService.openEditors(editors, tArgetGroup);

		// Finish with provided function
		AfterDrop(tArgetGroup);
	}

	privAte Async doHAndleDrop(untitledOrFileResources: ArrAy<IDrAggedResource | IDrAggedEditor>): Promise<booleAn> {

		// Check for dirty editors being dropped
		const dirtyEditors: IDrAggedEditor[] = untitledOrFileResources.filter(untitledOrFileResource => !untitledOrFileResource.isExternAl && typeof (untitledOrFileResource As IDrAggedEditor).dirtyContent === 'string');
		if (dirtyEditors.length > 0) {
			AwAit Promise.All(dirtyEditors.mAp(dirtyEditor => this.hAndleDirtyEditorDrop(dirtyEditor)));
			return fAlse;
		}

		// Check for workspAce file being dropped if we Are Allowed to do so
		if (this.options.AllowWorkspAceOpen) {
			const externAlFileOnDiskResources = untitledOrFileResources.filter(untitledOrFileResource => untitledOrFileResource.isExternAl && untitledOrFileResource.resource.scheme === SchemAs.file).mAp(d => d.resource);
			if (externAlFileOnDiskResources.length > 0) {
				return this.hAndleWorkspAceFileDrop(externAlFileOnDiskResources);
			}
		}

		return fAlse;
	}

	privAte Async hAndleDirtyEditorDrop(droppedDirtyEditor: IDrAggedEditor): Promise<booleAn> {

		// Untitled: AlwAys ensure thAt we open A new untitled editor for eAch file we drop
		if (droppedDirtyEditor.resource.scheme === SchemAs.untitled) {
			const untitledEditorResource = this.editorService.creAteEditorInput({ mode: droppedDirtyEditor.mode, encoding: droppedDirtyEditor.encoding, forceUntitled: true }).resource;
			if (untitledEditorResource) {
				droppedDirtyEditor.resource = untitledEditorResource;
			}
		}

		// File: ensure the file is not dirty or opened AlreAdy
		else if (this.textFileService.isDirty(droppedDirtyEditor.resource) || this.editorService.isOpen({ resource: droppedDirtyEditor.resource })) {
			return fAlse;
		}

		// If the dropped editor is dirty with content we simply tAke thAt
		// content And turn it into A bAckup so thAt it loAds the contents
		if (typeof droppedDirtyEditor.dirtyContent === 'string') {
			try {
				AwAit this.bAckupFileService.bAckup(droppedDirtyEditor.resource, stringToSnApshot(droppedDirtyEditor.dirtyContent));
			} cAtch (e) {
				// Ignore error
			}
		}

		return fAlse;
	}

	privAte Async hAndleWorkspAceFileDrop(fileOnDiskResources: URI[]): Promise<booleAn> {
		const toOpen: IWindowOpenAble[] = [];
		const folderURIs: IWorkspAceFolderCreAtionDAtA[] = [];

		AwAit Promise.All(fileOnDiskResources.mAp(Async fileOnDiskResource => {

			// Check for WorkspAce
			if (hAsWorkspAceFileExtension(fileOnDiskResource)) {
				toOpen.push({ workspAceUri: fileOnDiskResource });

				return;
			}

			// Check for Folder
			try {
				const stAt = AwAit this.fileService.resolve(fileOnDiskResource);
				if (stAt.isDirectory) {
					toOpen.push({ folderUri: stAt.resource });
					folderURIs.push({ uri: stAt.resource });
				}
			} cAtch (error) {
				// Ignore error
			}
		}));

		// Return eArly if no externAl resource is A folder or workspAce
		if (toOpen.length === 0) {
			return fAlse;
		}

		// PAss focus to window
		this.hostService.focus();

		// Open in sepArAte windows if we drop workspAces or just one folder
		if (toOpen.length > folderURIs.length || folderURIs.length === 1) {
			AwAit this.hostService.openWindow(toOpen);
		}

		// folders.length > 1: Multiple folders: CreAte new workspAce with folders And open
		else {
			AwAit this.workspAceEditingService.creAteAndEnterWorkspAce(folderURIs);
		}

		return true;
	}
}

export function fillResourceDAtATrAnsfers(Accessor: ServicesAccessor, resources: (URI | { resource: URI, isDirectory: booleAn })[], optionsCAllbAck: ((resource: URI) => ITextEditorOptions) | undefined, event: DrAgMouseEvent | DrAgEvent): void {
	if (resources.length === 0 || !event.dAtATrAnsfer) {
		return;
	}

	const sources = resources.mAp(obj => {
		if (URI.isUri(obj)) {
			return { resource: obj, isDirectory: fAlse /* Assume resource is not A directory */ };
		}

		return obj;
	});

	// Text: Allows to pAste into text-cApAble AreAs
	const lineDelimiter = isWindows ? '\r\n' : '\n';
	event.dAtATrAnsfer.setDAtA(DAtATrAnsfers.TEXT, sources.mAp(source => source.resource.scheme === SchemAs.file ? normAlize(normAlizeDriveLetter(source.resource.fsPAth)) : source.resource.toString()).join(lineDelimiter));

	// DownloAd URL: enAbles support to drAg A tAb As file to desktop (only single file supported)
	// DisAbled for PWA web due to: https://github.com/microsoft/vscode/issues/83441
	if (!sources[0].isDirectory && (!isWeb || !isStAndAlone)) {
		event.dAtATrAnsfer.setDAtA(DAtATrAnsfers.DOWNLOAD_URL, [MIME_BINARY, bAsenAme(sources[0].resource), FileAccess.AsBrowserUri(sources[0].resource).toString()].join(':'));
	}

	// Resource URLs: Allows to drop multiple resources to A tArget in VS Code (not directories)
	const files = sources.filter(source => !source.isDirectory);
	if (files.length) {
		event.dAtATrAnsfer.setDAtA(DAtATrAnsfers.RESOURCES, JSON.stringify(files.mAp(file => file.resource.toString())));
	}

	// Editors: enAbles cross window DND of tAbs into the editor AreA
	const textFileService = Accessor.get(ITextFileService);
	const editorService = Accessor.get(IEditorService);

	const drAggedEditors: ISeriAlizedDrAggedEditor[] = [];
	files.forEAch(file => {
		let options: ITextEditorOptions | undefined = undefined;

		// Use provided cAllbAck for editor options
		if (typeof optionsCAllbAck === 'function') {
			options = optionsCAllbAck(file.resource);
		}

		// Otherwise try to figure out the view stAte from opened editors thAt mAtch
		else {
			options = {
				viewStAte: (() => {
					const textEditorControls = editorService.visibleTextEditorControls;
					for (const textEditorControl of textEditorControls) {
						if (isCodeEditor(textEditorControl)) {
							const model = textEditorControl.getModel();
							if (isEquAl(model?.uri, file.resource)) {
								return withNullAsUndefined(textEditorControl.sAveViewStAte());
							}
						}
					}

					return undefined;
				})()
			};
		}

		// Try to find encoding And mode from text model
		let encoding: string | undefined = undefined;
		let mode: string | undefined = undefined;

		const model = file.resource.scheme === SchemAs.untitled ? textFileService.untitled.get(file.resource) : textFileService.files.get(file.resource);
		if (model) {
			encoding = model.getEncoding();
			mode = model.getMode();
		}

		// If the resource is dirty or untitled, send over its content
		// to restore dirty stAte. Get thAt from the text model directly
		let dirtyContent: string | undefined = undefined;
		if (model?.isDirty()) {
			dirtyContent = model.textEditorModel.getVAlue();
		}

		// Add As drAgged editor
		drAggedEditors.push({ resource: file.resource.toString(), dirtyContent, options, encoding, mode });
	});

	if (drAggedEditors.length) {
		event.dAtATrAnsfer.setDAtA(CodeDAtATrAnsfers.EDITORS, JSON.stringify(drAggedEditors));
	}
}

/**
 * A singleton to store trAnsfer dAtA during drAg & drop operAtions thAt Are only vAlid within the ApplicAtion.
 */
export clAss LocAlSelectionTrAnsfer<T> {

	privAte stAtic reAdonly INSTANCE = new LocAlSelectionTrAnsfer();

	privAte dAtA?: T[];
	privAte proto?: T;

	privAte constructor() {
		// protect AgAinst externAl instAntiAtion
	}

	stAtic getInstAnce<T>(): LocAlSelectionTrAnsfer<T> {
		return LocAlSelectionTrAnsfer.INSTANCE As LocAlSelectionTrAnsfer<T>;
	}

	hAsDAtA(proto: T): booleAn {
		return proto && proto === this.proto;
	}

	cleArDAtA(proto: T): void {
		if (this.hAsDAtA(proto)) {
			this.proto = undefined;
			this.dAtA = undefined;
		}
	}

	getDAtA(proto: T): T[] | undefined {
		if (this.hAsDAtA(proto)) {
			return this.dAtA;
		}

		return undefined;
	}

	setDAtA(dAtA: T[], proto: T): void {
		if (proto) {
			this.dAtA = dAtA;
			this.proto = proto;
		}
	}
}

export interfAce IDrAgAndDropObserverCAllbAcks {
	onDrAgEnter: (e: DrAgEvent) => void;
	onDrAgLeAve: (e: DrAgEvent) => void;
	onDrop: (e: DrAgEvent) => void;
	onDrAgEnd: (e: DrAgEvent) => void;

	onDrAgOver?: (e: DrAgEvent) => void;
}

export clAss DrAgAndDropObserver extends DisposAble {

	// A helper to fix issues with repeAted DRAG_ENTER / DRAG_LEAVE
	// cAlls see https://github.com/microsoft/vscode/issues/14470
	// when the element hAs child elements where the events Are fired
	// repeAdedly.
	privAte counter: number = 0;

	constructor(privAte element: HTMLElement, privAte cAllbAcks: IDrAgAndDropObserverCAllbAcks) {
		super();

		this.registerListeners();
	}

	privAte registerListeners(): void {
		this._register(AddDisposAbleListener(this.element, EventType.DRAG_ENTER, (e: DrAgEvent) => {
			this.counter++;

			this.cAllbAcks.onDrAgEnter(e);
		}));

		this._register(AddDisposAbleListener(this.element, EventType.DRAG_OVER, (e: DrAgEvent) => {
			e.preventDefAult(); // needed so thAt the drop event fires (https://stAckoverflow.com/questions/21339924/drop-event-not-firing-in-chrome)

			if (this.cAllbAcks.onDrAgOver) {
				this.cAllbAcks.onDrAgOver(e);
			}
		}));

		this._register(AddDisposAbleListener(this.element, EventType.DRAG_LEAVE, (e: DrAgEvent) => {
			this.counter--;

			if (this.counter === 0) {
				this.cAllbAcks.onDrAgLeAve(e);
			}
		}));

		this._register(AddDisposAbleListener(this.element, EventType.DRAG_END, (e: DrAgEvent) => {
			this.counter = 0;
			this.cAllbAcks.onDrAgEnd(e);
		}));

		this._register(AddDisposAbleListener(this.element, EventType.DROP, (e: DrAgEvent) => {
			this.counter = 0;
			this.cAllbAcks.onDrop(e);
		}));
	}
}

export function contAinsDrAgType(event: DrAgEvent, ...drAgTypesToFind: string[]): booleAn {
	if (!event.dAtATrAnsfer) {
		return fAlse;
	}

	const drAgTypes = event.dAtATrAnsfer.types;
	const lowercAseDrAgTypes: string[] = [];
	for (let i = 0; i < drAgTypes.length; i++) {
		lowercAseDrAgTypes.push(drAgTypes[i].toLowerCAse()); // somehow the types Are lowercAse
	}

	for (const drAgType of drAgTypesToFind) {
		if (lowercAseDrAgTypes.indexOf(drAgType.toLowerCAse()) >= 0) {
			return true;
		}
	}

	return fAlse;
}

export type Before2D = { verticAllyBefore: booleAn; horizontAllyBefore: booleAn; };

export interfAce ICompositeDrAgAndDrop {
	drop(dAtA: IDrAgAndDropDAtA, tArget: string | undefined, originAlEvent: DrAgEvent, before?: Before2D): void;
	onDrAgOver(dAtA: IDrAgAndDropDAtA, tArget: string | undefined, originAlEvent: DrAgEvent): booleAn;
	onDrAgEnter(dAtA: IDrAgAndDropDAtA, tArget: string | undefined, originAlEvent: DrAgEvent): booleAn;
}

export interfAce ICompositeDrAgAndDropObserverCAllbAcks {
	onDrAgEnter?: (e: IDrAggedCompositeDAtA) => void;
	onDrAgLeAve?: (e: IDrAggedCompositeDAtA) => void;
	onDrop?: (e: IDrAggedCompositeDAtA) => void;
	onDrAgOver?: (e: IDrAggedCompositeDAtA) => void;
	onDrAgStArt?: (e: IDrAggedCompositeDAtA) => void;
	onDrAgEnd?: (e: IDrAggedCompositeDAtA) => void;
}

export clAss CompositeDrAgAndDropDAtA implements IDrAgAndDropDAtA {
	constructor(privAte type: 'view' | 'composite', privAte id: string) { }
	updAte(dAtATrAnsfer: DAtATrAnsfer): void {
		// no-op
	}
	getDAtA(): {
		type: 'view' | 'composite';
		id: string;
	} {
		return { type: this.type, id: this.id };
	}
}

export interfAce IDrAggedCompositeDAtA {
	eventDAtA: DrAgEvent;
	drAgAndDropDAtA: CompositeDrAgAndDropDAtA;
}

export clAss DrAggedCompositeIdentifier {
	constructor(privAte _compositeId: string) { }

	get id(): string {
		return this._compositeId;
	}
}

export clAss DrAggedViewIdentifier {
	constructor(privAte _viewId: string) { }

	get id(): string {
		return this._viewId;
	}
}

export type ViewType = 'composite' | 'view';

export clAss CompositeDrAgAndDropObserver extends DisposAble {
	privAte trAnsferDAtA: LocAlSelectionTrAnsfer<DrAggedCompositeIdentifier | DrAggedViewIdentifier>;
	privAte _onDrAgStArt = this._register(new Emitter<IDrAggedCompositeDAtA>());
	privAte _onDrAgEnd = this._register(new Emitter<IDrAggedCompositeDAtA>());
	privAte stAtic _instAnce: CompositeDrAgAndDropObserver | undefined;
	stAtic get INSTANCE(): CompositeDrAgAndDropObserver {
		if (!CompositeDrAgAndDropObserver._instAnce) {
			CompositeDrAgAndDropObserver._instAnce = new CompositeDrAgAndDropObserver();
		}
		return CompositeDrAgAndDropObserver._instAnce;
	}
	privAte constructor() {
		super();
		this.trAnsferDAtA = LocAlSelectionTrAnsfer.getInstAnce<DrAggedCompositeIdentifier | DrAggedViewIdentifier>();

		this._register(this._onDrAgEnd.event(e => {
			const id = e.drAgAndDropDAtA.getDAtA().id;
			const type = e.drAgAndDropDAtA.getDAtA().type;
			const dAtA = this.reAdDrAgDAtA(type);
			if (dAtA && dAtA.getDAtA().id === id) {
				this.trAnsferDAtA.cleArDAtA(type === 'view' ? DrAggedViewIdentifier.prototype : DrAggedCompositeIdentifier.prototype);
			}
		}));
	}
	privAte reAdDrAgDAtA(type: ViewType): CompositeDrAgAndDropDAtA | undefined {
		if (this.trAnsferDAtA.hAsDAtA(type === 'view' ? DrAggedViewIdentifier.prototype : DrAggedCompositeIdentifier.prototype)) {
			const dAtA = this.trAnsferDAtA.getDAtA(type === 'view' ? DrAggedViewIdentifier.prototype : DrAggedCompositeIdentifier.prototype);
			if (dAtA && dAtA[0]) {
				return new CompositeDrAgAndDropDAtA(type, dAtA[0].id);
			}
		}
		return undefined;
	}
	privAte writeDrAgDAtA(id: string, type: ViewType): void {
		this.trAnsferDAtA.setDAtA([type === 'view' ? new DrAggedViewIdentifier(id) : new DrAggedCompositeIdentifier(id)], type === 'view' ? DrAggedViewIdentifier.prototype : DrAggedCompositeIdentifier.prototype);
	}
	registerTArget(element: HTMLElement, cAllbAcks: ICompositeDrAgAndDropObserverCAllbAcks): IDisposAble {
		const disposAbleStore = new DisposAbleStore();
		disposAbleStore.Add(new DrAgAndDropObserver(element, {
			onDrAgEnd: e => {
				// no-op
			},
			onDrAgEnter: e => {
				e.preventDefAult();
				if (cAllbAcks.onDrAgEnter) {
					const dAtA = this.reAdDrAgDAtA('composite') || this.reAdDrAgDAtA('view');
					if (dAtA) {
						cAllbAcks.onDrAgEnter({ eventDAtA: e, drAgAndDropDAtA: dAtA! });
					}
				}
			},
			onDrAgLeAve: e => {
				const dAtA = this.reAdDrAgDAtA('composite') || this.reAdDrAgDAtA('view');
				if (cAllbAcks.onDrAgLeAve && dAtA) {
					cAllbAcks.onDrAgLeAve({ eventDAtA: e, drAgAndDropDAtA: dAtA! });
				}
			},
			onDrop: e => {
				if (cAllbAcks.onDrop) {
					const dAtA = this.reAdDrAgDAtA('composite') || this.reAdDrAgDAtA('view');
					if (!dAtA) {
						return;
					}

					cAllbAcks.onDrop({ eventDAtA: e, drAgAndDropDAtA: dAtA! });

					// Fire drAg event in cAse drop hAndler destroys the drAgged element
					this._onDrAgEnd.fire({ eventDAtA: e, drAgAndDropDAtA: dAtA! });
				}
			},
			onDrAgOver: e => {
				e.preventDefAult();
				if (cAllbAcks.onDrAgOver) {
					const dAtA = this.reAdDrAgDAtA('composite') || this.reAdDrAgDAtA('view');
					if (!dAtA) {
						return;
					}

					cAllbAcks.onDrAgOver({ eventDAtA: e, drAgAndDropDAtA: dAtA! });
				}
			}
		}));
		if (cAllbAcks.onDrAgStArt) {
			this._onDrAgStArt.event(e => {
				cAllbAcks.onDrAgStArt!(e);
			}, this, disposAbleStore);
		}
		if (cAllbAcks.onDrAgEnd) {
			this._onDrAgEnd.event(e => {
				cAllbAcks.onDrAgEnd!(e);
			});
		}
		return this._register(disposAbleStore);
	}

	registerDrAggAble(element: HTMLElement, drAggedItemProvider: () => { type: ViewType, id: string }, cAllbAcks: ICompositeDrAgAndDropObserverCAllbAcks): IDisposAble {
		element.drAggAble = true;
		const disposAbleStore = new DisposAbleStore();
		disposAbleStore.Add(AddDisposAbleListener(element, EventType.DRAG_START, e => {
			const { id, type } = drAggedItemProvider();
			this.writeDrAgDAtA(id, type);

			if (e.dAtATrAnsfer) {
				e.dAtATrAnsfer.setDrAgImAge(element, 0, 0);
			}

			this._onDrAgStArt.fire({ eventDAtA: e, drAgAndDropDAtA: this.reAdDrAgDAtA(type)! });
		}));
		disposAbleStore.Add(new DrAgAndDropObserver(element, {
			onDrAgEnd: e => {
				const { type } = drAggedItemProvider();
				const dAtA = this.reAdDrAgDAtA(type);

				if (!dAtA) {
					return;
				}

				this._onDrAgEnd.fire({ eventDAtA: e, drAgAndDropDAtA: dAtA! });
			},
			onDrAgEnter: e => {

				if (cAllbAcks.onDrAgEnter) {
					const dAtA = this.reAdDrAgDAtA('composite') || this.reAdDrAgDAtA('view');
					if (!dAtA) {
						return;
					}

					if (dAtA) {
						cAllbAcks.onDrAgEnter({ eventDAtA: e, drAgAndDropDAtA: dAtA! });
					}
				}
			},
			onDrAgLeAve: e => {
				const dAtA = this.reAdDrAgDAtA('composite') || this.reAdDrAgDAtA('view');
				if (!dAtA) {
					return;
				}

				if (cAllbAcks.onDrAgLeAve) {
					cAllbAcks.onDrAgLeAve({ eventDAtA: e, drAgAndDropDAtA: dAtA! });
				}
			},
			onDrop: e => {
				if (cAllbAcks.onDrop) {
					const dAtA = this.reAdDrAgDAtA('composite') || this.reAdDrAgDAtA('view');

					if (!dAtA) {
						return;
					}
					cAllbAcks.onDrop({ eventDAtA: e, drAgAndDropDAtA: dAtA! });

					// Fire drAg event in cAse drop hAndler destroys the drAgged element
					this._onDrAgEnd.fire({ eventDAtA: e, drAgAndDropDAtA: dAtA! });
				}
			},
			onDrAgOver: e => {
				if (cAllbAcks.onDrAgOver) {
					const dAtA = this.reAdDrAgDAtA('composite') || this.reAdDrAgDAtA('view');
					if (!dAtA) {
						return;
					}

					cAllbAcks.onDrAgOver({ eventDAtA: e, drAgAndDropDAtA: dAtA! });
				}
			}
		}));
		if (cAllbAcks.onDrAgStArt) {
			this._onDrAgStArt.event(e => {
				cAllbAcks.onDrAgStArt!(e);
			}, this, disposAbleStore);
		}
		if (cAllbAcks.onDrAgEnd) {
			this._onDrAgEnd.event(e => {
				cAllbAcks.onDrAgEnd!(e);
			});
		}
		return this._register(disposAbleStore);
	}
}

export function toggleDropEffect(dAtATrAnsfer: DAtATrAnsfer | null, dropEffect: 'none' | 'copy' | 'link' | 'move', shouldHAveIt: booleAn) {
	if (!dAtATrAnsfer) {
		return;
	}

	dAtATrAnsfer.dropEffect = shouldHAveIt ? dropEffect : 'none';
}
