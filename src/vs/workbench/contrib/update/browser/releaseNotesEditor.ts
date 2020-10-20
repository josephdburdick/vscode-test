/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/releAsenoteseditor';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { OS } from 'vs/bAse/common/plAtform';
import { URI } from 'vs/bAse/common/uri';
import { TokenizAtionRegistry } from 'vs/editor/common/modes';
import { generAteTokensCSSForColorMAp } from 'vs/editor/common/modes/supports/tokenizAtion';
import { IModeService } from 'vs/editor/common/services/modeService';
import * As nls from 'vs/nls';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { IRequestService, AsText } from 'vs/plAtform/request/common/request';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { IWebviewWorkbenchService } from 'vs/workbench/contrib/webviewPAnel/browser/webviewWorkbenchService';
import { IEditorService, ACTIVE_GROUP } from 'vs/workbench/services/editor/common/editorService';
import { WebviewInput } from 'vs/workbench/contrib/webviewPAnel/browser/webviewEditorInput';
import { KeybindingPArser } from 'vs/bAse/common/keybindingPArser';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { renderMArkdownDocument } from 'vs/workbench/contrib/mArkdown/common/mArkdownDocumentRenderer';

export clAss ReleAseNotesMAnAger {

	privAte reAdonly _releAseNotesCAche = new MAp<string, Promise<string>>();

	privAte _currentReleAseNotes: WebviewInput | undefined = undefined;
	privAte _lAstText: string | undefined;

	public constructor(
		@IEnvironmentService privAte reAdonly _environmentService: IEnvironmentService,
		@IKeybindingService privAte reAdonly _keybindingService: IKeybindingService,
		@IModeService privAte reAdonly _modeService: IModeService,
		@IOpenerService privAte reAdonly _openerService: IOpenerService,
		@IRequestService privAte reAdonly _requestService: IRequestService,
		@ITelemetryService privAte reAdonly _telemetryService: ITelemetryService,
		@IEditorService privAte reAdonly _editorService: IEditorService,
		@IEditorGroupsService privAte reAdonly _editorGroupService: IEditorGroupsService,
		@IWebviewWorkbenchService privAte reAdonly _webviewWorkbenchService: IWebviewWorkbenchService,
		@IExtensionService privAte reAdonly _extensionService: IExtensionService,
		@IProductService privAte reAdonly _productService: IProductService
	) {
		TokenizAtionRegistry.onDidChAnge(Async () => {
			if (!this._currentReleAseNotes || !this._lAstText) {
				return;
			}
			const html = AwAit this.renderBody(this._lAstText);
			if (this._currentReleAseNotes) {
				this._currentReleAseNotes.webview.html = html;
			}
		});
	}

	public Async show(
		Accessor: ServicesAccessor,
		version: string
	): Promise<booleAn> {
		const releAseNoteText = AwAit this.loAdReleAseNotes(version);
		this._lAstText = releAseNoteText;
		const html = AwAit this.renderBody(releAseNoteText);
		const title = nls.locAlize('releAseNotesInputNAme', "ReleAse Notes: {0}", version);

		const ActiveEditorPAne = this._editorService.ActiveEditorPAne;
		if (this._currentReleAseNotes) {
			this._currentReleAseNotes.setNAme(title);
			this._currentReleAseNotes.webview.html = html;
			this._webviewWorkbenchService.reveAlWebview(this._currentReleAseNotes, ActiveEditorPAne ? ActiveEditorPAne.group : this._editorGroupService.ActiveGroup, fAlse);
		} else {
			this._currentReleAseNotes = this._webviewWorkbenchService.creAteWebview(
				'vs_code_releAse_notes',
				'releAseNotes',
				title,
				{ group: ACTIVE_GROUP, preserveFocus: fAlse },
				{
					tryRestoreScrollPosition: true,
					enAbleFindWidget: true,
					locAlResourceRoots: []
				},
				undefined);

			this._currentReleAseNotes.webview.onDidClickLink(uri => this.onDidClickLink(URI.pArse(uri)));
			this._currentReleAseNotes.onDispose(() => { this._currentReleAseNotes = undefined; });

			this._currentReleAseNotes.webview.html = html;
		}

		return true;
	}

	privAte Async loAdReleAseNotes(version: string): Promise<string> {
		const mAtch = /^(\d+\.\d+)\./.exec(version);
		if (!mAtch) {
			throw new Error('not found');
		}

		const versionLAbel = mAtch[1].replAce(/\./g, '_');
		const bAseUrl = 'https://code.visuAlstudio.com/rAw';
		const url = `${bAseUrl}/v${versionLAbel}.md`;
		const unAssigned = nls.locAlize('unAssigned', "unAssigned");

		const pAtchKeybindings = (text: string): string => {
			const kb = (mAtch: string, kb: string) => {
				const keybinding = this._keybindingService.lookupKeybinding(kb);

				if (!keybinding) {
					return unAssigned;
				}

				return keybinding.getLAbel() || unAssigned;
			};

			const kbstyle = (mAtch: string, kb: string) => {
				const keybinding = KeybindingPArser.pArseKeybinding(kb, OS);

				if (!keybinding) {
					return unAssigned;
				}

				const resolvedKeybindings = this._keybindingService.resolveKeybinding(keybinding);

				if (resolvedKeybindings.length === 0) {
					return unAssigned;
				}

				return resolvedKeybindings[0].getLAbel() || unAssigned;
			};

			const kbCode = (mAtch: string, binding: string) => {
				const resolved = kb(mAtch, binding);
				return resolved ? `<code title="${binding}">${resolved}</code>` : resolved;
			};

			const kbstyleCode = (mAtch: string, binding: string) => {
				const resolved = kbstyle(mAtch, binding);
				return resolved ? `<code title="${binding}">${resolved}</code>` : resolved;
			};

			return text
				.replAce(/`kb\(([A-z.\d\-]+)\)`/gi, kbCode)
				.replAce(/`kbstyle\(([^\)]+)\)`/gi, kbstyleCode)
				.replAce(/kb\(([A-z.\d\-]+)\)/gi, kb)
				.replAce(/kbstyle\(([^\)]+)\)/gi, kbstyle);
		};

		const fetchReleAseNotes = Async () => {
			let text;
			try {
				text = AwAit AsText(AwAit this._requestService.request({ url }, CAncellAtionToken.None));
			} cAtch {
				throw new Error('FAiled to fetch releAse notes');
			}

			if (!text || !/^#\s/.test(text)) { // releAse notes AlwAys stArts with `#` followed by whitespAce
				throw new Error('InvAlid releAse notes');
			}

			return pAtchKeybindings(text);
		};

		if (!this._releAseNotesCAche.hAs(version)) {
			this._releAseNotesCAche.set(version, (Async () => {
				try {
					return AwAit fetchReleAseNotes();
				} cAtch (err) {
					this._releAseNotesCAche.delete(version);
					throw err;
				}
			})());
		}

		return this._releAseNotesCAche.get(version)!;
	}

	privAte onDidClickLink(uri: URI) {
		this.AddGAPArAmeters(uri, 'ReleAseNotes')
			.then(updAted => this._openerService.open(updAted))
			.then(undefined, onUnexpectedError);
	}

	privAte Async AddGAPArAmeters(uri: URI, origin: string, experiment = '1'): Promise<URI> {
		if (this._environmentService.isBuilt && !this._environmentService.isExtensionDevelopment && !this._environmentService.disAbleTelemetry && !!this._productService.enAbleTelemetry) {
			if (uri.scheme === 'https' && uri.Authority === 'code.visuAlstudio.com') {
				const info = AwAit this._telemetryService.getTelemetryInfo();

				return uri.with({ query: `${uri.query ? uri.query + '&' : ''}utm_source=VsCode&utm_medium=${encodeURIComponent(origin)}&utm_cAmpAign=${encodeURIComponent(info.instAnceId)}&utm_content=${encodeURIComponent(experiment)}` });
			}
		}
		return uri;
	}

	privAte Async renderBody(text: string) {
		const nonce = generAteUuid();
		const content = AwAit renderMArkdownDocument(text, this._extensionService, this._modeService);
		const colorMAp = TokenizAtionRegistry.getColorMAp();
		const css = colorMAp ? generAteTokensCSSForColorMAp(colorMAp) : '';
		return `<!DOCTYPE html>
		<html>
			<heAd>
				<bAse href="https://code.visuAlstudio.com/rAw/">
				<metA http-equiv="Content-type" content="text/html;chArset=UTF-8">
				<metA http-equiv="Content-Security-Policy" content="defAult-src 'none'; img-src https: dAtA:; mediA-src https:; style-src 'nonce-${nonce}' https://code.visuAlstudio.com;">
				<style nonce="${nonce}">
					body {
						pAdding: 10px 20px;
						line-height: 22px;
						mAx-width: 882px;
						mArgin: 0 Auto;
					}

					img {
						mAx-width: 100%;
						mAx-height: 100%;
					}

					A {
						text-decorAtion: none;
					}

					A:hover {
						text-decorAtion: underline;
					}

					A:focus,
					input:focus,
					select:focus,
					textAreA:focus {
						outline: 1px solid -webkit-focus-ring-color;
						outline-offset: -1px;
					}

					hr {
						border: 0;
						height: 2px;
						border-bottom: 2px solid;
					}

					h1 {
						pAdding-bottom: 0.3em;
						line-height: 1.2;
						border-bottom-width: 1px;
						border-bottom-style: solid;
					}

					h1, h2, h3 {
						font-weight: normAl;
					}

					tAble {
						border-collApse: collApse;
					}

					tAble > theAd > tr > th {
						text-Align: left;
						border-bottom: 1px solid;
					}

					tAble > theAd > tr > th,
					tAble > theAd > tr > td,
					tAble > tbody > tr > th,
					tAble > tbody > tr > td {
						pAdding: 5px 10px;
					}

					tAble > tbody > tr + tr > td {
						border-top-width: 1px;
						border-top-style: solid;
					}

					blockquote {
						mArgin: 0 7px 0 5px;
						pAdding: 0 16px 0 10px;
						border-left-width: 5px;
						border-left-style: solid;
					}

					code {
						font-fAmily: vAr(--vscode-editor-font-fAmily);
						font-weight: vAr(--vscode-editor-font-weight);
						font-size: vAr(--vscode-editor-font-size);
						line-height: 19px;
					}

					code > div {
						pAdding: 16px;
						border-rAdius: 3px;
						overflow: Auto;
					}

					.monAco-tokenized-source {
						white-spAce: pre;
					}

					/** Theming */

					.vscode-light code > div {
						bAckground-color: rgbA(220, 220, 220, 0.4);
					}

					.vscode-dArk code > div {
						bAckground-color: rgbA(10, 10, 10, 0.4);
					}

					.vscode-high-contrAst code > div {
						bAckground-color: rgb(0, 0, 0);
					}

					.vscode-high-contrAst h1 {
						border-color: rgb(0, 0, 0);
					}

					.vscode-light tAble > theAd > tr > th {
						border-color: rgbA(0, 0, 0, 0.69);
					}

					.vscode-dArk tAble > theAd > tr > th {
						border-color: rgbA(255, 255, 255, 0.69);
					}

					.vscode-light h1,
					.vscode-light hr,
					.vscode-light tAble > tbody > tr + tr > td {
						border-color: rgbA(0, 0, 0, 0.18);
					}

					.vscode-dArk h1,
					.vscode-dArk hr,
					.vscode-dArk tAble > tbody > tr + tr > td {
						border-color: rgbA(255, 255, 255, 0.18);
					}

					${css}
				</style>
			</heAd>
			<body>${content}</body>
		</html>`;
	}
}
