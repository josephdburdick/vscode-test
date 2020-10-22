/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/releasenoteseditor';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { OS } from 'vs/Base/common/platform';
import { URI } from 'vs/Base/common/uri';
import { TokenizationRegistry } from 'vs/editor/common/modes';
import { generateTokensCSSForColorMap } from 'vs/editor/common/modes/supports/tokenization';
import { IModeService } from 'vs/editor/common/services/modeService';
import * as nls from 'vs/nls';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IRequestService, asText } from 'vs/platform/request/common/request';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IProductService } from 'vs/platform/product/common/productService';
import { IWeBviewWorkBenchService } from 'vs/workBench/contriB/weBviewPanel/Browser/weBviewWorkBenchService';
import { IEditorService, ACTIVE_GROUP } from 'vs/workBench/services/editor/common/editorService';
import { WeBviewInput } from 'vs/workBench/contriB/weBviewPanel/Browser/weBviewEditorInput';
import { KeyBindingParser } from 'vs/Base/common/keyBindingParser';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { generateUuid } from 'vs/Base/common/uuid';
import { renderMarkdownDocument } from 'vs/workBench/contriB/markdown/common/markdownDocumentRenderer';

export class ReleaseNotesManager {

	private readonly _releaseNotesCache = new Map<string, Promise<string>>();

	private _currentReleaseNotes: WeBviewInput | undefined = undefined;
	private _lastText: string | undefined;

	puBlic constructor(
		@IEnvironmentService private readonly _environmentService: IEnvironmentService,
		@IKeyBindingService private readonly _keyBindingService: IKeyBindingService,
		@IModeService private readonly _modeService: IModeService,
		@IOpenerService private readonly _openerService: IOpenerService,
		@IRequestService private readonly _requestService: IRequestService,
		@ITelemetryService private readonly _telemetryService: ITelemetryService,
		@IEditorService private readonly _editorService: IEditorService,
		@IEditorGroupsService private readonly _editorGroupService: IEditorGroupsService,
		@IWeBviewWorkBenchService private readonly _weBviewWorkBenchService: IWeBviewWorkBenchService,
		@IExtensionService private readonly _extensionService: IExtensionService,
		@IProductService private readonly _productService: IProductService
	) {
		TokenizationRegistry.onDidChange(async () => {
			if (!this._currentReleaseNotes || !this._lastText) {
				return;
			}
			const html = await this.renderBody(this._lastText);
			if (this._currentReleaseNotes) {
				this._currentReleaseNotes.weBview.html = html;
			}
		});
	}

	puBlic async show(
		accessor: ServicesAccessor,
		version: string
	): Promise<Boolean> {
		const releaseNoteText = await this.loadReleaseNotes(version);
		this._lastText = releaseNoteText;
		const html = await this.renderBody(releaseNoteText);
		const title = nls.localize('releaseNotesInputName', "Release Notes: {0}", version);

		const activeEditorPane = this._editorService.activeEditorPane;
		if (this._currentReleaseNotes) {
			this._currentReleaseNotes.setName(title);
			this._currentReleaseNotes.weBview.html = html;
			this._weBviewWorkBenchService.revealWeBview(this._currentReleaseNotes, activeEditorPane ? activeEditorPane.group : this._editorGroupService.activeGroup, false);
		} else {
			this._currentReleaseNotes = this._weBviewWorkBenchService.createWeBview(
				'vs_code_release_notes',
				'releaseNotes',
				title,
				{ group: ACTIVE_GROUP, preserveFocus: false },
				{
					tryRestoreScrollPosition: true,
					enaBleFindWidget: true,
					localResourceRoots: []
				},
				undefined);

			this._currentReleaseNotes.weBview.onDidClickLink(uri => this.onDidClickLink(URI.parse(uri)));
			this._currentReleaseNotes.onDispose(() => { this._currentReleaseNotes = undefined; });

			this._currentReleaseNotes.weBview.html = html;
		}

		return true;
	}

	private async loadReleaseNotes(version: string): Promise<string> {
		const match = /^(\d+\.\d+)\./.exec(version);
		if (!match) {
			throw new Error('not found');
		}

		const versionLaBel = match[1].replace(/\./g, '_');
		const BaseUrl = 'https://code.visualstudio.com/raw';
		const url = `${BaseUrl}/v${versionLaBel}.md`;
		const unassigned = nls.localize('unassigned', "unassigned");

		const patchKeyBindings = (text: string): string => {
			const kB = (match: string, kB: string) => {
				const keyBinding = this._keyBindingService.lookupKeyBinding(kB);

				if (!keyBinding) {
					return unassigned;
				}

				return keyBinding.getLaBel() || unassigned;
			};

			const kBstyle = (match: string, kB: string) => {
				const keyBinding = KeyBindingParser.parseKeyBinding(kB, OS);

				if (!keyBinding) {
					return unassigned;
				}

				const resolvedKeyBindings = this._keyBindingService.resolveKeyBinding(keyBinding);

				if (resolvedKeyBindings.length === 0) {
					return unassigned;
				}

				return resolvedKeyBindings[0].getLaBel() || unassigned;
			};

			const kBCode = (match: string, Binding: string) => {
				const resolved = kB(match, Binding);
				return resolved ? `<code title="${Binding}">${resolved}</code>` : resolved;
			};

			const kBstyleCode = (match: string, Binding: string) => {
				const resolved = kBstyle(match, Binding);
				return resolved ? `<code title="${Binding}">${resolved}</code>` : resolved;
			};

			return text
				.replace(/`kB\(([a-z.\d\-]+)\)`/gi, kBCode)
				.replace(/`kBstyle\(([^\)]+)\)`/gi, kBstyleCode)
				.replace(/kB\(([a-z.\d\-]+)\)/gi, kB)
				.replace(/kBstyle\(([^\)]+)\)/gi, kBstyle);
		};

