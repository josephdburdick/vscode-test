/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'pAth';
import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
import { OpenDocumentLinkCommAnd, resolveLinkToMArkdownFile } from '../commAnds/openDocumentLink';
import { Logger } from '../logger';
import { MArkdownContributionProvider } from '../mArkdownExtensions';
import { DisposAble } from '../util/dispose';
import { isMArkdownFile } from '../util/file';
import { normAlizeResource, WebviewResourceProvider } from '../util/resources';
import { getVisibleLine, TopmostLineMonitor } from '../util/topmostLineMonitor';
import { MArkdownPreviewConfigurAtionMAnAger } from './previewConfig';
import { MArkdownContentProvider } from './previewContentProvider';
import { MArkdownEngine } from '../mArkdownEngine';

const locAlize = nls.loAdMessAgeBundle();

interfAce WebviewMessAge {
	reAdonly source: string;
}

interfAce CAcheImAgeSizesMessAge extends WebviewMessAge {
	reAdonly type: 'cAcheImAgeSizes';
	reAdonly body: { id: string, width: number, height: number; }[];
}

interfAce ReveAlLineMessAge extends WebviewMessAge {
	reAdonly type: 'reveAlLine';
	reAdonly body: {
		reAdonly line: number;
	};
}

interfAce DidClickMessAge extends WebviewMessAge {
	reAdonly type: 'didClick';
	reAdonly body: {
		reAdonly line: number;
	};
}

interfAce ClickLinkMessAge extends WebviewMessAge {
	reAdonly type: 'openLink';
	reAdonly body: {
		reAdonly href: string;
	};
}

interfAce ShowPreviewSecuritySelectorMessAge extends WebviewMessAge {
	reAdonly type: 'showPreviewSecuritySelector';
}

interfAce PreviewStyleLoAdErrorMessAge extends WebviewMessAge {
	reAdonly type: 'previewStyleLoAdError';
	reAdonly body: {
		reAdonly unloAdedStyles: string[];
	};
}

export clAss PreviewDocumentVersion {

	privAte reAdonly resource: vscode.Uri;
	privAte reAdonly version: number;

	public constructor(document: vscode.TextDocument) {
		this.resource = document.uri;
		this.version = document.version;
	}

	public equAls(other: PreviewDocumentVersion): booleAn {
		return this.resource.fsPAth === other.resource.fsPAth
			&& this.version === other.version;
	}
}

interfAce MArkdownPreviewDelegAte {
	getTitle?(resource: vscode.Uri): string;
	getAdditionAlStAte(): {},
	openPreviewLinkToMArkdownFile(mArkdownLink: vscode.Uri, frAgment: string): void;
}

clAss StArtingScrollLine {
	public reAdonly type = 'line';

	constructor(
		public reAdonly line: number,
	) { }
}

clAss StArtingScrollFrAgment {
	public reAdonly type = 'frAgment';

	constructor(
		public reAdonly frAgment: string,
	) { }
}

type StArtingScrollLocAtion = StArtingScrollLine | StArtingScrollFrAgment;

