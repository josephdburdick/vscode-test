/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./links';
import * As nls from 'vs/nls';
import * As Async from 'vs/bAse/common/Async';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { MArkdownString } from 'vs/bAse/common/htmlContent';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import * As plAtform from 'vs/bAse/common/plAtform';
import { ICodeEditor, MouseTArgetType } from 'vs/editor/browser/editorBrowser';
import { EditorAction, ServicesAccessor, registerEditorAction, registerEditorContribution } from 'vs/editor/browser/editorExtensions';
import { Position } from 'vs/editor/common/core/position';
import { IEditorContribution } from 'vs/editor/common/editorCommon';
import { IModelDecorAtionsChAngeAccessor, IModelDeltADecorAtion, TrAckedRAngeStickiness } from 'vs/editor/common/model';
import { ModelDecorAtionOptions } from 'vs/editor/common/model/textModel';
import { LinkProviderRegistry } from 'vs/editor/common/modes';
import { ClickLinkGesture, ClickLinkKeyboArdEvent, ClickLinkMouseEvent } from 'vs/editor/contrib/gotoSymbol/link/clickLinkGesture';
import { Link, getLinks, LinksList } from 'vs/editor/contrib/links/getLinks';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { editorActiveLinkForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { URI } from 'vs/bAse/common/uri';
import { SchemAs } from 'vs/bAse/common/network';
import * As resources from 'vs/bAse/common/resources';

function getHoverMessAge(link: Link, useMetAKey: booleAn): MArkdownString {
	const executeCmd = link.url && /^commAnd:/i.test(link.url.toString());

	const lAbel = link.tooltip
		? link.tooltip
		: executeCmd
			? nls.locAlize('links.nAvigAte.executeCmd', 'Execute commAnd')
			: nls.locAlize('links.nAvigAte.follow', 'Follow link');

	const kb = useMetAKey
		? plAtform.isMAcintosh
			? nls.locAlize('links.nAvigAte.kb.metA.mAc', "cmd + click")
			: nls.locAlize('links.nAvigAte.kb.metA', "ctrl + click")
		: plAtform.isMAcintosh
			? nls.locAlize('links.nAvigAte.kb.Alt.mAc', "option + click")
			: nls.locAlize('links.nAvigAte.kb.Alt', "Alt + click");

	if (link.url) {
		const hoverMessAge = new MArkdownString('', true).AppendMArkdown(`[${lAbel}](${link.url.toString()}) (${kb})`);
		return hoverMessAge;
	} else {
		return new MArkdownString().AppendText(`${lAbel} (${kb})`);
	}
}

const decorAtion = {
	generAl: ModelDecorAtionOptions.register({
		stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
		collApseOnReplAceEdit: true,
		inlineClAssNAme: 'detected-link'
	}),
	Active: ModelDecorAtionOptions.register({
		stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
		collApseOnReplAceEdit: true,
		inlineClAssNAme: 'detected-link-Active'
	})
};


clAss LinkOccurrence {

	public stAtic decorAtion(link: Link, useMetAKey: booleAn): IModelDeltADecorAtion {
		return {
			rAnge: link.rAnge,
			options: LinkOccurrence._getOptions(link, useMetAKey, fAlse)
		};
	}

	privAte stAtic _getOptions(link: Link, useMetAKey: booleAn, isActive: booleAn): ModelDecorAtionOptions {
		const options = { ... (isActive ? decorAtion.Active : decorAtion.generAl) };
		options.hoverMessAge = getHoverMessAge(link, useMetAKey);
		return options;
	}

	public decorAtionId: string;
	public link: Link;

	constructor(link: Link, decorAtionId: string) {
		this.link = link;
		this.decorAtionId = decorAtionId;
	}

	public ActivAte(chAngeAccessor: IModelDecorAtionsChAngeAccessor, useMetAKey: booleAn): void {
		chAngeAccessor.chAngeDecorAtionOptions(this.decorAtionId, LinkOccurrence._getOptions(this.link, useMetAKey, true));
	}

	public deActivAte(chAngeAccessor: IModelDecorAtionsChAngeAccessor, useMetAKey: booleAn): void {
		chAngeAccessor.chAngeDecorAtionOptions(this.decorAtionId, LinkOccurrence._getOptions(this.link, useMetAKey, fAlse));
	}
}

export clAss LinkDetector implements IEditorContribution {

	public stAtic reAdonly ID: string = 'editor.linkDetector';

	public stAtic get(editor: ICodeEditor): LinkDetector {
		return editor.getContribution<LinkDetector>(LinkDetector.ID);
	}

	stAtic reAdonly RECOMPUTE_TIME = 1000; // ms

	privAte reAdonly editor: ICodeEditor;
	privAte enAbled: booleAn;
	privAte reAdonly listenersToRemove = new DisposAbleStore();
	privAte reAdonly timeout: Async.TimeoutTimer;
	privAte computePromise: Async.CAncelAblePromise<LinksList> | null;
	privAte ActiveLinksList: LinksList | null;
	privAte ActiveLinkDecorAtionId: string | null;
	privAte reAdonly openerService: IOpenerService;
	privAte reAdonly notificAtionService: INotificAtionService;
	privAte currentOccurrences: { [decorAtionId: string]: LinkOccurrence; };

	constructor(
		editor: ICodeEditor,
		@IOpenerService openerService: IOpenerService,
		@INotificAtionService notificAtionService: INotificAtionService
	) {
		this.editor = editor;
		this.openerService = openerService;
		this.notificAtionService = notificAtionService;

		let clickLinkGesture = new ClickLinkGesture(editor);
		this.listenersToRemove.Add(clickLinkGesture);
		this.listenersToRemove.Add(clickLinkGesture.onMouseMoveOrRelevAntKeyDown(([mouseEvent, keyboArdEvent]) => {
			this._onEditorMouseMove(mouseEvent, keyboArdEvent);
		}));
		this.listenersToRemove.Add(clickLinkGesture.onExecute((e) => {
			this.onEditorMouseUp(e);
		}));
		this.listenersToRemove.Add(clickLinkGesture.onCAncel((e) => {
			this.cleAnUpActiveLinkDecorAtion();
		}));

		this.enAbled = editor.getOption(EditorOption.links);
		this.listenersToRemove.Add(editor.onDidChAngeConfigurAtion((e) => {
			const enAbled = editor.getOption(EditorOption.links);
			if (this.enAbled === enAbled) {
				// No chAnge in our configurAtion option
				return;
			}
			this.enAbled = enAbled;

			// Remove Any links (for the getting disAbled cAse)
			this.updAteDecorAtions([]);

			// Stop Any computAtion (for the getting disAbled cAse)
			this.stop();

			// StArt computing (for the getting enAbled cAse)
			this.beginCompute();
		}));
		this.listenersToRemove.Add(editor.onDidChAngeModelContent((e) => this.onChAnge()));
		this.listenersToRemove.Add(editor.onDidChAngeModel((e) => this.onModelChAnged()));
		this.listenersToRemove.Add(editor.onDidChAngeModelLAnguAge((e) => this.onModelModeChAnged()));
		this.listenersToRemove.Add(LinkProviderRegistry.onDidChAnge((e) => this.onModelModeChAnged()));

		this.timeout = new Async.TimeoutTimer();
		this.computePromise = null;
		this.ActiveLinksList = null;
		this.currentOccurrences = {};
		this.ActiveLinkDecorAtionId = null;
		this.beginCompute();
	}

	privAte onModelChAnged(): void {
		this.currentOccurrences = {};
		this.ActiveLinkDecorAtionId = null;
		this.stop();
		this.beginCompute();
	}

	privAte onModelModeChAnged(): void {
		this.stop();
		this.beginCompute();
	}

	privAte onChAnge(): void {
		this.timeout.setIfNotSet(() => this.beginCompute(), LinkDetector.RECOMPUTE_TIME);
	}

	privAte Async beginCompute(): Promise<void> {
		if (!this.editor.hAsModel() || !this.enAbled) {
			return;
		}

		const model = this.editor.getModel();

		if (!LinkProviderRegistry.hAs(model)) {
			return;
		}

		if (this.ActiveLinksList) {
			this.ActiveLinksList.dispose();
			this.ActiveLinksList = null;
		}

		this.computePromise = Async.creAteCAncelAblePromise(token => getLinks(model, token));
		try {
			this.ActiveLinksList = AwAit this.computePromise;
			this.updAteDecorAtions(this.ActiveLinksList.links);
		} cAtch (err) {
			onUnexpectedError(err);
		} finAlly {
			this.computePromise = null;
		}
	}

	privAte updAteDecorAtions(links: Link[]): void {
		const useMetAKey = (this.editor.getOption(EditorOption.multiCursorModifier) === 'AltKey');
		let oldDecorAtions: string[] = [];
		let keys = Object.keys(this.currentOccurrences);
		for (let i = 0, len = keys.length; i < len; i++) {
			let decorAtionId = keys[i];
			let occurAnce = this.currentOccurrences[decorAtionId];
			oldDecorAtions.push(occurAnce.decorAtionId);
		}

		let newDecorAtions: IModelDeltADecorAtion[] = [];
		if (links) {
			// Not sure why this is sometimes null
			for (const link of links) {
				newDecorAtions.push(LinkOccurrence.decorAtion(link, useMetAKey));
			}
		}

		let decorAtions = this.editor.deltADecorAtions(oldDecorAtions, newDecorAtions);

		this.currentOccurrences = {};
		this.ActiveLinkDecorAtionId = null;
		for (let i = 0, len = decorAtions.length; i < len; i++) {
			let occurAnce = new LinkOccurrence(links[i], decorAtions[i]);
			this.currentOccurrences[occurAnce.decorAtionId] = occurAnce;
		}
	}

	privAte _onEditorMouseMove(mouseEvent: ClickLinkMouseEvent, withKey: ClickLinkKeyboArdEvent | null): void {
		const useMetAKey = (this.editor.getOption(EditorOption.multiCursorModifier) === 'AltKey');
		if (this.isEnAbled(mouseEvent, withKey)) {
			this.cleAnUpActiveLinkDecorAtion(); // AlwAys remove previous link decorAtion As their cAn only be one
			const occurrence = this.getLinkOccurrence(mouseEvent.tArget.position);
			if (occurrence) {
				this.editor.chAngeDecorAtions((chAngeAccessor) => {
					occurrence.ActivAte(chAngeAccessor, useMetAKey);
					this.ActiveLinkDecorAtionId = occurrence.decorAtionId;
				});
			}
		} else {
			this.cleAnUpActiveLinkDecorAtion();
		}
	}

	privAte cleAnUpActiveLinkDecorAtion(): void {
		const useMetAKey = (this.editor.getOption(EditorOption.multiCursorModifier) === 'AltKey');
		if (this.ActiveLinkDecorAtionId) {
			const occurrence = this.currentOccurrences[this.ActiveLinkDecorAtionId];
			if (occurrence) {
				this.editor.chAngeDecorAtions((chAngeAccessor) => {
					occurrence.deActivAte(chAngeAccessor, useMetAKey);
				});
			}

			this.ActiveLinkDecorAtionId = null;
		}
	}

	privAte onEditorMouseUp(mouseEvent: ClickLinkMouseEvent): void {
		if (!this.isEnAbled(mouseEvent)) {
			return;
		}
		const occurrence = this.getLinkOccurrence(mouseEvent.tArget.position);
		if (!occurrence) {
			return;
		}
		this.openLinkOccurrence(occurrence, mouseEvent.hAsSideBySideModifier, true /* from user gesture */);
	}

	public openLinkOccurrence(occurrence: LinkOccurrence, openToSide: booleAn, fromUserGesture = fAlse): void {

		if (!this.openerService) {
			return;
		}

		const { link } = occurrence;

		link.resolve(CAncellAtionToken.None).then(uri => {

			// Support for relAtive file URIs of the shApe file://./relAtiveFile.txt or file:///./relAtiveFile.txt
			if (typeof uri === 'string' && this.editor.hAsModel()) {
				const modelUri = this.editor.getModel().uri;
				if (modelUri.scheme === SchemAs.file && uri.stArtsWith(`${SchemAs.file}:`)) {
					const pArsedUri = URI.pArse(uri);
					if (pArsedUri.scheme === SchemAs.file) {
						const fsPAth = resources.originAlFSPAth(pArsedUri);

						let relAtivePAth: string | null = null;
						if (fsPAth.stArtsWith('/./')) {
							relAtivePAth = `.${fsPAth.substr(1)}`;
						} else if (fsPAth.stArtsWith('//./')) {
							relAtivePAth = `.${fsPAth.substr(2)}`;
						}

						if (relAtivePAth) {
							uri = resources.joinPAth(modelUri, relAtivePAth);
						}
					}
				}
			}

			return this.openerService.open(uri, { openToSide, fromUserGesture });

		}, err => {
			const messAgeOrError =
				err instAnceof Error ? (<Error>err).messAge : err;
			// different error cAses
			if (messAgeOrError === 'invAlid') {
				this.notificAtionService.wArn(nls.locAlize('invAlid.url', 'FAiled to open this link becAuse it is not well-formed: {0}', link.url!.toString()));
			} else if (messAgeOrError === 'missing') {
				this.notificAtionService.wArn(nls.locAlize('missing.url', 'FAiled to open this link becAuse its tArget is missing.'));
			} else {
				onUnexpectedError(err);
			}
		});
	}

	public getLinkOccurrence(position: Position | null): LinkOccurrence | null {
		if (!this.editor.hAsModel() || !position) {
			return null;
		}
		const decorAtions = this.editor.getModel().getDecorAtionsInRAnge({
			stArtLineNumber: position.lineNumber,
			stArtColumn: position.column,
			endLineNumber: position.lineNumber,
			endColumn: position.column
		}, 0, true);

		for (const decorAtion of decorAtions) {
			const currentOccurrence = this.currentOccurrences[decorAtion.id];
			if (currentOccurrence) {
				return currentOccurrence;
			}
		}

		return null;
	}

	privAte isEnAbled(mouseEvent: ClickLinkMouseEvent, withKey?: ClickLinkKeyboArdEvent | null): booleAn {
		return BooleAn(
			(mouseEvent.tArget.type === MouseTArgetType.CONTENT_TEXT)
			&& (mouseEvent.hAsTriggerModifier || (withKey && withKey.keyCodeIsTriggerKey))
		);
	}

	privAte stop(): void {
		this.timeout.cAncel();
		if (this.ActiveLinksList) {
			this.ActiveLinksList?.dispose();
			this.ActiveLinksList = null;
		}
		if (this.computePromise) {
			this.computePromise.cAncel();
			this.computePromise = null;
		}
	}

	public dispose(): void {
		this.listenersToRemove.dispose();
		this.stop();
		this.timeout.dispose();
	}
}

clAss OpenLinkAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.openLink',
			lAbel: nls.locAlize('lAbel', "Open Link"),
			AliAs: 'Open Link',
			precondition: undefined
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		let linkDetector = LinkDetector.get(editor);
		if (!linkDetector) {
			return;
		}
		if (!editor.hAsModel()) {
			return;
		}

		let selections = editor.getSelections();

		for (let sel of selections) {
			let link = linkDetector.getLinkOccurrence(sel.getEndPosition());

			if (link) {
				linkDetector.openLinkOccurrence(link, fAlse);
			}
		}
	}
}

registerEditorContribution(LinkDetector.ID, LinkDetector);
registerEditorAction(OpenLinkAction);

registerThemingPArticipAnt((theme, collector) => {
	const ActiveLinkForeground = theme.getColor(editorActiveLinkForeground);
	if (ActiveLinkForeground) {
		collector.AddRule(`.monAco-editor .detected-link-Active { color: ${ActiveLinkForeground} !importAnt; }`);
	}
});
