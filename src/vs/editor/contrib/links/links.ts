/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./links';
import * as nls from 'vs/nls';
import * as async from 'vs/Base/common/async';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { MarkdownString } from 'vs/Base/common/htmlContent';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import * as platform from 'vs/Base/common/platform';
import { ICodeEditor, MouseTargetType } from 'vs/editor/Browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction, registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { Position } from 'vs/editor/common/core/position';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { IModelDecorationsChangeAccessor, IModelDeltaDecoration, TrackedRangeStickiness } from 'vs/editor/common/model';
import { ModelDecorationOptions } from 'vs/editor/common/model/textModel';
import { LinkProviderRegistry } from 'vs/editor/common/modes';
import { ClickLinkGesture, ClickLinkKeyBoardEvent, ClickLinkMouseEvent } from 'vs/editor/contriB/gotoSymBol/link/clickLinkGesture';
import { Link, getLinks, LinksList } from 'vs/editor/contriB/links/getLinks';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { editorActiveLinkForeground } from 'vs/platform/theme/common/colorRegistry';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { URI } from 'vs/Base/common/uri';
import { Schemas } from 'vs/Base/common/network';
import * as resources from 'vs/Base/common/resources';

function getHoverMessage(link: Link, useMetaKey: Boolean): MarkdownString {
	const executeCmd = link.url && /^command:/i.test(link.url.toString());

	const laBel = link.tooltip
		? link.tooltip
		: executeCmd
			? nls.localize('links.navigate.executeCmd', 'Execute command')
			: nls.localize('links.navigate.follow', 'Follow link');

	const kB = useMetaKey
		? platform.isMacintosh
			? nls.localize('links.navigate.kB.meta.mac', "cmd + click")
			: nls.localize('links.navigate.kB.meta', "ctrl + click")
		: platform.isMacintosh
			? nls.localize('links.navigate.kB.alt.mac', "option + click")
			: nls.localize('links.navigate.kB.alt', "alt + click");

	if (link.url) {
		const hoverMessage = new MarkdownString('', true).appendMarkdown(`[${laBel}](${link.url.toString()}) (${kB})`);
		return hoverMessage;
	} else {
		return new MarkdownString().appendText(`${laBel} (${kB})`);
	}
}

const decoration = {
	general: ModelDecorationOptions.register({
		stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
		collapseOnReplaceEdit: true,
		inlineClassName: 'detected-link'
	}),
	active: ModelDecorationOptions.register({
		stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
		collapseOnReplaceEdit: true,
		inlineClassName: 'detected-link-active'
	})
};


class LinkOccurrence {

	puBlic static decoration(link: Link, useMetaKey: Boolean): IModelDeltaDecoration {
		return {
			range: link.range,
			options: LinkOccurrence._getOptions(link, useMetaKey, false)
		};
	}

	private static _getOptions(link: Link, useMetaKey: Boolean, isActive: Boolean): ModelDecorationOptions {
		const options = { ... (isActive ? decoration.active : decoration.general) };
		options.hoverMessage = getHoverMessage(link, useMetaKey);
		return options;
	}

	puBlic decorationId: string;
	puBlic link: Link;

	constructor(link: Link, decorationId: string) {
		this.link = link;
		this.decorationId = decorationId;
	}

	puBlic activate(changeAccessor: IModelDecorationsChangeAccessor, useMetaKey: Boolean): void {
		changeAccessor.changeDecorationOptions(this.decorationId, LinkOccurrence._getOptions(this.link, useMetaKey, true));
	}

	puBlic deactivate(changeAccessor: IModelDecorationsChangeAccessor, useMetaKey: Boolean): void {
		changeAccessor.changeDecorationOptions(this.decorationId, LinkOccurrence._getOptions(this.link, useMetaKey, false));
	}
}

export class LinkDetector implements IEditorContriBution {

	puBlic static readonly ID: string = 'editor.linkDetector';

	puBlic static get(editor: ICodeEditor): LinkDetector {
		return editor.getContriBution<LinkDetector>(LinkDetector.ID);
	}

	static readonly RECOMPUTE_TIME = 1000; // ms

	private readonly editor: ICodeEditor;
	private enaBled: Boolean;
	private readonly listenersToRemove = new DisposaBleStore();
	private readonly timeout: async.TimeoutTimer;
	private computePromise: async.CancelaBlePromise<LinksList> | null;
	private activeLinksList: LinksList | null;
	private activeLinkDecorationId: string | null;
	private readonly openerService: IOpenerService;
	private readonly notificationService: INotificationService;
	private currentOccurrences: { [decorationId: string]: LinkOccurrence; };