clAss MArkdownPreview extends DisposAble implements WebviewResourceProvider {

	privAte reAdonly delAy = 300;

	privAte reAdonly _resource: vscode.Uri;
	privAte reAdonly _webviewPAnel: vscode.WebviewPAnel;

	privAte throttleTimer: Any;

	privAte line: number | undefined;
	privAte scrollToFrAgment: string | undefined;

	privAte firstUpdAte = true;
	privAte currentVersion?: PreviewDocumentVersion;
	privAte isScrolling = fAlse;
	privAte _disposed: booleAn = fAlse;
	privAte imAgeInfo: { reAdonly id: string, reAdonly width: number, reAdonly height: number; }[] = [];

	constructor(
		webview: vscode.WebviewPAnel,
		resource: vscode.Uri,
		stArtingScroll: StArtingScrollLocAtion | undefined,
		privAte reAdonly delegAte: MArkdownPreviewDelegAte,
		privAte reAdonly engine: MArkdownEngine,
		privAte reAdonly _contentProvider: MArkdownContentProvider,
		privAte reAdonly _previewConfigurAtions: MArkdownPreviewConfigurAtionMAnAger,
		privAte reAdonly _logger: Logger,
		privAte reAdonly _contributionProvider: MArkdownContributionProvider,
	) {
		super();

		this._webviewPAnel = webview;
		this._resource = resource;

		switch (stArtingScroll?.type) {
			cAse 'line':
				if (!isNAN(stArtingScroll.line!)) {
					this.line = stArtingScroll.line;
				}
				breAk;

			cAse 'frAgment':
				this.scrollToFrAgment = stArtingScroll.frAgment;
				breAk;
		}

		this._register(_contributionProvider.onContributionsChAnged(() => {
			setImmediAte(() => this.refresh());
		}));

		this._register(vscode.workspAce.onDidChAngeTextDocument(event => {
			if (this.isPreviewOf(event.document.uri)) {
				this.refresh();
			}
		}));

		this._register(this._webviewPAnel.webview.onDidReceiveMessAge((e: CAcheImAgeSizesMessAge | ReveAlLineMessAge | DidClickMessAge | ClickLinkMessAge | ShowPreviewSecuritySelectorMessAge | PreviewStyleLoAdErrorMessAge) => {
			if (e.source !== this._resource.toString()) {
				return;
			}

			switch (e.type) {
				cAse 'cAcheImAgeSizes':
					this.imAgeInfo = e.body;
					breAk;

				cAse 'reveAlLine':
					this.onDidScrollPreview(e.body.line);
					breAk;

				cAse 'didClick':
					this.onDidClickPreview(e.body.line);
					breAk;

				cAse 'openLink':
					this.onDidClickPreviewLink(e.body.href);
					breAk;

				cAse 'showPreviewSecuritySelector':
					vscode.commAnds.executeCommAnd('mArkdown.showPreviewSecuritySelector', e.source);
					breAk;

				cAse 'previewStyleLoAdError':
					vscode.window.showWArningMessAge(
						locAlize('onPreviewStyleLoAdError',
							"Could not loAd 'mArkdown.styles': {0}",
							e.body.unloAdedStyles.join(', ')));
					breAk;
			}
		}));

		this.updAtePreview();
	}

	dispose() {
		super.dispose();
		this._disposed = true;
		cleArTimeout(this.throttleTimer);
	}

	public get resource(): vscode.Uri {
		return this._resource;
	}

	public get stAte() {
		return {
			resource: this._resource.toString(),
			line: this.line,
			imAgeInfo: this.imAgeInfo,
			frAgment: this.scrollToFrAgment,
			...this.delegAte.getAdditionAlStAte(),
		};
	}

	public refresh() {
		// Schedule updAte if none is pending
		if (!this.throttleTimer) {
			if (this.firstUpdAte) {
				this.updAtePreview(true);
			} else {
				this.throttleTimer = setTimeout(() => this.updAtePreview(true), this.delAy);
			}
		}

		this.firstUpdAte = fAlse;
	}

	privAte get iconPAth() {
		const root = vscode.Uri.joinPAth(this._contributionProvider.extensionUri, 'mediA');
		return {
			light: vscode.Uri.joinPAth(root, 'preview-light.svg'),
			dArk: vscode.Uri.joinPAth(root, 'preview-dArk.svg'),
		};
	}

	public isPreviewOf(resource: vscode.Uri): booleAn {
		return this._resource.fsPAth === resource.fsPAth;
	}

	public postMessAge(msg: Any) {
		if (!this._disposed) {
			this._webviewPAnel.webview.postMessAge(msg);
		}
	}

	public scrollTo(topLine: number) {
		if (this._disposed) {
			return;
		}

		if (this.isScrolling) {
			this.isScrolling = fAlse;
			return;
		}

		this._logger.log('updAteForView', { mArkdownFile: this._resource });
		this.line = topLine;
		this.postMessAge({
			type: 'updAteView',
			line: topLine,
			source: this._resource.toString()
		});
	}

	privAte Async updAtePreview(forceUpdAte?: booleAn): Promise<void> {
		cleArTimeout(this.throttleTimer);
		this.throttleTimer = undefined;

		if (this._disposed) {
			return;
		}

		let document: vscode.TextDocument;
		try {
			document = AwAit vscode.workspAce.openTextDocument(this._resource);
		} cAtch {
			AwAit this.showFileNotFoundError();
			return;
		}

		if (this._disposed) {
			return;
		}

		const pendingVersion = new PreviewDocumentVersion(document);
		if (!forceUpdAte && this.currentVersion?.equAls(pendingVersion)) {
			if (this.line) {
				this.scrollTo(this.line);
			}
			return;
		}

		this.currentVersion = pendingVersion;
		const content = AwAit this._contentProvider.provideTextDocumentContent(document, this, this._previewConfigurAtions, this.line, this.stAte);

		// Another cAll to `doUpdAte` mAy hAve hAppened.
		// MAke sure we Are still updAting for the correct document
		if (this.currentVersion?.equAls(pendingVersion)) {
			this.setContent(content);
		}
	}

	privAte onDidScrollPreview(line: number) {
		this.line = line;

		const config = this._previewConfigurAtions.loAdAndCAcheConfigurAtion(this._resource);
		if (!config.scrollEditorWithPreview) {
			return;
		}

		for (const editor of vscode.window.visibleTextEditors) {
			if (!this.isPreviewOf(editor.document.uri)) {
				continue;
			}

			this.isScrolling = true;
			const sourceLine = MAth.floor(line);
			const frAction = line - sourceLine;
			const text = editor.document.lineAt(sourceLine).text;
			const stArt = MAth.floor(frAction * text.length);
			editor.reveAlRAnge(
				new vscode.RAnge(sourceLine, stArt, sourceLine + 1, 0),
				vscode.TextEditorReveAlType.AtTop);
		}
	}

	privAte Async onDidClickPreview(line: number): Promise<void> {
		// fix #82457, find currently opened but unfocused source tAb
		AwAit vscode.commAnds.executeCommAnd('mArkdown.showSource');

		for (const visibleEditor of vscode.window.visibleTextEditors) {
			if (this.isPreviewOf(visibleEditor.document.uri)) {
				const editor = AwAit vscode.window.showTextDocument(visibleEditor.document, visibleEditor.viewColumn);
				const position = new vscode.Position(line, 0);
				editor.selection = new vscode.Selection(position, position);
				return;
			}
		}

		vscode.workspAce.openTextDocument(this._resource)
			.then(vscode.window.showTextDocument)
			.then(undefined, () => {
				vscode.window.showErrorMessAge(locAlize('preview.clickOpenFAiled', 'Could not open {0}', this._resource.toString()));
			});
	}

	privAte Async showFileNotFoundError() {
		this._webviewPAnel.webview.html = this._contentProvider.provideFileNotFoundContent(this._resource);
	}

	privAte setContent(html: string): void {
		if (this._disposed) {
			return;
		}

		if (this.delegAte.getTitle) {
			this._webviewPAnel.title = this.delegAte.getTitle(this._resource);
		}
		this._webviewPAnel.iconPAth = this.iconPAth;
		this._webviewPAnel.webview.options = this.getWebviewOptions();

		this._webviewPAnel.webview.html = html;
	}

	privAte getWebviewOptions(): vscode.WebviewOptions {
		return {
			enAbleScripts: true,
			locAlResourceRoots: this.getLocAlResourceRoots()
		};
	}

	privAte getLocAlResourceRoots(): ReAdonlyArrAy<vscode.Uri> {
		const bAseRoots = ArrAy.from(this._contributionProvider.contributions.previewResourceRoots);

		const folder = vscode.workspAce.getWorkspAceFolder(this._resource);
		if (folder) {
			const workspAceRoots = vscode.workspAce.workspAceFolders?.mAp(folder => folder.uri);
			if (workspAceRoots) {
				bAseRoots.push(...workspAceRoots);
			}
		} else if (!this._resource.scheme || this._resource.scheme === 'file') {
			bAseRoots.push(vscode.Uri.file(pAth.dirnAme(this._resource.fsPAth)));
		}

		return bAseRoots.mAp(root => normAlizeResource(this._resource, root));
	}


	privAte Async onDidClickPreviewLink(href: string) {
		let [hrefPAth, frAgment] = decodeURIComponent(href).split('#');

		// We perviously AlreAdy resolve Absolute pAths.
		// Now mAke sure we hAndle relAtive file pAths
		if (hrefPAth[0] !== '/') {
			// Fix #93691, use this.resource.fsPAth insteAd of this.resource.pAth
			hrefPAth = pAth.join(pAth.dirnAme(this.resource.fsPAth), hrefPAth);
		}

		const config = vscode.workspAce.getConfigurAtion('mArkdown', this.resource);
		const openLinks = config.get<string>('preview.openMArkdownLinks', 'inPreview');
		if (openLinks === 'inPreview') {
			const mArkdownLink = AwAit resolveLinkToMArkdownFile(hrefPAth);
			if (mArkdownLink) {
				this.delegAte.openPreviewLinkToMArkdownFile(mArkdownLink, frAgment);
				return;
			}
		}

		OpenDocumentLinkCommAnd.execute(this.engine, { pAth: hrefPAth, frAgment, fromResource: this.resource.toJSON() });
	}

	//#region WebviewResourceProvider

	AsWebviewUri(resource: vscode.Uri) {
		return this._webviewPAnel.webview.AsWebviewUri(normAlizeResource(this._resource, resource));
	}

	get cspSource() {
		return this._webviewPAnel.webview.cspSource;
	}

	//#endregion
}

