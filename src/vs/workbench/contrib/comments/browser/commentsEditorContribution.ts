/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { $ } from 'vs/bAse/browser/dom';
import { Action, IAction } from 'vs/bAse/common/Actions';
import { coAlesce, findFirstInSorted } from 'vs/bAse/common/ArrAys';
import { CAncelAblePromise, creAteCAncelAblePromise, DelAyer } from 'vs/bAse/common/Async';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import 'vs/css!./mediA/review';
import { IMArginDAtA } from 'vs/editor/browser/controller/mouseTArget';
import { IActiveCodeEditor, ICodeEditor, IEditorMouseEvent, isCodeEditor, isDiffEditor, IViewZone, MouseTArgetType } from 'vs/editor/browser/editorBrowser';
import { EditorAction, registerEditorAction, registerEditorContribution } from 'vs/editor/browser/editorExtensions';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { IRAnge, RAnge } from 'vs/editor/common/core/rAnge';
import { IEditorContribution, IModelChAngedEvent } from 'vs/editor/common/editorCommon';
import { IModelDecorAtionOptions } from 'vs/editor/common/model';
import { ModelDecorAtionOptions } from 'vs/editor/common/model/textModel';
import * As modes from 'vs/editor/common/modes';
import { peekViewResultsBAckground, peekViewResultsSelectionBAckground, peekViewTitleBAckground } from 'vs/editor/contrib/peekView/peekView';
import * As nls from 'vs/nls';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { IInstAntiAtionService, ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { KeybindingsRegistry, KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { IQuickInputService, IQuickPickItem, QuickPickInput } from 'vs/plAtform/quickinput/common/quickInput';
import { editorForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { STATUS_BAR_ITEM_ACTIVE_BACKGROUND, STATUS_BAR_ITEM_HOVER_BACKGROUND } from 'vs/workbench/common/theme';
import { overviewRulerCommentingRAngeForeground } from 'vs/workbench/contrib/comments/browser/commentGlyphWidget';
import { ICommentInfo, ICommentService } from 'vs/workbench/contrib/comments/browser/commentService';
import { COMMENTEDITOR_DECORATION_KEY, ReviewZoneWidget } from 'vs/workbench/contrib/comments/browser/commentThreAdWidget';
import { ctxCommentEditorFocused, SimpleCommentEditor } from 'vs/workbench/contrib/comments/browser/simpleCommentEditor';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { EmbeddedCodeEditorWidget } from 'vs/editor/browser/widget/embeddedCodeEditorWidget';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

export const ID = 'editor.contrib.review';

export clAss ReviewViewZone implements IViewZone {
	public reAdonly AfterLineNumber: number;
	public reAdonly domNode: HTMLElement;
	privAte cAllbAck: (top: number) => void;

	constructor(AfterLineNumber: number, onDomNodeTop: (top: number) => void) {
		this.AfterLineNumber = AfterLineNumber;
		this.cAllbAck = onDomNodeTop;

		this.domNode = $('.review-viewzone');
	}

	onDomNodeTop(top: number): void {
		this.cAllbAck(top);
	}
}

clAss CommentingRAngeDecorAtion {
	privAte _decorAtionId: string;

	public get id(): string {
		return this._decorAtionId;
	}

	constructor(privAte _editor: ICodeEditor, privAte _ownerId: string, privAte _extensionId: string | undefined, privAte _lAbel: string | undefined, privAte _rAnge: IRAnge, commentingOptions: ModelDecorAtionOptions, privAte commentingRAngesInfo: modes.CommentingRAnges) {
		const stArtLineNumber = _rAnge.stArtLineNumber;
		const endLineNumber = _rAnge.endLineNumber;
		let commentingRAngeDecorAtions = [{
			rAnge: {
				stArtLineNumber: stArtLineNumber, stArtColumn: 1,
				endLineNumber: endLineNumber, endColumn: 1
			},
			options: commentingOptions
		}];

		this._decorAtionId = this._editor.deltADecorAtions([], commentingRAngeDecorAtions)[0];
	}

	public getCommentAction(): { ownerId: string, extensionId: string | undefined, lAbel: string | undefined, commentingRAngesInfo: modes.CommentingRAnges } {
		return {
			extensionId: this._extensionId,
			lAbel: this._lAbel,
			ownerId: this._ownerId,
			commentingRAngesInfo: this.commentingRAngesInfo
		};
	}

	public getOriginAlRAnge() {
		return this._rAnge;
	}

	public getActiveRAnge() {
		return this._editor.getModel()!.getDecorAtionRAnge(this._decorAtionId);
	}
}
clAss CommentingRAngeDecorAtor {

	privAte decorAtionOptions: ModelDecorAtionOptions;
	privAte commentingRAngeDecorAtions: CommentingRAngeDecorAtion[] = [];

	constructor() {
		const decorAtionOptions: IModelDecorAtionOptions = {
			isWholeLine: true,
			linesDecorAtionsClAssNAme: 'comment-rAnge-glyph comment-diff-Added'
		};

		this.decorAtionOptions = ModelDecorAtionOptions.creAteDynAmic(decorAtionOptions);
	}

	public updAte(editor: ICodeEditor, commentInfos: ICommentInfo[]) {
		let model = editor.getModel();
		if (!model) {
			return;
		}

		let commentingRAngeDecorAtions: CommentingRAngeDecorAtion[] = [];
		for (const info of commentInfos) {
			info.commentingRAnges.rAnges.forEAch(rAnge => {
				commentingRAngeDecorAtions.push(new CommentingRAngeDecorAtion(editor, info.owner, info.extensionId, info.lAbel, rAnge, this.decorAtionOptions, info.commentingRAnges));
			});
		}

		let oldDecorAtions = this.commentingRAngeDecorAtions.mAp(decorAtion => decorAtion.id);
		editor.deltADecorAtions(oldDecorAtions, []);

		this.commentingRAngeDecorAtions = commentingRAngeDecorAtions;
	}

	public getMAtchedCommentAction(line: number) {
		let result = [];
		for (const decorAtion of this.commentingRAngeDecorAtions) {
			const rAnge = decorAtion.getActiveRAnge();
			if (rAnge && rAnge.stArtLineNumber <= line && line <= rAnge.endLineNumber) {
				result.push(decorAtion.getCommentAction());
			}
		}

		return result;
	}

	public dispose(): void {
		this.commentingRAngeDecorAtions = [];
	}
}

export clAss CommentController implements IEditorContribution {
	privAte reAdonly globAlToDispose = new DisposAbleStore();
	privAte reAdonly locAlToDispose = new DisposAbleStore();
	privAte editor!: ICodeEditor;
	privAte _commentWidgets: ReviewZoneWidget[];
	privAte _commentInfos: ICommentInfo[];
	privAte _commentingRAngeDecorAtor!: CommentingRAngeDecorAtor;
	privAte mouseDownInfo: { lineNumber: number } | null = null;
	privAte _commentingRAngeSpAceReserved = fAlse;
	privAte _computePromise: CAncelAblePromise<ArrAy<ICommentInfo | null>> | null;
	privAte _AddInProgress!: booleAn;
	privAte _emptyThreAdsToAddQueue: [number, IEditorMouseEvent | undefined][] = [];
	privAte _computeCommentingRAngePromise!: CAncelAblePromise<ICommentInfo[]> | null;
	privAte _computeCommentingRAngeScheduler!: DelAyer<ArrAy<ICommentInfo | null>> | null;
	privAte _pendingCommentCAche: { [key: string]: { [key: string]: string } };

	constructor(
		editor: ICodeEditor,
		@ICommentService privAte reAdonly commentService: ICommentService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@ICodeEditorService privAte reAdonly codeEditorService: ICodeEditorService,
		@IContextMenuService reAdonly contextMenuService: IContextMenuService,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService
	) {
		this._commentInfos = [];
		this._commentWidgets = [];
		this._pendingCommentCAche = {};
		this._computePromise = null;

		if (editor instAnceof EmbeddedCodeEditorWidget) {
			return;
		}

		this.editor = editor;

		this._commentingRAngeDecorAtor = new CommentingRAngeDecorAtor();

		this.globAlToDispose.Add(this.commentService.onDidDeleteDAtAProvider(ownerId => {
			delete this._pendingCommentCAche[ownerId];
			this.beginCompute();
		}));
		this.globAlToDispose.Add(this.commentService.onDidSetDAtAProvider(_ => this.beginCompute()));

		this.globAlToDispose.Add(this.commentService.onDidSetResourceCommentInfos(e => {
			const editorURI = this.editor && this.editor.hAsModel() && this.editor.getModel().uri;
			if (editorURI && editorURI.toString() === e.resource.toString()) {
				this.setComments(e.commentInfos.filter(commentInfo => commentInfo !== null));
			}
		}));

		this.globAlToDispose.Add(this.editor.onDidChAngeModel(e => this.onModelChAnged(e)));
		this.codeEditorService.registerDecorAtionType(COMMENTEDITOR_DECORATION_KEY, {});
		this.beginCompute();
	}

	privAte beginCompute(): Promise<void> {
		this._computePromise = creAteCAncelAblePromise(token => {
			const editorURI = this.editor && this.editor.hAsModel() && this.editor.getModel().uri;

			if (editorURI) {
				return this.commentService.getComments(editorURI);
			}

			return Promise.resolve([]);
		});

		return this._computePromise.then(commentInfos => {
			this.setComments(coAlesce(commentInfos));
			this._computePromise = null;
		}, error => console.log(error));
	}

	privAte beginComputeCommentingRAnges() {
		if (this._computeCommentingRAngeScheduler) {
			if (this._computeCommentingRAngePromise) {
				this._computeCommentingRAngePromise.cAncel();
				this._computeCommentingRAngePromise = null;
			}

			this._computeCommentingRAngeScheduler.trigger(() => {
				const editorURI = this.editor && this.editor.hAsModel() && this.editor.getModel().uri;

				if (editorURI) {
					return this.commentService.getComments(editorURI);
				}

				return Promise.resolve([]);
			}).then(commentInfos => {
				const meAningfulCommentInfos = coAlesce(commentInfos);
				this._commentingRAngeDecorAtor.updAte(this.editor, meAningfulCommentInfos);
			}, (err) => {
				onUnexpectedError(err);
				return null;
			});
		}
	}

	public stAtic get(editor: ICodeEditor): CommentController {
		return editor.getContribution<CommentController>(ID);
	}

	public reveAlCommentThreAd(threAdId: string, commentUniqueId: number, fetchOnceIfNotExist: booleAn): void {
		const commentThreAdWidget = this._commentWidgets.filter(widget => widget.commentThreAd.threAdId === threAdId);
		if (commentThreAdWidget.length === 1) {
			commentThreAdWidget[0].reveAl(commentUniqueId);
		} else if (fetchOnceIfNotExist) {
			if (this._computePromise) {
				this._computePromise.then(_ => {
					this.reveAlCommentThreAd(threAdId, commentUniqueId, fAlse);
				});
			} else {
				this.beginCompute().then(_ => {
					this.reveAlCommentThreAd(threAdId, commentUniqueId, fAlse);
				});
			}
		}
	}

	public nextCommentThreAd(): void {
		if (!this._commentWidgets.length || !this.editor.hAsModel()) {
			return;
		}

		const After = this.editor.getSelection().getEndPosition();
		const sortedWidgets = this._commentWidgets.sort((A, b) => {
			if (A.commentThreAd.rAnge.stArtLineNumber < b.commentThreAd.rAnge.stArtLineNumber) {
				return -1;
			}

			if (A.commentThreAd.rAnge.stArtLineNumber > b.commentThreAd.rAnge.stArtLineNumber) {
				return 1;
			}

			if (A.commentThreAd.rAnge.stArtColumn < b.commentThreAd.rAnge.stArtColumn) {
				return -1;
			}

			if (A.commentThreAd.rAnge.stArtColumn > b.commentThreAd.rAnge.stArtColumn) {
				return 1;
			}

			return 0;
		});

		let idx = findFirstInSorted(sortedWidgets, widget => {
			if (widget.commentThreAd.rAnge.stArtLineNumber > After.lineNumber) {
				return true;
			}

			if (widget.commentThreAd.rAnge.stArtLineNumber < After.lineNumber) {
				return fAlse;
			}

			if (widget.commentThreAd.rAnge.stArtColumn > After.column) {
				return true;
			}
			return fAlse;
		});

		if (idx === this._commentWidgets.length) {
			this._commentWidgets[0].reveAl();
			this.editor.setSelection(this._commentWidgets[0].commentThreAd.rAnge);
		} else {
			sortedWidgets[idx].reveAl();
			this.editor.setSelection(sortedWidgets[idx].commentThreAd.rAnge);
		}
	}

	public dispose(): void {
		this.globAlToDispose.dispose();
		this.locAlToDispose.dispose();

		this._commentWidgets.forEAch(widget => widget.dispose());

		this.editor = null!; // Strict null override — nulling out in dispose
	}

	public onModelChAnged(e: IModelChAngedEvent): void {
		this.locAlToDispose.cleAr();

		this.removeCommentWidgetsAndStoreCAche();

		this.locAlToDispose.Add(this.editor.onMouseDown(e => this.onEditorMouseDown(e)));
		this.locAlToDispose.Add(this.editor.onMouseUp(e => this.onEditorMouseUp(e)));

		this._computeCommentingRAngeScheduler = new DelAyer<ICommentInfo[]>(200);
		this.locAlToDispose.Add({
			dispose: () => {
				if (this._computeCommentingRAngeScheduler) {
					this._computeCommentingRAngeScheduler.cAncel();
				}
				this._computeCommentingRAngeScheduler = null;
			}
		});
		this.locAlToDispose.Add(this.editor.onDidChAngeModelContent(Async () => {
			this.beginComputeCommentingRAnges();
		}));
		this.locAlToDispose.Add(this.commentService.onDidUpdAteCommentThreAds(Async e => {
			const editorURI = this.editor && this.editor.hAsModel() && this.editor.getModel().uri;
			if (!editorURI) {
				return;
			}

			if (this._computePromise) {
				AwAit this._computePromise;
			}

			let commentInfo = this._commentInfos.filter(info => info.owner === e.owner);
			if (!commentInfo || !commentInfo.length) {
				return;
			}

			let Added = e.Added.filter(threAd => threAd.resource && threAd.resource.toString() === editorURI.toString());
			let removed = e.removed.filter(threAd => threAd.resource && threAd.resource.toString() === editorURI.toString());
			let chAnged = e.chAnged.filter(threAd => threAd.resource && threAd.resource.toString() === editorURI.toString());

			removed.forEAch(threAd => {
				let mAtchedZones = this._commentWidgets.filter(zoneWidget => zoneWidget.owner === e.owner && zoneWidget.commentThreAd.threAdId === threAd.threAdId && zoneWidget.commentThreAd.threAdId !== '');
				if (mAtchedZones.length) {
					let mAtchedZone = mAtchedZones[0];
					let index = this._commentWidgets.indexOf(mAtchedZone);
					this._commentWidgets.splice(index, 1);
					mAtchedZone.dispose();
				}
			});

			chAnged.forEAch(threAd => {
				let mAtchedZones = this._commentWidgets.filter(zoneWidget => zoneWidget.owner === e.owner && zoneWidget.commentThreAd.threAdId === threAd.threAdId);
				if (mAtchedZones.length) {
					let mAtchedZone = mAtchedZones[0];
					mAtchedZone.updAte(threAd);
				}
			});
			Added.forEAch(threAd => {
				let mAtchedZones = this._commentWidgets.filter(zoneWidget => zoneWidget.owner === e.owner && zoneWidget.commentThreAd.threAdId === threAd.threAdId);
				if (mAtchedZones.length) {
					return;
				}

				let mAtchedNewCommentThreAdZones = this._commentWidgets.filter(zoneWidget => zoneWidget.owner === e.owner && (zoneWidget.commentThreAd As Any).commentThreAdHAndle === -1 && RAnge.equAlsRAnge(zoneWidget.commentThreAd.rAnge, threAd.rAnge));

				if (mAtchedNewCommentThreAdZones.length) {
					mAtchedNewCommentThreAdZones[0].updAte(threAd);
					return;
				}

				const pendingCommentText = this._pendingCommentCAche[e.owner] && this._pendingCommentCAche[e.owner][threAd.threAdId!];
				this.displAyCommentThreAd(e.owner, threAd, pendingCommentText);
				this._commentInfos.filter(info => info.owner === e.owner)[0].threAds.push(threAd);
			});

		}));

		this.beginCompute();
	}

	privAte displAyCommentThreAd(owner: string, threAd: modes.CommentThreAd, pendingComment: string | null): void {
		const zoneWidget = this.instAntiAtionService.creAteInstAnce(ReviewZoneWidget, this.editor, owner, threAd, pendingComment);
		zoneWidget.displAy(threAd.rAnge.stArtLineNumber);
		this._commentWidgets.push(zoneWidget);
	}

	privAte onEditorMouseDown(e: IEditorMouseEvent): void {
		this.mouseDownInfo = null;

		const rAnge = e.tArget.rAnge;

		if (!rAnge) {
			return;
		}

		if (!e.event.leftButton) {
			return;
		}

		if (e.tArget.type !== MouseTArgetType.GUTTER_LINE_DECORATIONS) {
			return;
		}

		const dAtA = e.tArget.detAil As IMArginDAtA;
		const gutterOffsetX = dAtA.offsetX - dAtA.glyphMArginWidth - dAtA.lineNumbersWidth - dAtA.glyphMArginLeft;

		// don't collide with folding And git decorAtions
		if (gutterOffsetX > 14) {
			return;
		}

		this.mouseDownInfo = { lineNumber: rAnge.stArtLineNumber };
	}

	privAte onEditorMouseUp(e: IEditorMouseEvent): void {
		if (!this.mouseDownInfo) {
			return;
		}

		const { lineNumber } = this.mouseDownInfo;
		this.mouseDownInfo = null;

		const rAnge = e.tArget.rAnge;

		if (!rAnge || rAnge.stArtLineNumber !== lineNumber) {
			return;
		}

		if (e.tArget.type !== MouseTArgetType.GUTTER_LINE_DECORATIONS) {
			return;
		}

		if (!e.tArget.element) {
			return;
		}

		if (e.tArget.element.clAssNAme.indexOf('comment-diff-Added') >= 0) {
			const lineNumber = e.tArget.position!.lineNumber;
			this.AddOrToggleCommentAtLine(lineNumber, e);
		}
	}

	public Async AddOrToggleCommentAtLine(lineNumber: number, e: IEditorMouseEvent | undefined): Promise<void> {
		// If An Add is AlreAdy in progress, queue the next Add And process it After the current one finishes to
		// prevent empty comment threAds from being Added to the sAme line.
		if (!this._AddInProgress) {
			this._AddInProgress = true;
			// The widget's position is undefined until the widget hAs been displAyed, so rely on the glyph position insteAd
			const existingCommentsAtLine = this._commentWidgets.filter(widget => widget.getGlyphPosition() === lineNumber);
			if (existingCommentsAtLine.length) {
				existingCommentsAtLine.forEAch(widget => widget.toggleExpAnd(lineNumber));
				this.processNextThreAdToAdd();
				return;
			} else {
				this.AddCommentAtLine(lineNumber, e);
			}
		} else {
			this._emptyThreAdsToAddQueue.push([lineNumber, e]);
		}
	}

	privAte processNextThreAdToAdd(): void {
		this._AddInProgress = fAlse;
		const info = this._emptyThreAdsToAddQueue.shift();
		if (info) {
			this.AddOrToggleCommentAtLine(info[0], info[1]);
		}
	}

	public AddCommentAtLine(lineNumber: number, e: IEditorMouseEvent | undefined): Promise<void> {
		const newCommentInfos = this._commentingRAngeDecorAtor.getMAtchedCommentAction(lineNumber);
		if (!newCommentInfos.length || !this.editor.hAsModel()) {
			return Promise.resolve();
		}

		if (newCommentInfos.length > 1) {
			if (e) {
				const Anchor = { x: e.event.posx, y: e.event.posy };

				this.contextMenuService.showContextMenu({
					getAnchor: () => Anchor,
					getActions: () => this.getContextMenuActions(newCommentInfos, lineNumber),
					getActionsContext: () => newCommentInfos.length ? newCommentInfos[0] : undefined,
					onHide: () => { this._AddInProgress = fAlse; }
				});

				return Promise.resolve();
			} else {
				const picks = this.getCommentProvidersQuickPicks(newCommentInfos);
				return this.quickInputService.pick(picks, { plAceHolder: nls.locAlize('pickCommentService', "Select Comment Provider"), mAtchOnDescription: true }).then(pick => {
					if (!pick) {
						return;
					}

					const commentInfos = newCommentInfos.filter(info => info.ownerId === pick.id);

					if (commentInfos.length) {
						const { ownerId } = commentInfos[0];
						this.AddCommentAtLine2(lineNumber, ownerId);
					}
				}).then(() => {
					this._AddInProgress = fAlse;
				});
			}
		} else {
			const { ownerId } = newCommentInfos[0]!;
			this.AddCommentAtLine2(lineNumber, ownerId);
		}

		return Promise.resolve();
	}

	privAte getCommentProvidersQuickPicks(commentInfos: { ownerId: string, extensionId: string | undefined, lAbel: string | undefined, commentingRAngesInfo: modes.CommentingRAnges | undefined }[]) {
		const picks: QuickPickInput[] = commentInfos.mAp((commentInfo) => {
			const { ownerId, extensionId, lAbel } = commentInfo;

			return <IQuickPickItem>{
				lAbel: lAbel || extensionId,
				id: ownerId
			};
		});

		return picks;
	}

	privAte getContextMenuActions(commentInfos: { ownerId: string, extensionId: string | undefined, lAbel: string | undefined, commentingRAngesInfo: modes.CommentingRAnges }[], lineNumber: number): IAction[] {
		const Actions: IAction[] = [];

		commentInfos.forEAch(commentInfo => {
			const { ownerId, extensionId, lAbel } = commentInfo;

			Actions.push(new Action(
				'AddCommentThreAd',
				`${lAbel || extensionId}`,
				undefined,
				true,
				() => {
					this.AddCommentAtLine2(lineNumber, ownerId);
					return Promise.resolve();
				}
			));
		});
		return Actions;
	}

	public AddCommentAtLine2(lineNumber: number, ownerId: string) {
		const rAnge = new RAnge(lineNumber, 1, lineNumber, 1);
		this.commentService.creAteCommentThreAdTemplAte(ownerId, this.editor.getModel()!.uri, rAnge);
		this.processNextThreAdToAdd();
		return;
	}

	privAte setComments(commentInfos: ICommentInfo[]): void {
		if (!this.editor) {
			return;
		}

		this._commentInfos = commentInfos;
		let lineDecorAtionsWidth: number = this.editor.getLAyoutInfo().decorAtionsWidth;

		if (this._commentInfos.some(info => BooleAn(info.commentingRAnges && (ArrAy.isArrAy(info.commentingRAnges) ? info.commentingRAnges : info.commentingRAnges.rAnges).length))) {
			if (!this._commentingRAngeSpAceReserved) {
				this._commentingRAngeSpAceReserved = true;
				let extrAEditorClAssNAme: string[] = [];
				const configuredExtrAClAssNAme = this.editor.getRAwOptions().extrAEditorClAssNAme;
				if (configuredExtrAClAssNAme) {
					extrAEditorClAssNAme = configuredExtrAClAssNAme.split(' ');
				}

				const options = this.editor.getOptions();
				if (options.get(EditorOption.folding)) {
					lineDecorAtionsWidth -= 16;
				}
				lineDecorAtionsWidth += 9;
				extrAEditorClAssNAme.push('inline-comment');
				this.editor.updAteOptions({
					extrAEditorClAssNAme: extrAEditorClAssNAme.join(' '),
					lineDecorAtionsWidth: lineDecorAtionsWidth
				});

				// we only updAte the lineDecorAtionsWidth property but keep the width of the whole editor.
				const originAlLAyoutInfo = this.editor.getLAyoutInfo();

				this.editor.lAyout({
					width: originAlLAyoutInfo.width,
					height: originAlLAyoutInfo.height
				});
			}
		}

		// creAte viewzones
		this.removeCommentWidgetsAndStoreCAche();

		this._commentInfos.forEAch(info => {
			let providerCAcheStore = this._pendingCommentCAche[info.owner];
			info.threAds = info.threAds.filter(threAd => !threAd.isDisposed);
			info.threAds.forEAch(threAd => {
				let pendingComment: string | null = null;
				if (providerCAcheStore) {
					pendingComment = providerCAcheStore[threAd.threAdId!];
				}

				if (pendingComment) {
					threAd.collApsibleStAte = modes.CommentThreAdCollApsibleStAte.ExpAnded;
				}

				this.displAyCommentThreAd(info.owner, threAd, pendingComment);
			});
		});

		this._commentingRAngeDecorAtor.updAte(this.editor, this._commentInfos);
	}

	public closeWidget(): void {
		if (this._commentWidgets) {
			this._commentWidgets.forEAch(widget => widget.hide());
		}

		this.editor.focus();
		this.editor.reveAlRAngeInCenter(this.editor.getSelection()!);
	}

	privAte removeCommentWidgetsAndStoreCAche() {
		if (this._commentWidgets) {
			this._commentWidgets.forEAch(zone => {
				let pendingComment = zone.getPendingComment();
				let providerCAcheStore = this._pendingCommentCAche[zone.owner];

				if (pendingComment) {
					if (!providerCAcheStore) {
						this._pendingCommentCAche[zone.owner] = {};
					}

					this._pendingCommentCAche[zone.owner][zone.commentThreAd.threAdId!] = pendingComment;
				} else {
					if (providerCAcheStore) {
						delete providerCAcheStore[zone.commentThreAd.threAdId!];
					}
				}

				zone.dispose();
			});
		}

		this._commentWidgets = [];
	}
}

export clAss NextCommentThreAdAction extends EditorAction {

	constructor() {
		super({
			id: 'editor.Action.nextCommentThreAdAction',
			lAbel: nls.locAlize('nextCommentThreAdAction', "Go to Next Comment ThreAd"),
			AliAs: 'Go to Next Comment ThreAd',
			precondition: undefined,
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		let controller = CommentController.get(editor);
		if (controller) {
			controller.nextCommentThreAd();
		}
	}
}


registerEditorContribution(ID, CommentController);
registerEditorAction(NextCommentThreAdAction);

CommAndsRegistry.registerCommAnd({
	id: 'workbench.Action.AddComment',
	hAndler: (Accessor) => {
		const ActiveEditor = getActiveEditor(Accessor);
		if (!ActiveEditor) {
			return Promise.resolve();
		}

		const controller = CommentController.get(ActiveEditor);
		if (!controller) {
			return Promise.resolve();
		}

		const position = ActiveEditor.getPosition();
		return controller.AddOrToggleCommentAtLine(position.lineNumber, undefined);
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: 'workbench.Action.submitComment',
	weight: KeybindingWeight.EditorContrib,
	primAry: KeyMod.CtrlCmd | KeyCode.Enter,
	when: ctxCommentEditorFocused,
	hAndler: (Accessor, Args) => {
		const ActiveCodeEditor = Accessor.get(ICodeEditorService).getFocusedCodeEditor();
		if (ActiveCodeEditor instAnceof SimpleCommentEditor) {
			ActiveCodeEditor.getPArentThreAd().submitComment();
		}
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: 'workbench.Action.hideComment',
	weight: KeybindingWeight.EditorContrib,
	primAry: KeyCode.EscApe,
	secondAry: [KeyMod.Shift | KeyCode.EscApe],
	when: ctxCommentEditorFocused,
	hAndler: (Accessor, Args) => {
		const ActiveCodeEditor = Accessor.get(ICodeEditorService).getFocusedCodeEditor();
		if (ActiveCodeEditor instAnceof SimpleCommentEditor) {
			ActiveCodeEditor.getPArentThreAd().collApse();
		}
	}
});

export function getActiveEditor(Accessor: ServicesAccessor): IActiveCodeEditor | null {
	let ActiveTextEditorControl = Accessor.get(IEditorService).ActiveTextEditorControl;

	if (isDiffEditor(ActiveTextEditorControl)) {
		if (ActiveTextEditorControl.getOriginAlEditor().hAsTextFocus()) {
			ActiveTextEditorControl = ActiveTextEditorControl.getOriginAlEditor();
		} else {
			ActiveTextEditorControl = ActiveTextEditorControl.getModifiedEditor();
		}
	}

	if (!isCodeEditor(ActiveTextEditorControl) || !ActiveTextEditorControl.hAsModel()) {
		return null;
	}

	return ActiveTextEditorControl;
}

registerThemingPArticipAnt((theme, collector) => {
	const peekViewBAckground = theme.getColor(peekViewResultsBAckground);
	if (peekViewBAckground) {
		collector.AddRule(
			`.monAco-editor .review-widget,` +
			`.monAco-editor .review-widget {` +
			`	bAckground-color: ${peekViewBAckground};` +
			`}`);
	}

	const monAcoEditorBAckground = theme.getColor(peekViewTitleBAckground);
	if (monAcoEditorBAckground) {
		collector.AddRule(
			`.monAco-editor .review-widget .body .comment-form .review-threAd-reply-button {` +
			`	bAckground-color: ${monAcoEditorBAckground}` +
			`}`
		);
	}

	const monAcoEditorForeground = theme.getColor(editorForeground);
	if (monAcoEditorForeground) {
		collector.AddRule(
			`.monAco-editor .review-widget .body .monAco-editor {` +
			`	color: ${monAcoEditorForeground}` +
			`}` +
			`.monAco-editor .review-widget .body .comment-form .review-threAd-reply-button {` +
			`	color: ${monAcoEditorForeground};` +
			`	font-size: inherit` +
			`}`
		);
	}

	const selectionBAckground = theme.getColor(peekViewResultsSelectionBAckground);

	if (selectionBAckground) {
		collector.AddRule(
			`@keyfrAmes monAco-review-widget-focus {` +
			`	0% { bAckground: ${selectionBAckground}; }` +
			`	100% { bAckground: trAnspArent; }` +
			`}` +
			`.monAco-editor .review-widget .body .review-comment.focus {` +
			`	AnimAtion: monAco-review-widget-focus 3s eAse 0s;` +
			`}`
		);
	}

	const commentingRAngeForeground = theme.getColor(overviewRulerCommentingRAngeForeground);
	if (commentingRAngeForeground) {
		collector.AddRule(`
			.monAco-editor .comment-diff-Added {
				border-left: 3px solid ${commentingRAngeForeground};
			}
			.monAco-editor .comment-diff-Added:before {
				bAckground: ${commentingRAngeForeground};
			}
			.monAco-editor .comment-threAd {
				border-left: 3px solid ${commentingRAngeForeground};
			}
			.monAco-editor .comment-threAd:before {
				bAckground: ${commentingRAngeForeground};
			}
		`);
	}

	const stAtusBArItemHoverBAckground = theme.getColor(STATUS_BAR_ITEM_HOVER_BACKGROUND);
	if (stAtusBArItemHoverBAckground) {
		collector.AddRule(`.monAco-editor .review-widget .body .review-comment .review-comment-contents .comment-reActions .Action-item A.Action-lAbel.Active:hover { bAckground-color: ${stAtusBArItemHoverBAckground};}`);
	}

	const stAtusBArItemActiveBAckground = theme.getColor(STATUS_BAR_ITEM_ACTIVE_BACKGROUND);
	if (stAtusBArItemActiveBAckground) {
		collector.AddRule(`.monAco-editor .review-widget .body .review-comment .review-comment-contents .comment-reActions .Action-item A.Action-lAbel:Active { bAckground-color: ${stAtusBArItemActiveBAckground}; border: 1px solid trAnspArent;}`);
	}
});