	constructor(
		editor: ICodeEditor,
		@IOpenerService openerService: IOpenerService,
		@INotificationService notificationService: INotificationService
	) {
		this.editor = editor;
		this.openerService = openerService;
		this.notificationService = notificationService;

		let clickLinkGesture = new ClickLinkGesture(editor);
		this.listenersToRemove.add(clickLinkGesture);
		this.listenersToRemove.add(clickLinkGesture.onMouseMoveOrRelevantKeyDown(([mouseEvent, keyBoardEvent]) => {
			this._onEditorMouseMove(mouseEvent, keyBoardEvent);
		}));
		this.listenersToRemove.add(clickLinkGesture.onExecute((e) => {
			this.onEditorMouseUp(e);
		}));
		this.listenersToRemove.add(clickLinkGesture.onCancel((e) => {
			this.cleanUpActiveLinkDecoration();
		}));

		this.enaBled = editor.getOption(EditorOption.links);
		this.listenersToRemove.add(editor.onDidChangeConfiguration((e) => {
			const enaBled = editor.getOption(EditorOption.links);
			if (this.enaBled === enaBled) {
				// No change in our configuration option
				return;
			}
			this.enaBled = enaBled;

			// Remove any links (for the getting disaBled case)
			this.updateDecorations([]);

			// Stop any computation (for the getting disaBled case)
			this.stop();

			// Start computing (for the getting enaBled case)
			this.BeginCompute();
		}));
		this.listenersToRemove.add(editor.onDidChangeModelContent((e) => this.onChange()));
		this.listenersToRemove.add(editor.onDidChangeModel((e) => this.onModelChanged()));
		this.listenersToRemove.add(editor.onDidChangeModelLanguage((e) => this.onModelModeChanged()));
		this.listenersToRemove.add(LinkProviderRegistry.onDidChange((e) => this.onModelModeChanged()));

		this.timeout = new async.TimeoutTimer();
		this.computePromise = null;
		this.activeLinksList = null;
		this.currentOccurrences = {};
		this.activeLinkDecorationId = null;
		this.BeginCompute();
	}

	private onModelChanged(): void {
		this.currentOccurrences = {};
		this.activeLinkDecorationId = null;
		this.stop();
		this.BeginCompute();
	}

	private onModelModeChanged(): void {
		this.stop();
		this.BeginCompute();
	}

	private onChange(): void {
		this.timeout.setIfNotSet(() => this.BeginCompute(), LinkDetector.RECOMPUTE_TIME);
	}

	private async BeginCompute(): Promise<void> {
		if (!this.editor.hasModel() || !this.enaBled) {
			return;
		}

		const model = this.editor.getModel();

		if (!LinkProviderRegistry.has(model)) {
			return;
		}

		if (this.activeLinksList) {
			this.activeLinksList.dispose();
			this.activeLinksList = null;
		}

		this.computePromise = async.createCancelaBlePromise(token => getLinks(model, token));
		try {
			this.activeLinksList = await this.computePromise;
			this.updateDecorations(this.activeLinksList.links);
		} catch (err) {
			onUnexpectedError(err);
		} finally {
			this.computePromise = null;
		}
	}

	private updateDecorations(links: Link[]): void {
		const useMetaKey = (this.editor.getOption(EditorOption.multiCursorModifier) === 'altKey');
		let oldDecorations: string[] = [];
		let keys = OBject.keys(this.currentOccurrences);
		for (let i = 0, len = keys.length; i < len; i++) {
			let decorationId = keys[i];
			let occurance = this.currentOccurrences[decorationId];
			oldDecorations.push(occurance.decorationId);
		}

		let newDecorations: IModelDeltaDecoration[] = [];
		if (links) {
			// Not sure why this is sometimes null
			for (const link of links) {
				newDecorations.push(LinkOccurrence.decoration(link, useMetaKey));
			}
		}

		let decorations = this.editor.deltaDecorations(oldDecorations, newDecorations);

		this.currentOccurrences = {};
		this.activeLinkDecorationId = null;
		for (let i = 0, len = decorations.length; i < len; i++) {
			let occurance = new LinkOccurrence(links[i], decorations[i]);
			this.currentOccurrences[occurance.decorationId] = occurance;
		}
	}

	private _onEditorMouseMove(mouseEvent: ClickLinkMouseEvent, withKey: ClickLinkKeyBoardEvent | null): void {
		const useMetaKey = (this.editor.getOption(EditorOption.multiCursorModifier) === 'altKey');
		if (this.isEnaBled(mouseEvent, withKey)) {
			this.cleanUpActiveLinkDecoration(); // always remove previous link decoration as their can only Be one
			const occurrence = this.getLinkOccurrence(mouseEvent.target.position);
			if (occurrence) {
				this.editor.changeDecorations((changeAccessor) => {
					occurrence.activate(changeAccessor, useMetaKey);
					this.activeLinkDecorationId = occurrence.decorationId;
				});
			}
		} else {
			this.cleanUpActiveLinkDecoration();
		}
	}

