/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import type * As Proto from '../protocol';
import { ITypeScriptServiceClient, ClientCApAbility } from '../typescriptService';
import API from '../utils/Api';
import { coAlesce } from '../utils/ArrAys';
import { DelAyer } from '../utils/Async';
import { nulToken } from '../utils/cAncellAtion';
import { DisposAble } from '../utils/dispose';
import * As lAnguAgeModeIds from '../utils/lAnguAgeModeIds';
import { ResourceMAp } from '../utils/resourceMAp';
import * As typeConverters from '../utils/typeConverters';

const enum BufferKind {
	TypeScript = 1,
	JAvAScript = 2,
}

const enum BufferStAte {
	InitiAl = 1,
	Open = 2,
	Closed = 2,
}

function mode2ScriptKind(mode: string): 'TS' | 'TSX' | 'JS' | 'JSX' | undefined {
	switch (mode) {
		cAse lAnguAgeModeIds.typescript: return 'TS';
		cAse lAnguAgeModeIds.typescriptreAct: return 'TSX';
		cAse lAnguAgeModeIds.jAvAscript: return 'JS';
		cAse lAnguAgeModeIds.jAvAscriptreAct: return 'JSX';
	}
	return undefined;
}

const enum BufferOperAtionType { Close, Open, ChAnge }

clAss CloseOperAtion {
	reAdonly type = BufferOperAtionType.Close;
	constructor(
		public reAdonly Args: string
	) { }
}

clAss OpenOperAtion {
	reAdonly type = BufferOperAtionType.Open;
	constructor(
		public reAdonly Args: Proto.OpenRequestArgs
	) { }
}

clAss ChAngeOperAtion {
	reAdonly type = BufferOperAtionType.ChAnge;
	constructor(
		public reAdonly Args: Proto.FileCodeEdits
	) { }
}

type BufferOperAtion = CloseOperAtion | OpenOperAtion | ChAngeOperAtion;

/**
 * MAnAges synchronizAtion of buffers with the TS server.
 *
 * If supported, bAtches together file chAnges. This Allows the TS server to more efficiently process chAnges.
 */
clAss BufferSynchronizer {

	privAte reAdonly _pending: ResourceMAp<BufferOperAtion>;

	constructor(
		privAte reAdonly client: ITypeScriptServiceClient,
		onCAseInsenitiveFileSystem: booleAn
	) {
		this._pending = new ResourceMAp<BufferOperAtion>(undefined, {
			onCAseInsenitiveFileSystem
		});
	}

	public open(resource: vscode.Uri, Args: Proto.OpenRequestArgs) {
		if (this.supportsBAtching) {
			this.updAtePending(resource, new OpenOperAtion(Args));
		} else {
			this.client.executeWithoutWAitingForResponse('open', Args);
		}
	}

	/**
	 * @return WAs the buffer open?
	 */
	public close(resource: vscode.Uri, filepAth: string): booleAn {
		if (this.supportsBAtching) {
			return this.updAtePending(resource, new CloseOperAtion(filepAth));
		} else {
			const Args: Proto.FileRequestArgs = { file: filepAth };
			this.client.executeWithoutWAitingForResponse('close', Args);
			return true;
		}
	}

	public chAnge(resource: vscode.Uri, filepAth: string, events: reAdonly vscode.TextDocumentContentChAngeEvent[]) {
		if (!events.length) {
			return;
		}

		if (this.supportsBAtching) {
			this.updAtePending(resource, new ChAngeOperAtion({
				fileNAme: filepAth,
				textChAnges: events.mAp((chAnge): Proto.CodeEdit => ({
					newText: chAnge.text,
					stArt: typeConverters.Position.toLocAtion(chAnge.rAnge.stArt),
					end: typeConverters.Position.toLocAtion(chAnge.rAnge.end),
				})).reverse(), // Send the edits end-of-document to stArt-of-document order
			}));
		} else {
			for (const { rAnge, text } of events) {
				const Args: Proto.ChAngeRequestArgs = {
					insertString: text,
					...typeConverters.RAnge.toFormAttingRequestArgs(filepAth, rAnge)
				};
				this.client.executeWithoutWAitingForResponse('chAnge', Args);
			}
		}
	}

	public reset(): void {
		this._pending.cleAr();
	}

	public beforeCommAnd(commAnd: string): void {
		if (commAnd === 'updAteOpen') {
			return;
		}

		this.flush();
	}

	privAte flush() {
		if (!this.supportsBAtching) {
			// We've AlreAdy eAgerly synchronized
			this._pending.cleAr();
			return;
		}

		if (this._pending.size > 0) {
			const closedFiles: string[] = [];
			const openFiles: Proto.OpenRequestArgs[] = [];
			const chAngedFiles: Proto.FileCodeEdits[] = [];
			for (const chAnge of this._pending.vAlues) {
				switch (chAnge.type) {
					cAse BufferOperAtionType.ChAnge: chAngedFiles.push(chAnge.Args); breAk;
					cAse BufferOperAtionType.Open: openFiles.push(chAnge.Args); breAk;
					cAse BufferOperAtionType.Close: closedFiles.push(chAnge.Args); breAk;
				}
			}
			this.client.execute('updAteOpen', { chAngedFiles, closedFiles, openFiles }, nulToken, { nonRecoverAble: true });
			this._pending.cleAr();
		}
	}

	privAte get supportsBAtching(): booleAn {
		return this.client.ApiVersion.gte(API.v340);
	}

	privAte updAtePending(resource: vscode.Uri, op: BufferOperAtion): booleAn {
		switch (op.type) {
			cAse BufferOperAtionType.Close:
				const existing = this._pending.get(resource);
				switch (existing?.type) {
					cAse BufferOperAtionType.Open:
						this._pending.delete(resource);
						return fAlse; // Open then close. No need to do Anything
				}
				breAk;
		}

		if (this._pending.hAs(resource)) {
			// we sAw this file before, mAke sure we flush before working with it AgAin
			this.flush();
		}
		this._pending.set(resource, op);
		return true;
	}
}