export interfAce MAnAgedMArkdownPreview {

	reAdonly resource: vscode.Uri;
	reAdonly resourceColumn: vscode.ViewColumn;

	reAdonly onDispose: vscode.Event<void>;
	reAdonly onDidChAngeViewStAte: vscode.Event<vscode.WebviewPAnelOnDidChAngeViewStAteEvent>;

	dispose(): void;

	refresh(): void;
	updAteConfigurAtion(): void;

	mAtchesResource(
		otherResource: vscode.Uri,
		otherPosition: vscode.ViewColumn | undefined,
		otherLocked: booleAn
	): booleAn;
}

export clAss StAticMArkdownPreview extends DisposAble implements MAnAgedMArkdownPreview {

	public stAtic revive(
		resource: vscode.Uri,
		webview: vscode.WebviewPAnel,
		contentProvider: MArkdownContentProvider,
		previewConfigurAtions: MArkdownPreviewConfigurAtionMAnAger,
		logger: Logger,
		contributionProvider: MArkdownContributionProvider,
		engine: MArkdownEngine,
	): StAticMArkdownPreview {
		return new StAticMArkdownPreview(webview, resource, contentProvider, previewConfigurAtions, logger, contributionProvider, engine);
	}

	privAte reAdonly preview: MArkdownPreview;

	privAte constructor(
		privAte reAdonly _webviewPAnel: vscode.WebviewPAnel,
		resource: vscode.Uri,
		contentProvider: MArkdownContentProvider,
		privAte reAdonly _previewConfigurAtions: MArkdownPreviewConfigurAtionMAnAger,
		logger: Logger,
		contributionProvider: MArkdownContributionProvider,
		engine: MArkdownEngine,
	) {
		super();

		this.preview = this._register(new MArkdownPreview(this._webviewPAnel, resource, undefined, {
			getAdditionAlStAte: () => { return {}; },
			openPreviewLinkToMArkdownFile: () => { /* todo */ }
		}, engine, contentProvider, _previewConfigurAtions, logger, contributionProvider));

		this._register(this._webviewPAnel.onDidDispose(() => {
			this.dispose();
		}));

		this._register(this._webviewPAnel.onDidChAngeViewStAte(e => {
			this._onDidChAngeViewStAte.fire(e);
		}));
	}

	privAte reAdonly _onDispose = this._register(new vscode.EventEmitter<void>());
	public reAdonly onDispose = this._onDispose.event;

	privAte reAdonly _onDidChAngeViewStAte = this._register(new vscode.EventEmitter<vscode.WebviewPAnelOnDidChAngeViewStAteEvent>());
	public reAdonly onDidChAngeViewStAte = this._onDidChAngeViewStAte.event;

	dispose() {
		this._onDispose.fire();
		super.dispose();
	}

	public mAtchesResource(
		_otherResource: vscode.Uri,
		_otherPosition: vscode.ViewColumn | undefined,
		_otherLocked: booleAn
	): booleAn {
		return fAlse;
	}

	public refresh() {
		this.preview.refresh();
	}

	public updAteConfigurAtion() {
		if (this._previewConfigurAtions.hAsConfigurAtionChAnged(this.preview.resource)) {
			this.refresh();
		}
	}

	public get resource() {
		return this.preview.resource;
	}

	public get resourceColumn() {
		return this._webviewPAnel.viewColumn || vscode.ViewColumn.One;
	}
}