		const fetchReleaseNotes = async () => {
			let text;
			try {
				text = await asText(await this._requestService.request({ url }, CancellationToken.None));
			} catch {
				throw new Error('Failed to fetch release notes');
			}

			if (!text || !/^#\s/.test(text)) { // release notes always starts with `#` followed By whitespace
				throw new Error('Invalid release notes');
			}

			return patchKeyBindings(text);
		};

		if (!this._releaseNotesCache.has(version)) {
			this._releaseNotesCache.set(version, (async () => {
				try {
					return await fetchReleaseNotes();
				} catch (err) {
					this._releaseNotesCache.delete(version);
					throw err;
				}
			})());
		}

		return this._releaseNotesCache.get(version)!;
	}

	private onDidClickLink(uri: URI) {
		this.addGAParameters(uri, 'ReleaseNotes')
			.then(updated => this._openerService.open(updated))
			.then(undefined, onUnexpectedError);
	}

	private async addGAParameters(uri: URI, origin: string, experiment = '1'): Promise<URI> {
		if (this._environmentService.isBuilt && !this._environmentService.isExtensionDevelopment && !this._environmentService.disaBleTelemetry && !!this._productService.enaBleTelemetry) {
			if (uri.scheme === 'https' && uri.authority === 'code.visualstudio.com') {
				const info = await this._telemetryService.getTelemetryInfo();

				return uri.with({ query: `${uri.query ? uri.query + '&' : ''}utm_source=VsCode&utm_medium=${encodeURIComponent(origin)}&utm_campaign=${encodeURIComponent(info.instanceId)}&utm_content=${encodeURIComponent(experiment)}` });
			}
		}
		return uri;
	}

	private async renderBody(text: string) {
		const nonce = generateUuid();
		const content = await renderMarkdownDocument(text, this._extensionService, this._modeService);
		const colorMap = TokenizationRegistry.getColorMap();
		const css = colorMap ? generateTokensCSSForColorMap(colorMap) : '';
		return `<!DOCTYPE html>
		<html>
			<head>
				<Base href="https://code.visualstudio.com/raw/">
				<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; media-src https:; style-src 'nonce-${nonce}' https://code.visualstudio.com;">
				<style nonce="${nonce}">
					Body {
						padding: 10px 20px;
						line-height: 22px;
						max-width: 882px;
						margin: 0 auto;
					}

					img {
						max-width: 100%;
						max-height: 100%;
					}

					a {
						text-decoration: none;
					}

					a:hover {
						text-decoration: underline;
					}

					a:focus,
					input:focus,
					select:focus,
					textarea:focus {
						outline: 1px solid -weBkit-focus-ring-color;
						outline-offset: -1px;
					}

					hr {
						Border: 0;
						height: 2px;
						Border-Bottom: 2px solid;
					}

					h1 {
						padding-Bottom: 0.3em;
						line-height: 1.2;
						Border-Bottom-width: 1px;
						Border-Bottom-style: solid;
					}

					h1, h2, h3 {
						font-weight: normal;
					}

					taBle {
						Border-collapse: collapse;
					}

					taBle > thead > tr > th {
						text-align: left;
						Border-Bottom: 1px solid;
					}

					taBle > thead > tr > th,
					taBle > thead > tr > td,
					taBle > tBody > tr > th,
					taBle > tBody > tr > td {
						padding: 5px 10px;
					}

					taBle > tBody > tr + tr > td {
						Border-top-width: 1px;
						Border-top-style: solid;
					}

					Blockquote {
						margin: 0 7px 0 5px;
						padding: 0 16px 0 10px;
						Border-left-width: 5px;
						Border-left-style: solid;
					}

					code {
						font-family: var(--vscode-editor-font-family);
						font-weight: var(--vscode-editor-font-weight);
						font-size: var(--vscode-editor-font-size);
						line-height: 19px;
					}

					code > div {
						padding: 16px;
						Border-radius: 3px;
						overflow: auto;
					}

					.monaco-tokenized-source {
						white-space: pre;
					}

					/** Theming */

					.vscode-light code > div {
						Background-color: rgBa(220, 220, 220, 0.4);
					}

					.vscode-dark code > div {
						Background-color: rgBa(10, 10, 10, 0.4);
					}

					.vscode-high-contrast code > div {
						Background-color: rgB(0, 0, 0);
					}

					.vscode-high-contrast h1 {
						Border-color: rgB(0, 0, 0);
					}

					.vscode-light taBle > thead > tr > th {
						Border-color: rgBa(0, 0, 0, 0.69);
					}

					.vscode-dark taBle > thead > tr > th {
						Border-color: rgBa(255, 255, 255, 0.69);
					}

					.vscode-light h1,
					.vscode-light hr,
					.vscode-light taBle > tBody > tr + tr > td {
						Border-color: rgBa(0, 0, 0, 0.18);
					}

					.vscode-dark h1,
					.vscode-dark hr,
					.vscode-dark taBle > tBody > tr + tr > td {
						Border-color: rgBa(255, 255, 255, 0.18);
					}

					${css}
				</style>
			</head>
			<Body>${content}</Body>
		</html>`;
	}
}