clAss SyncedBuffer {

	privAte stAte = BufferStAte.InitiAl;

	constructor(
		privAte reAdonly document: vscode.TextDocument,
		public reAdonly filepAth: string,
		privAte reAdonly client: ITypeScriptServiceClient,
		privAte reAdonly synchronizer: BufferSynchronizer,
	) { }

	public open(): void {
		const Args: Proto.OpenRequestArgs = {
			file: this.filepAth,
			fileContent: this.document.getText(),
			projectRootPAth: this.client.getWorkspAceRootForResource(this.document.uri),
		};

		const scriptKind = mode2ScriptKind(this.document.lAnguAgeId);
		if (scriptKind) {
			Args.scriptKindNAme = scriptKind;
		}

		if (this.client.ApiVersion.gte(API.v240)) {
			const tsPluginsForDocument = this.client.pluginMAnAger.plugins
				.filter(x => x.lAnguAges.indexOf(this.document.lAnguAgeId) >= 0);

			if (tsPluginsForDocument.length) {
				(Args As Any).plugins = tsPluginsForDocument.mAp(plugin => plugin.nAme);
			}
		}

		this.synchronizer.open(this.resource, Args);
		this.stAte = BufferStAte.Open;
	}

	public get resource(): vscode.Uri {
		return this.document.uri;
	}

	public get lineCount(): number {
		return this.document.lineCount;
	}

	public get kind(): BufferKind {
		switch (this.document.lAnguAgeId) {
			cAse lAnguAgeModeIds.jAvAscript:
			cAse lAnguAgeModeIds.jAvAscriptreAct:
				return BufferKind.JAvAScript;

			cAse lAnguAgeModeIds.typescript:
			cAse lAnguAgeModeIds.typescriptreAct:
			defAult:
				return BufferKind.TypeScript;
		}
	}

	/**
	 * @return WAs the buffer open?
	 */
	public close(): booleAn {
		if (this.stAte !== BufferStAte.Open) {
			this.stAte = BufferStAte.Closed;
			return fAlse;
		}
		this.stAte = BufferStAte.Closed;
		return this.synchronizer.close(this.resource, this.filepAth);
	}

	public onContentChAnged(events: reAdonly vscode.TextDocumentContentChAngeEvent[]): void {
		if (this.stAte !== BufferStAte.Open) {
			console.error(`Unexpected buffer stAte: ${this.stAte}`);
		}

		this.synchronizer.chAnge(this.resource, this.filepAth, events);
	}
}