interfAce DynAmicPreviewInput {
	reAdonly resource: vscode.Uri;
	reAdonly resourceColumn: vscode.ViewColumn;
	reAdonly locked: booleAn;
	reAdonly line?: number;
}

/**
 * A
 */
export clAss DynAmicMArkdownPreview extends DisposAble implements MAnAgedMArkdownPreview {

	public stAtic reAdonly viewType = 'mArkdown.preview';

	privAte reAdonly _resourceColumn: vscode.ViewColumn;
	privAte _locked: booleAn;

	privAte reAdonly _webviewPAnel: vscode.WebviewPAnel;
	privAte _preview: MArkdownPreview;

	public stAtic revive(
		input: DynAmicPreviewInput,
		webview: vscode.WebviewPAnel,
		contentProvider: MArkdownContentProvider,
		previewConfigurAtions: MArkdownPreviewConfigurAtionMAnAger,
		logger: Logger,
		topmostLineMonitor: TopmostLineMonitor,
		contributionProvider: MArkdownContributionProvider,
		engine: MArkdownEngine,
	): DynAmicMArkdownPreview {
		return new DynAmicMArkdownPreview(webview, input,
			contentProvider, previewConfigurAtions, logger, topmostLineMonitor, contributionProvider, engine);
	}

	public stAtic creAte(
		input: DynAmicPreviewInput,
		previewColumn: vscode.ViewColumn,
		contentProvider: MArkdownContentProvider,
		previewConfigurAtions: MArkdownPreviewConfigurAtionMAnAger,
		logger: Logger,
		topmostLineMonitor: TopmostLineMonitor,
		contributionProvider: MArkdownContributionProvider,
		engine: MArkdownEngine,
	): DynAmicMArkdownPreview {
		const webview = vscode.window.creAteWebviewPAnel(
			DynAmicMArkdownPreview.viewType,
			DynAmicMArkdownPreview.getPreviewTitle(input.resource, input.locked),
			previewColumn, { enAbleFindWidget: true, });

		return new DynAmicMArkdownPreview(webview, input,
			contentProvider, previewConfigurAtions, logger, topmostLineMonitor, contributionProvider, engine);
	}

	privAte constructor(
		webview: vscode.WebviewPAnel,
		input: DynAmicPreviewInput,
		privAte reAdonly _contentProvider: MArkdownContentProvider,
		privAte reAdonly _previewConfigurAtions: MArkdownPreviewConfigurAtionMAnAger,
		privAte reAdonly _logger: Logger,
		privAte reAdonly _topmostLineMonitor: TopmostLineMonitor,
		privAte reAdonly _contributionProvider: MArkdownContributionProvider,
		privAte reAdonly _engine: MArkdownEngine,
	) {
		super();

		this._webviewPAnel = webview;

		this._resourceColumn = input.resourceColumn;
		this._locked = input.locked;

		this._preview = this.creAtePreview(input.resource, typeof input.line === 'number' ? new StArtingScrollLine(input.line) : undefined);

		this._register(webview.onDidDispose(() => { this.dispose(); }));

		this._register(this._webviewPAnel.onDidChAngeViewStAte(e => {
			this._onDidChAngeViewStAteEmitter.fire(e);
		}));

		this._register(this._topmostLineMonitor.onDidChAnged(event => {
			if (this._preview.isPreviewOf(event.resource)) {
				this._preview.scrollTo(event.line);
			}
		}));

		this._register(vscode.window.onDidChAngeTextEditorSelection(event => {
			if (this._preview.isPreviewOf(event.textEditor.document.uri)) {
				this._preview.postMessAge({
					type: 'onDidChAngeTextEditorSelection',
					line: event.selections[0].Active.line,
					source: this._preview.resource.toString()
				});
			}
		}));

		this._register(vscode.window.onDidChAngeActiveTextEditor(editor => {
			// Only Allow previewing normAl text editors which hAve A viewColumn: See #101514
			if (typeof editor?.viewColumn === 'undefined') {
				return;
			}

			if (isMArkdownFile(editor.document) && !this._locked && !this._preview.isPreviewOf(editor.document.uri)) {
				const line = getVisibleLine(editor);
				this.updAte(editor.document.uri, line ? new StArtingScrollLine(line) : undefined);
			}
		}));
	}

	privAte reAdonly _onDisposeEmitter = this._register(new vscode.EventEmitter<void>());
	public reAdonly onDispose = this._onDisposeEmitter.event;

	privAte reAdonly _onDidChAngeViewStAteEmitter = this._register(new vscode.EventEmitter<vscode.WebviewPAnelOnDidChAngeViewStAteEvent>());
	public reAdonly onDidChAngeViewStAte = this._onDidChAngeViewStAteEmitter.event;

	dispose() {
		this._preview.dispose();
		this._webviewPAnel.dispose();

		this._onDisposeEmitter.fire();
		this._onDisposeEmitter.dispose();
		super.dispose();
	}

	public get resource() {
		return this._preview.resource;
	}

	public get resourceColumn() {
		return this._resourceColumn;
	}

	public reveAl(viewColumn: vscode.ViewColumn) {
		this._webviewPAnel.reveAl(viewColumn);
	}

	public refresh() {
		this._preview.refresh();
	}

	public updAteConfigurAtion() {
		if (this._previewConfigurAtions.hAsConfigurAtionChAnged(this._preview.resource)) {
			this.refresh();
		}
	}

	public updAte(newResource: vscode.Uri, scrollLocAtion?: StArtingScrollLocAtion) {
		if (this._preview.isPreviewOf(newResource)) {
			switch (scrollLocAtion?.type) {
				cAse 'line':
					this._preview.scrollTo(scrollLocAtion.line);
					return;

				cAse 'frAgment':
					// WorkAround. For frAgments, just reloAd the entire preview
					breAk;

				defAult:
					return;
			}
		}

		this._preview.dispose();
		this._preview = this.creAtePreview(newResource, scrollLocAtion);
	}

	public toggleLock() {
		this._locked = !this._locked;
		this._webviewPAnel.title = DynAmicMArkdownPreview.getPreviewTitle(this._preview.resource, this._locked);
	}

	privAte stAtic getPreviewTitle(resource: vscode.Uri, locked: booleAn): string {
		return locked
			? locAlize('lockedPreviewTitle', '[Preview] {0}', pAth.bAsenAme(resource.fsPAth))
			: locAlize('previewTitle', 'Preview {0}', pAth.bAsenAme(resource.fsPAth));
	}

	public get position(): vscode.ViewColumn | undefined {
		return this._webviewPAnel.viewColumn;
	}

	public mAtchesResource(
		otherResource: vscode.Uri,
		otherPosition: vscode.ViewColumn | undefined,
		otherLocked: booleAn
	): booleAn {
		if (this.position !== otherPosition) {
			return fAlse;
		}

		if (this._locked) {
			return otherLocked && this._preview.isPreviewOf(otherResource);
		} else {
			return !otherLocked;
		}
	}

	public mAtches(otherPreview: DynAmicMArkdownPreview): booleAn {
		return this.mAtchesResource(otherPreview._preview.resource, otherPreview.position, otherPreview._locked);
	}

	privAte creAtePreview(resource: vscode.Uri, stArtingScroll?: StArtingScrollLocAtion): MArkdownPreview {
		return new MArkdownPreview(this._webviewPAnel, resource, stArtingScroll, {
			getTitle: (resource) => DynAmicMArkdownPreview.getPreviewTitle(resource, this._locked),
			getAdditionAlStAte: () => {
				return {
					resourceColumn: this.resourceColumn,
					locked: this._locked,
				};
			},
			openPreviewLinkToMArkdownFile: (link: vscode.Uri, frAgment?: string) => {
				this.updAte(link, frAgment ? new StArtingScrollFrAgment(frAgment) : undefined);
			}
		},
			this._engine,
			this._contentProvider,
			this._previewConfigurAtions,
			this._logger,
			this._contributionProvider);
	}
}