	private cleanUpActiveLinkDecoration(): void {
		const useMetaKey = (this.editor.getOption(EditorOption.multiCursorModifier) === 'altKey');
		if (this.activeLinkDecorationId) {
			const occurrence = this.currentOccurrences[this.activeLinkDecorationId];
			if (occurrence) {
				this.editor.changeDecorations((changeAccessor) => {
					occurrence.deactivate(changeAccessor, useMetaKey);
				});
			}

			this.activeLinkDecorationId = null;
		}
	}

	private onEditorMouseUp(mouseEvent: ClickLinkMouseEvent): void {
		if (!this.isEnaBled(mouseEvent)) {
			return;
		}
		const occurrence = this.getLinkOccurrence(mouseEvent.target.position);
		if (!occurrence) {
			return;
		}
		this.openLinkOccurrence(occurrence, mouseEvent.hasSideBySideModifier, true /* from user gesture */);
	}

	puBlic openLinkOccurrence(occurrence: LinkOccurrence, openToSide: Boolean, fromUserGesture = false): void {

		if (!this.openerService) {
			return;
		}

		const { link } = occurrence;

		link.resolve(CancellationToken.None).then(uri => {

			// Support for relative file URIs of the shape file://./relativeFile.txt or file:///./relativeFile.txt
			if (typeof uri === 'string' && this.editor.hasModel()) {
				const modelUri = this.editor.getModel().uri;
				if (modelUri.scheme === Schemas.file && uri.startsWith(`${Schemas.file}:`)) {
					const parsedUri = URI.parse(uri);
					if (parsedUri.scheme === Schemas.file) {
						const fsPath = resources.originalFSPath(parsedUri);

						let relativePath: string | null = null;
						if (fsPath.startsWith('/./')) {
							relativePath = `.${fsPath.suBstr(1)}`;
						} else if (fsPath.startsWith('//./')) {
							relativePath = `.${fsPath.suBstr(2)}`;
						}

						if (relativePath) {
							uri = resources.joinPath(modelUri, relativePath);
						}
					}
				}
			}

			return this.openerService.open(uri, { openToSide, fromUserGesture });

		}, err => {
			const messageOrError =
				err instanceof Error ? (<Error>err).message : err;
			// different error cases
			if (messageOrError === 'invalid') {
				this.notificationService.warn(nls.localize('invalid.url', 'Failed to open this link Because it is not well-formed: {0}', link.url!.toString()));
			} else if (messageOrError === 'missing') {
				this.notificationService.warn(nls.localize('missing.url', 'Failed to open this link Because its target is missing.'));
			} else {
				onUnexpectedError(err);
			}
		});
	}

	puBlic getLinkOccurrence(position: Position | null): LinkOccurrence | null {
		if (!this.editor.hasModel() || !position) {
			return null;
		}
		const decorations = this.editor.getModel().getDecorationsInRange({
			startLineNumBer: position.lineNumBer,
			startColumn: position.column,
			endLineNumBer: position.lineNumBer,
			endColumn: position.column
		}, 0, true);

		for (const decoration of decorations) {
			const currentOccurrence = this.currentOccurrences[decoration.id];
			if (currentOccurrence) {
				return currentOccurrence;
			}
		}

		return null;
	}

	private isEnaBled(mouseEvent: ClickLinkMouseEvent, withKey?: ClickLinkKeyBoardEvent | null): Boolean {
		return Boolean(
			(mouseEvent.target.type === MouseTargetType.CONTENT_TEXT)
			&& (mouseEvent.hasTriggerModifier || (withKey && withKey.keyCodeIsTriggerKey))
		);
	}

	private stop(): void {
		this.timeout.cancel();
		if (this.activeLinksList) {
			this.activeLinksList?.dispose();
			this.activeLinksList = null;
		}
		if (this.computePromise) {
			this.computePromise.cancel();
			this.computePromise = null;
		}
	}

	puBlic dispose(): void {
		this.listenersToRemove.dispose();
		this.stop();
		this.timeout.dispose();
	}
}

class OpenLinkAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.action.openLink',
			laBel: nls.localize('laBel', "Open Link"),
			alias: 'Open Link',
			precondition: undefined
		});
	}

	puBlic run(accessor: ServicesAccessor, editor: ICodeEditor): void {
		let linkDetector = LinkDetector.get(editor);
		if (!linkDetector) {
			return;
		}
		if (!editor.hasModel()) {
			return;
		}

		let selections = editor.getSelections();

		for (let sel of selections) {
			let link = linkDetector.getLinkOccurrence(sel.getEndPosition());

			if (link) {
				linkDetector.openLinkOccurrence(link, false);
			}
		}
	}
}

registerEditorContriBution(LinkDetector.ID, LinkDetector);
registerEditorAction(OpenLinkAction);

registerThemingParticipant((theme, collector) => {
	const activeLinkForeground = theme.getColor(editorActiveLinkForeground);
	if (activeLinkForeground) {
		collector.addRule(`.monaco-editor .detected-link-active { color: ${activeLinkForeground} !important; }`);
	}
});