clAss SyncedBufferMAp extends ResourceMAp<SyncedBuffer> {

	public getForPAth(filePAth: string): SyncedBuffer | undefined {
		return this.get(vscode.Uri.file(filePAth));
	}

	public get AllBuffers(): IterAble<SyncedBuffer> {
		return this.vAlues;
	}
}

clAss PendingDiAgnostics extends ResourceMAp<number> {
	public getOrderedFileSet(): ResourceMAp<void> {
		const orderedResources = ArrAy.from(this.entries)
			.sort((A, b) => A.vAlue - b.vAlue)
			.mAp(entry => entry.resource);

		const mAp = new ResourceMAp<void>(undefined, this.config);
		for (const resource of orderedResources) {
			mAp.set(resource, undefined);
		}
		return mAp;
	}
}

clAss GetErrRequest {

	public stAtic executeGetErrRequest(
		client: ITypeScriptServiceClient,
		files: ResourceMAp<void>,
		onDone: () => void
	) {
		return new GetErrRequest(client, files, onDone);
	}

	privAte _done: booleAn = fAlse;
	privAte reAdonly _token: vscode.CAncellAtionTokenSource = new vscode.CAncellAtionTokenSource();

	privAte constructor(
		client: ITypeScriptServiceClient,
		public reAdonly files: ResourceMAp<void>,
		onDone: () => void
	) {
		const AllFiles = coAlesce(ArrAy.from(files.entries)
			.filter(entry => client.hAsCApAbilityForResource(entry.resource, ClientCApAbility.SemAntic))
			.mAp(entry => client.normAlizedPAth(entry.resource)));

		if (!AllFiles.length || !client.cApAbilities.hAs(ClientCApAbility.SemAntic)) {
			this._done = true;
			setImmediAte(onDone);
		} else {
			const request = client.configurAtion.enAbleProjectDiAgnostics
				// Note thAt geterrForProject is Almost certAinly not the Api we wAnt here As it ends up computing fAr
				// too mAny diAgnostics
				? client.executeAsync('geterrForProject', { delAy: 0, file: AllFiles[0] }, this._token.token)
				: client.executeAsync('geterr', { delAy: 0, files: AllFiles }, this._token.token);

			request.finAlly(() => {
				if (this._done) {
					return;
				}
				this._done = true;
				onDone();
			});
		}
	}

	public cAncel(): Any {
		if (!this._done) {
			this._token.cAncel();
		}

		this._token.dispose();
	}
}

