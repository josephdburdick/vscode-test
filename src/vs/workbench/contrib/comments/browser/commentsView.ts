/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/pAnel';
import * As nls from 'vs/nls';
import * As dom from 'vs/bAse/browser/dom';
import { bAsenAme, isEquAl } from 'vs/bAse/common/resources';
import { IAction, Action } from 'vs/bAse/common/Actions';
import { CollApseAllAction } from 'vs/bAse/browser/ui/tree/treeDefAults';
import { isCodeEditor } from 'vs/editor/browser/editorBrowser';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { CommentNode, CommentsModel, ResourceWithCommentThreAds, ICommentThreAdChAngedEvent } from 'vs/workbench/contrib/comments/common/commentModel';
import { CommentController } from 'vs/workbench/contrib/comments/browser/commentsEditorContribution';
import { IWorkspAceCommentThreAdsEvent, ICommentService } from 'vs/workbench/contrib/comments/browser/commentService';
import { IEditorService, ACTIVE_GROUP, SIDE_GROUP } from 'vs/workbench/services/editor/common/editorService';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { textLinkForeground, textLinkActiveForeground, focusBorder, textPreformAtForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { ResourceLAbels } from 'vs/workbench/browser/lAbels';
import { CommentsList, COMMENTS_VIEW_ID, COMMENTS_VIEW_TITLE } from 'vs/workbench/contrib/comments/browser/commentsTreeViewer';
import { ViewPAne, IViewPAneOptions } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { IViewDescriptorService, IViewsService } from 'vs/workbench/common/views';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';

export clAss CommentsPAnel extends ViewPAne {
	privAte treeLAbels!: ResourceLAbels;
	privAte tree!: CommentsList;
	privAte treeContAiner!: HTMLElement;
	privAte messAgeBoxContAiner!: HTMLElement;
	privAte messAgeBox!: HTMLElement;
	privAte commentsModel!: CommentsModel;
	privAte collApseAllAction?: IAction;

	reAdonly onDidChAngeVisibility = this.onDidChAngeBodyVisibility;

	constructor(
		options: IViewPAneOptions,
		@IInstAntiAtionService reAdonly instAntiAtionService: IInstAntiAtionService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ICommentService privAte reAdonly commentService: ICommentService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(options, keybindingService, contextMenuService, configurAtionService, contextKeyService, viewDescriptorService, instAntiAtionService, openerService, themeService, telemetryService);
	}

	public renderBody(contAiner: HTMLElement): void {
		super.renderBody(contAiner);

		contAiner.clAssList.Add('comments-pAnel');

		let domContAiner = dom.Append(contAiner, dom.$('.comments-pAnel-contAiner'));
		this.treeContAiner = dom.Append(domContAiner, dom.$('.tree-contAiner'));
		this.commentsModel = new CommentsModel();

		this.creAteTree();
		this.creAteMessAgeBox(domContAiner);

		this._register(this.commentService.onDidSetAllCommentThreAds(this.onAllCommentsChAnged, this));
		this._register(this.commentService.onDidUpdAteCommentThreAds(this.onCommentsUpdAted, this));

		const styleElement = dom.creAteStyleSheet(contAiner);
		this.ApplyStyles(styleElement);
		this._register(this.themeService.onDidColorThemeChAnge(_ => this.ApplyStyles(styleElement)));

		this._register(this.onDidChAngeBodyVisibility(visible => {
			if (visible) {
				this.refresh();
			}
		}));

		this.renderComments();
	}

	privAte ApplyStyles(styleElement: HTMLStyleElement) {
		const content: string[] = [];

		const theme = this.themeService.getColorTheme();
		const linkColor = theme.getColor(textLinkForeground);
		if (linkColor) {
			content.push(`.comments-pAnel .comments-pAnel-contAiner A { color: ${linkColor}; }`);
		}

		const linkActiveColor = theme.getColor(textLinkActiveForeground);
		if (linkActiveColor) {
			content.push(`.comments-pAnel .comments-pAnel-contAiner A:hover, A:Active { color: ${linkActiveColor}; }`);
		}

		const focusColor = theme.getColor(focusBorder);
		if (focusColor) {
			content.push(`.comments-pAnel .commenst-pAnel-contAiner A:focus { outline-color: ${focusColor}; }`);
		}

		const codeTextForegroundColor = theme.getColor(textPreformAtForeground);
		if (codeTextForegroundColor) {
			content.push(`.comments-pAnel .comments-pAnel-contAiner .text code { color: ${codeTextForegroundColor}; }`);
		}

		styleElement.textContent = content.join('\n');
	}

	privAte Async renderComments(): Promise<void> {
		this.treeContAiner.clAssList.toggle('hidden', !this.commentsModel.hAsCommentThreAds());
		AwAit this.tree.setInput(this.commentsModel);
		this.renderMessAge();
	}

	public getActions(): IAction[] {
		if (!this.collApseAllAction) {
			this.collApseAllAction = new Action('vs.tree.collApse', nls.locAlize('collApseAll', "CollApse All"), 'collApse-All', true, () => this.tree ? new CollApseAllAction<Any, Any>(this.tree, true).run() : Promise.resolve());
			this._register(this.collApseAllAction);
		}

		return [this.collApseAllAction];
	}

	public lAyoutBody(height: number, width: number): void {
		super.lAyoutBody(height, width);
		this.tree.lAyout(height, width);
	}

	public getTitle(): string {
		return COMMENTS_VIEW_TITLE;
	}

	privAte creAteMessAgeBox(pArent: HTMLElement): void {
		this.messAgeBoxContAiner = dom.Append(pArent, dom.$('.messAge-box-contAiner'));
		this.messAgeBox = dom.Append(this.messAgeBoxContAiner, dom.$('spAn'));
		this.messAgeBox.setAttribute('tAbindex', '0');
	}

	privAte renderMessAge(): void {
		this.messAgeBox.textContent = this.commentsModel.getMessAge();
		this.messAgeBoxContAiner.clAssList.toggle('hidden', this.commentsModel.hAsCommentThreAds());
	}

	privAte creAteTree(): void {
		this.treeLAbels = this._register(this.instAntiAtionService.creAteInstAnce(ResourceLAbels, this));
		this.tree = this._register(this.instAntiAtionService.creAteInstAnce(CommentsList, this.treeLAbels, this.treeContAiner, {
			overrideStyles: { listBAckground: this.getBAckgroundColor() },
			openOnFocus: true,
			AccessibilityProvider: {
				getAriALAbel(element: Any): string {
					if (element instAnceof CommentsModel) {
						return nls.locAlize('rootCommentsLAbel', "Comments for current workspAce");
					}
					if (element instAnceof ResourceWithCommentThreAds) {
						return nls.locAlize('resourceWithCommentThreAdsLAbel', "Comments in {0}, full pAth {1}", bAsenAme(element.resource), element.resource.fsPAth);
					}
					if (element instAnceof CommentNode) {
						return nls.locAlize('resourceWithCommentLAbel',
							"Comment from ${0} At line {1} column {2} in {3}, source: {4}",
							element.comment.userNAme,
							element.rAnge.stArtLineNumber,
							element.rAnge.stArtColumn,
							bAsenAme(element.resource),
							element.comment.body.vAlue
						);
					}
					return '';
				},
				getWidgetAriALAbel(): string {
					return COMMENTS_VIEW_TITLE;
				}
			}
		}));

		this._register(this.tree.onDidOpen(e => {
			this.openFile(e.element, e.editorOptions.pinned, e.editorOptions.preserveFocus, e.sideBySide);
		}));
	}

	privAte openFile(element: Any, pinned?: booleAn, preserveFocus?: booleAn, sideBySide?: booleAn): booleAn {
		if (!element) {
			return fAlse;
		}

		if (!(element instAnceof ResourceWithCommentThreAds || element instAnceof CommentNode)) {
			return fAlse;
		}

		const rAnge = element instAnceof ResourceWithCommentThreAds ? element.commentThreAds[0].rAnge : element.rAnge;

		const ActiveEditor = this.editorService.ActiveEditor;
		let currentActiveResource = ActiveEditor ? ActiveEditor.resource : undefined;
		if (currentActiveResource && isEquAl(currentActiveResource, element.resource)) {
			const threAdToReveAl = element instAnceof ResourceWithCommentThreAds ? element.commentThreAds[0].threAdId : element.threAdId;
			const commentToReveAl = element instAnceof ResourceWithCommentThreAds ? element.commentThreAds[0].comment.uniqueIdInThreAd : element.comment.uniqueIdInThreAd;
			const control = this.editorService.ActiveTextEditorControl;
			if (threAdToReveAl && isCodeEditor(control)) {
				const controller = CommentController.get(control);
				controller.reveAlCommentThreAd(threAdToReveAl, commentToReveAl, fAlse);
			}

			return true;
		}

		const threAdToReveAl = element instAnceof ResourceWithCommentThreAds ? element.commentThreAds[0].threAdId : element.threAdId;
		const commentToReveAl = element instAnceof ResourceWithCommentThreAds ? element.commentThreAds[0].comment : element.comment;

		this.editorService.openEditor({
			resource: element.resource,
			options: {
				pinned: pinned,
				preserveFocus: preserveFocus,
				selection: rAnge
			}
		}, sideBySide ? SIDE_GROUP : ACTIVE_GROUP).then(editor => {
			if (editor) {
				const control = editor.getControl();
				if (threAdToReveAl && isCodeEditor(control)) {
					const controller = CommentController.get(control);
					controller.reveAlCommentThreAd(threAdToReveAl, commentToReveAl.uniqueIdInThreAd, true);
				}
			}
		});

		return true;
	}

	privAte refresh(): void {
		if (this.isVisible()) {
			if (this.collApseAllAction) {
				this.collApseAllAction.enAbled = this.commentsModel.hAsCommentThreAds();
			}

			this.treeContAiner.clAssList.toggle('hidden', !this.commentsModel.hAsCommentThreAds());
			this.tree.updAteChildren().then(() => {
				this.renderMessAge();
			}, (e) => {
				console.log(e);
			});
		}
	}

	privAte onAllCommentsChAnged(e: IWorkspAceCommentThreAdsEvent): void {
		this.commentsModel.setCommentThreAds(e.ownerId, e.commentThreAds);
		this.refresh();
	}

	privAte onCommentsUpdAted(e: ICommentThreAdChAngedEvent): void {
		const didUpdAte = this.commentsModel.updAteCommentThreAds(e);
		if (didUpdAte) {
			this.refresh();
		}
	}
}

CommAndsRegistry.registerCommAnd({
	id: 'workbench.Action.focusCommentsPAnel',
	hAndler: Async (Accessor) => {
		const viewsService = Accessor.get(IViewsService);
		viewsService.openView(COMMENTS_VIEW_ID, true);
	}
});