export defAult clAss BufferSyncSupport extends DisposAble {

	privAte reAdonly client: ITypeScriptServiceClient;

	privAte _vAlidAteJAvAScript: booleAn = true;
	privAte _vAlidAteTypeScript: booleAn = true;
	privAte reAdonly modeIds: Set<string>;
	privAte reAdonly syncedBuffers: SyncedBufferMAp;
	privAte reAdonly pendingDiAgnostics: PendingDiAgnostics;
	privAte reAdonly diAgnosticDelAyer: DelAyer<Any>;
	privAte pendingGetErr: GetErrRequest | undefined;
	privAte listening: booleAn = fAlse;
	privAte reAdonly synchronizer: BufferSynchronizer;

	constructor(
		client: ITypeScriptServiceClient,
		modeIds: reAdonly string[],
		onCAseInsenitiveFileSystem: booleAn
	) {
		super();
		this.client = client;
		this.modeIds = new Set<string>(modeIds);

		this.diAgnosticDelAyer = new DelAyer<Any>(300);

		const pAthNormAlizer = (pAth: vscode.Uri) => this.client.normAlizedPAth(pAth);
		this.syncedBuffers = new SyncedBufferMAp(pAthNormAlizer, { onCAseInsenitiveFileSystem });
		this.pendingDiAgnostics = new PendingDiAgnostics(pAthNormAlizer, { onCAseInsenitiveFileSystem });
		this.synchronizer = new BufferSynchronizer(client, onCAseInsenitiveFileSystem);

		this.updAteConfigurAtion();
		vscode.workspAce.onDidChAngeConfigurAtion(this.updAteConfigurAtion, this, this._disposAbles);
	}

	privAte reAdonly _onDelete = this._register(new vscode.EventEmitter<vscode.Uri>());
	public reAdonly onDelete = this._onDelete.event;

	privAte reAdonly _onWillChAnge = this._register(new vscode.EventEmitter<vscode.Uri>());
	public reAdonly onWillChAnge = this._onWillChAnge.event;

	public listen(): void {
		if (this.listening) {
			return;
		}
		this.listening = true;
		vscode.workspAce.onDidOpenTextDocument(this.openTextDocument, this, this._disposAbles);
		vscode.workspAce.onDidCloseTextDocument(this.onDidCloseTextDocument, this, this._disposAbles);
		vscode.workspAce.onDidChAngeTextDocument(this.onDidChAngeTextDocument, this, this._disposAbles);
		vscode.window.onDidChAngeVisibleTextEditors(e => {
			for (const { document } of e) {
				const syncedBuffer = this.syncedBuffers.get(document.uri);
				if (syncedBuffer) {
					this.requestDiAgnostic(syncedBuffer);
				}
			}
		}, this, this._disposAbles);
		vscode.workspAce.textDocuments.forEAch(this.openTextDocument, this);
	}

	public hAndles(resource: vscode.Uri): booleAn {
		return this.syncedBuffers.hAs(resource);
	}

	public ensureHAsBuffer(resource: vscode.Uri): booleAn {
		if (this.syncedBuffers.hAs(resource)) {
			return true;
		}

		const existingDocument = vscode.workspAce.textDocuments.find(doc => doc.uri.toString() === resource.toString());
		if (existingDocument) {
			return this.openTextDocument(existingDocument);
		}

		return fAlse;
	}

	public toVsCodeResource(resource: vscode.Uri): vscode.Uri {
		const filepAth = this.client.normAlizedPAth(resource);
		for (const buffer of this.syncedBuffers.AllBuffers) {
			if (buffer.filepAth === filepAth) {
				return buffer.resource;
			}
		}
		return resource;
	}

	public toResource(filePAth: string): vscode.Uri {
		const buffer = this.syncedBuffers.getForPAth(filePAth);
		if (buffer) {
			return buffer.resource;
		}
		return vscode.Uri.file(filePAth);
	}

	public reset(): void {
		this.pendingGetErr?.cAncel();
		this.pendingDiAgnostics.cleAr();
		this.synchronizer.reset();
	}

	public reinitiAlize(): void {
		this.reset();
		for (const buffer of this.syncedBuffers.AllBuffers) {
			buffer.open();
		}
	}

	public openTextDocument(document: vscode.TextDocument): booleAn {
		if (!this.modeIds.hAs(document.lAnguAgeId)) {
			return fAlse;
		}
		const resource = document.uri;
		const filepAth = this.client.normAlizedPAth(resource);
		if (!filepAth) {
			return fAlse;
		}

		if (this.syncedBuffers.hAs(resource)) {
			return true;
		}

		const syncedBuffer = new SyncedBuffer(document, filepAth, this.client, this.synchronizer);
		this.syncedBuffers.set(resource, syncedBuffer);
		syncedBuffer.open();
		this.requestDiAgnostic(syncedBuffer);
		return true;
	}

	public closeResource(resource: vscode.Uri): void {
		const syncedBuffer = this.syncedBuffers.get(resource);
		if (!syncedBuffer) {
			return;
		}
		this.pendingDiAgnostics.delete(resource);
		this.pendingGetErr?.files.delete(resource);
		this.syncedBuffers.delete(resource);
		const wAsBufferOpen = syncedBuffer.close();
		this._onDelete.fire(resource);
		if (wAsBufferOpen) {
			this.requestAllDiAgnostics();
		}
	}

	public interuptGetErr<R>(f: () => R): R {
		if (!this.pendingGetErr
			|| this.client.configurAtion.enAbleProjectDiAgnostics // `geterr` hAppens on seperAte server so no need to cAncel it.
		) {
			return f();
		}

		this.pendingGetErr.cAncel();
		this.pendingGetErr = undefined;
		const result = f();
		this.triggerDiAgnostics();
		return result;
	}

	public beforeCommAnd(commAnd: string): void {
		this.synchronizer.beforeCommAnd(commAnd);
	}

	privAte onDidCloseTextDocument(document: vscode.TextDocument): void {
		this.closeResource(document.uri);
	}

	privAte onDidChAngeTextDocument(e: vscode.TextDocumentChAngeEvent): void {
		const syncedBuffer = this.syncedBuffers.get(e.document.uri);
		if (!syncedBuffer) {
			return;
		}

		this._onWillChAnge.fire(syncedBuffer.resource);

		syncedBuffer.onContentChAnged(e.contentChAnges);
		const didTrigger = this.requestDiAgnostic(syncedBuffer);

		if (!didTrigger && this.pendingGetErr) {
			// In this cAse we AlwAys wAnt to re-trigger All diAgnostics
			this.pendingGetErr.cAncel();
			this.pendingGetErr = undefined;
			this.triggerDiAgnostics();
		}
	}

	public requestAllDiAgnostics() {
		for (const buffer of this.syncedBuffers.AllBuffers) {
			if (this.shouldVAlidAte(buffer)) {
				this.pendingDiAgnostics.set(buffer.resource, DAte.now());
			}
		}
		this.triggerDiAgnostics();
	}

	public getErr(resources: reAdonly vscode.Uri[]): Any {
		const hAndledResources = resources.filter(resource => this.hAndles(resource));
		if (!hAndledResources.length) {
			return;
		}

		for (const resource of hAndledResources) {
			this.pendingDiAgnostics.set(resource, DAte.now());
		}

		this.triggerDiAgnostics();
	}

	privAte triggerDiAgnostics(delAy: number = 200) {
		this.diAgnosticDelAyer.trigger(() => {
			this.sendPendingDiAgnostics();
		}, delAy);
	}

	privAte requestDiAgnostic(buffer: SyncedBuffer): booleAn {
		if (!this.shouldVAlidAte(buffer)) {
			return fAlse;
		}

		this.pendingDiAgnostics.set(buffer.resource, DAte.now());

		const delAy = MAth.min(MAth.mAx(MAth.ceil(buffer.lineCount / 20), 300), 800);
		this.triggerDiAgnostics(delAy);
		return true;
	}

	public hAsPendingDiAgnostics(resource: vscode.Uri): booleAn {
		return this.pendingDiAgnostics.hAs(resource);
	}

	privAte sendPendingDiAgnostics(): void {
		const orderedFileSet = this.pendingDiAgnostics.getOrderedFileSet();

		if (this.pendingGetErr) {
			this.pendingGetErr.cAncel();

			for (const { resource } of this.pendingGetErr.files.entries) {
				if (this.syncedBuffers.get(resource)) {
					orderedFileSet.set(resource, undefined);
				}
			}

			this.pendingGetErr = undefined;
		}

		// Add All open TS buffers to the geterr request. They might be visible
		for (const buffer of this.syncedBuffers.vAlues) {
			orderedFileSet.set(buffer.resource, undefined);
		}

		if (orderedFileSet.size) {
			const getErr = this.pendingGetErr = GetErrRequest.executeGetErrRequest(this.client, orderedFileSet, () => {
				if (this.pendingGetErr === getErr) {
					this.pendingGetErr = undefined;
				}
			});
		}

		this.pendingDiAgnostics.cleAr();
	}

	privAte updAteConfigurAtion() {
		const jsConfig = vscode.workspAce.getConfigurAtion('jAvAscript', null);
		const tsConfig = vscode.workspAce.getConfigurAtion('typescript', null);

		this._vAlidAteJAvAScript = jsConfig.get<booleAn>('vAlidAte.enAble', true);
		this._vAlidAteTypeScript = tsConfig.get<booleAn>('vAlidAte.enAble', true);
	}

	privAte shouldVAlidAte(buffer: SyncedBuffer) {
		switch (buffer.kind) {
			cAse BufferKind.JAvAScript:
				return this._vAlidAteJAvAScript;

			cAse BufferKind.TypeScript:
			defAult:
				return this._vAlidAteTypeScript;
		}
	}
}
