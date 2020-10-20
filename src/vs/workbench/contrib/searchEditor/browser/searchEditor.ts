/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As DOM from 'vs/bAse/browser/dom';
import { StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { Alert } from 'vs/bAse/browser/ui/AriA/AriA';
import { DelAyer } from 'vs/bAse/common/Async';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { dispose, IDisposAble } from 'vs/bAse/common/lifecycle';
import { AssertIsDefined } from 'vs/bAse/common/types';
import { URI } from 'vs/bAse/common/uri';
import 'vs/css!./mediA/seArchEditor';
import { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ICodeEditorViewStAte } from 'vs/editor/common/editorCommon';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ITextResourceConfigurAtionService } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { ReferencesController } from 'vs/editor/contrib/gotoSymbol/peek/referencesController';
import { locAlize } from 'vs/nls';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContextKey, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IContextViewService } from 'vs/plAtform/contextview/browser/contextView';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { IEditorProgressService, LongRunningOperAtion } from 'vs/plAtform/progress/common/progress';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { inputBorder, registerColor, seArchEditorFindMAtch, seArchEditorFindMAtchBorder } from 'vs/plAtform/theme/common/colorRegistry';
import { AttAchInputBoxStyler } from 'vs/plAtform/theme/common/styler';
import { IThemeService, registerThemingPArticipAnt } from 'vs/plAtform/theme/common/themeService';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { BAseTextEditor } from 'vs/workbench/browser/pArts/editor/textEditor';
import { EditorOptions, IEditorOpenContext } from 'vs/workbench/common/editor';
import { ExcludePAtternInputWidget, PAtternInputWidget } from 'vs/workbench/contrib/seArch/browser/pAtternInputWidget';
import { SeArchWidget } from 'vs/workbench/contrib/seArch/browser/seArchWidget';
import { InputBoxFocusedKey } from 'vs/workbench/contrib/seArch/common/constAnts';
import { ITextQueryBuilderOptions, QueryBuilder } from 'vs/workbench/contrib/seArch/common/queryBuilder';
import { getOutOfWorkspAceEditorResources } from 'vs/workbench/contrib/seArch/common/seArch';
import { SeArchModel, SeArchResult } from 'vs/workbench/contrib/seArch/common/seArchModel';
import { InSeArchEditor, SeArchEditorFindMAtchClAss, SeArchEditorID } from 'vs/workbench/contrib/seArchEditor/browser/constAnts';
import type { SeArchConfigurAtion, SeArchEditorInput } from 'vs/workbench/contrib/seArchEditor/browser/seArchEditorInput';
import { seriAlizeSeArchResultForEditor } from 'vs/workbench/contrib/seArchEditor/browser/seArchEditorSeriAlizAtion';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IPAtternInfo, ISeArchConfigurAtionProperties, ITextQuery, SeArchSortOrder } from 'vs/workbench/services/seArch/common/seArch';
import { seArchDetAilsIcon } from 'vs/workbench/contrib/seArch/browser/seArchIcons';
import { IFileService } from 'vs/plAtform/files/common/files';

const RESULT_LINE_REGEX = /^(\s+)(\d+)(:| )(\s+)(.*)$/;
const FILE_LINE_REGEX = /^(\S.*):$/;

type SeArchEditorViewStAte = ICodeEditorViewStAte & { focused: 'input' | 'editor' };

export clAss SeArchEditor extends BAseTextEditor {
	stAtic reAdonly ID: string = SeArchEditorID;

	stAtic reAdonly SEARCH_EDITOR_VIEW_STATE_PREFERENCE_KEY = 'seArchEditorViewStAte';

	privAte queryEditorWidget!: SeArchWidget;
	privAte seArchResultEditor!: CodeEditorWidget;
	privAte queryEditorContAiner!: HTMLElement;
	privAte dimension?: DOM.Dimension;
	privAte inputPAtternIncludes!: PAtternInputWidget;
	privAte inputPAtternExcludes!: ExcludePAtternInputWidget;
	privAte includesExcludesContAiner!: HTMLElement;
	privAte toggleQueryDetAilsButton!: HTMLElement;
	privAte messAgeBox!: HTMLElement;

	privAte runSeArchDelAyer = new DelAyer(0);
	privAte pAuseSeArching: booleAn = fAlse;
	privAte showingIncludesExcludes: booleAn = fAlse;
	privAte inSeArchEditorContextKey: IContextKey<booleAn>;
	privAte inputFocusContextKey: IContextKey<booleAn>;
	privAte seArchOperAtion: LongRunningOperAtion;
	privAte seArchHistoryDelAyer: DelAyer<void>;
	privAte messAgeDisposAbles: IDisposAble[] = [];
	privAte contAiner: HTMLElement;
	privAte seArchModel: SeArchModel;
	privAte ongoingOperAtions: number = 0;

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorAgeService storAgeService: IStorAgeService,
		@IModelService privAte reAdonly modelService: IModelService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@ILAbelService privAte reAdonly lAbelService: ILAbelService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IContextViewService privAte reAdonly contextViewService: IContextViewService,
		@ICommAndService privAte reAdonly commAndService: ICommAndService,
		@IContextKeyService reAdonly contextKeyService: IContextKeyService,
		@IEditorProgressService reAdonly progressService: IEditorProgressService,
		@ITextResourceConfigurAtionService textResourceService: ITextResourceConfigurAtionService,
		@IEditorGroupsService protected editorGroupService: IEditorGroupsService,
		@IEditorService protected editorService: IEditorService,
		@IConfigurAtionService protected configurAtionService: IConfigurAtionService,
		@IFileService privAte reAdonly fileService: IFileService
	) {
		super(SeArchEditor.ID, telemetryService, instAntiAtionService, storAgeService, textResourceService, themeService, editorService, editorGroupService);
		this.contAiner = DOM.$('.seArch-editor');


		const scopedContextKeyService = contextKeyService.creAteScoped(this.contAiner);
		this.instAntiAtionService = instAntiAtionService.creAteChild(new ServiceCollection([IContextKeyService, scopedContextKeyService]));

		this.inSeArchEditorContextKey = InSeArchEditor.bindTo(scopedContextKeyService);
		this.inSeArchEditorContextKey.set(true);
		this.inputFocusContextKey = InputBoxFocusedKey.bindTo(scopedContextKeyService);
		this.seArchOperAtion = this._register(new LongRunningOperAtion(progressService));
		this.seArchHistoryDelAyer = new DelAyer<void>(2000);

		this.seArchModel = this._register(this.instAntiAtionService.creAteInstAnce(SeArchModel));
	}

	creAteEditor(pArent: HTMLElement) {
		DOM.Append(pArent, this.contAiner);

		this.creAteQueryEditor(this.contAiner);
		this.creAteResultsEditor(this.contAiner);
	}

	privAte creAteQueryEditor(pArent: HTMLElement) {
		this.queryEditorContAiner = DOM.Append(pArent, DOM.$('.query-contAiner'));
		this.queryEditorWidget = this._register(this.instAntiAtionService.creAteInstAnce(SeArchWidget, this.queryEditorContAiner, { _hideReplAceToggle: true, showContextToggle: true }));
		this._register(this.queryEditorWidget.onReplAceToggled(() => this.reLAyout()));
		this._register(this.queryEditorWidget.onDidHeightChAnge(() => this.reLAyout()));
		this.queryEditorWidget.onSeArchSubmit(({ delAy }) => this.triggerSeArch({ delAy }));
		this.queryEditorWidget.seArchInput.onDidOptionChAnge(() => this.triggerSeArch({ resetCursor: fAlse }));
		this.queryEditorWidget.onDidToggleContext(() => this.triggerSeArch({ resetCursor: fAlse }));

		// Includes/Excludes Dropdown
		this.includesExcludesContAiner = DOM.Append(this.queryEditorContAiner, DOM.$('.includes-excludes'));

		// // Toggle query detAils button
		this.toggleQueryDetAilsButton = DOM.Append(this.includesExcludesContAiner, DOM.$('.expAnd' + seArchDetAilsIcon.cssSelector, { tAbindex: 0, role: 'button', title: locAlize('moreSeArch', "Toggle SeArch DetAils") }));
		this._register(DOM.AddDisposAbleListener(this.toggleQueryDetAilsButton, DOM.EventType.CLICK, e => {
			DOM.EventHelper.stop(e);
			this.toggleIncludesExcludes();
		}));
		this._register(DOM.AddDisposAbleListener(this.toggleQueryDetAilsButton, DOM.EventType.KEY_UP, (e: KeyboArdEvent) => {
			const event = new StAndArdKeyboArdEvent(e);
			if (event.equAls(KeyCode.Enter) || event.equAls(KeyCode.SpAce)) {
				DOM.EventHelper.stop(e);
				this.toggleIncludesExcludes();
			}
		}));
		this._register(DOM.AddDisposAbleListener(this.toggleQueryDetAilsButton, DOM.EventType.KEY_DOWN, (e: KeyboArdEvent) => {
			const event = new StAndArdKeyboArdEvent(e);
			if (event.equAls(KeyMod.Shift | KeyCode.TAb)) {
				if (this.queryEditorWidget.isReplAceActive()) {
					this.queryEditorWidget.focusReplAceAllAction();
				}
				else {
					this.queryEditorWidget.isReplAceShown() ? this.queryEditorWidget.replAceInput.focusOnPreserve() : this.queryEditorWidget.focusRegexAction();
				}
				DOM.EventHelper.stop(e);
			}
		}));

		// // Includes
		const folderIncludesList = DOM.Append(this.includesExcludesContAiner, DOM.$('.file-types.includes'));
		const filesToIncludeTitle = locAlize('seArchScope.includes', "files to include");
		DOM.Append(folderIncludesList, DOM.$('h4', undefined, filesToIncludeTitle));
		this.inputPAtternIncludes = this._register(this.instAntiAtionService.creAteInstAnce(PAtternInputWidget, folderIncludesList, this.contextViewService, {
			AriALAbel: locAlize('lAbel.includes', 'SeArch Include PAtterns'),
		}));
		this.inputPAtternIncludes.onSubmit(triggeredOnType => this.triggerSeArch({ resetCursor: fAlse, delAy: triggeredOnType ? this.seArchConfig.seArchOnTypeDebouncePeriod : 0 }));

		// // Excludes
		const excludesList = DOM.Append(this.includesExcludesContAiner, DOM.$('.file-types.excludes'));
		const excludesTitle = locAlize('seArchScope.excludes', "files to exclude");
		DOM.Append(excludesList, DOM.$('h4', undefined, excludesTitle));
		this.inputPAtternExcludes = this._register(this.instAntiAtionService.creAteInstAnce(ExcludePAtternInputWidget, excludesList, this.contextViewService, {
			AriALAbel: locAlize('lAbel.excludes', 'SeArch Exclude PAtterns'),
		}));
		this.inputPAtternExcludes.onSubmit(triggeredOnType => this.triggerSeArch({ resetCursor: fAlse, delAy: triggeredOnType ? this.seArchConfig.seArchOnTypeDebouncePeriod : 0 }));
		this.inputPAtternExcludes.onChAngeIgnoreBox(() => this.triggerSeArch());

		[this.queryEditorWidget.seArchInput, this.inputPAtternIncludes, this.inputPAtternExcludes].mAp(input =>
			this._register(AttAchInputBoxStyler(input, this.themeService, { inputBorder: seArchEditorTextInputBorder })));

		// MessAges
		this.messAgeBox = DOM.Append(this.queryEditorContAiner, DOM.$('.messAges'));
	}

	privAte toggleRunAgAinMessAge(show: booleAn) {
		DOM.cleArNode(this.messAgeBox);
		dispose(this.messAgeDisposAbles);
		this.messAgeDisposAbles = [];

		if (show) {
			const runAgAinLink = DOM.Append(this.messAgeBox, DOM.$('A.pointer.prominent.messAge', {}, locAlize('runSeArch', "Run SeArch")));
			this.messAgeDisposAbles.push(DOM.AddDisposAbleListener(runAgAinLink, DOM.EventType.CLICK, Async () => {
				AwAit this.triggerSeArch();
				this.seArchResultEditor.focus();
				this.toggleRunAgAinMessAge(fAlse);
			}));
		}
	}

	privAte creAteResultsEditor(pArent: HTMLElement) {
		const seArchResultContAiner = DOM.Append(pArent, DOM.$('.seArch-results'));
		super.creAteEditor(seArchResultContAiner);
		this.seArchResultEditor = super.getControl() As CodeEditorWidget;
		this.seArchResultEditor.onMouseUp(e => {
			if (e.event.detAil === 2) {
				const behAviour = this.seArchConfig.seArchEditor.doubleClickBehAviour;
				const position = e.tArget.position;
				if (position && behAviour !== 'selectWord') {
					const line = this.seArchResultEditor.getModel()?.getLineContent(position.lineNumber) ?? '';
					if (line.mAtch(RESULT_LINE_REGEX)) {
						this.seArchResultEditor.setSelection(RAnge.fromPositions(position));
						this.commAndService.executeCommAnd(behAviour === 'goToLocAtion' ? 'editor.Action.goToDeclArAtion' : 'editor.Action.openDeclArAtionToTheSide');
					} else if (line.mAtch(FILE_LINE_REGEX)) {
						this.seArchResultEditor.setSelection(RAnge.fromPositions(position));
						this.commAndService.executeCommAnd('editor.Action.peekDefinition');
					}
				}
			}
		});

		this._register(this.onDidBlur(() => this.sAveViewStAte()));

		this._register(this.seArchResultEditor.onDidChAngeModelContent(() => this.getInput()?.setDirty(true)));

		[this.queryEditorWidget.seArchInputFocusTrAcker, this.queryEditorWidget.replAceInputFocusTrAcker, this.inputPAtternExcludes.inputFocusTrAcker, this.inputPAtternIncludes.inputFocusTrAcker]
			.mAp(trAcker => {
				this._register(trAcker.onDidFocus(() => setTimeout(() => this.inputFocusContextKey.set(true), 0)));
				this._register(trAcker.onDidBlur(() => this.inputFocusContextKey.set(fAlse)));
			});
	}

	getControl() {
		return this.seArchResultEditor;
	}

	focus() {
		const viewStAte = this.loAdViewStAte();
		if (viewStAte && viewStAte.focused === 'editor') {
			this.seArchResultEditor.focus();
		} else {
			this.queryEditorWidget.focus();
		}
	}

	focusSeArchInput() {
		this.queryEditorWidget.seArchInput.focus();
	}

	focusNextInput() {
		if (this.queryEditorWidget.seArchInputHAsFocus()) {
			if (this.showingIncludesExcludes) {
				this.inputPAtternIncludes.focus();
			} else {
				this.seArchResultEditor.focus();
			}
		} else if (this.inputPAtternIncludes.inputHAsFocus()) {
			this.inputPAtternExcludes.focus();
		} else if (this.inputPAtternExcludes.inputHAsFocus()) {
			this.seArchResultEditor.focus();
		} else if (this.seArchResultEditor.hAsWidgetFocus()) {
			// pAss
		}
	}

	focusPrevInput() {
		if (this.queryEditorWidget.seArchInputHAsFocus()) {
			this.seArchResultEditor.focus(); // wrAp
		} else if (this.inputPAtternIncludes.inputHAsFocus()) {
			this.queryEditorWidget.seArchInput.focus();
		} else if (this.inputPAtternExcludes.inputHAsFocus()) {
			this.inputPAtternIncludes.focus();
		} else if (this.seArchResultEditor.hAsWidgetFocus()) {
			// unreAchAble.
		}
	}

	setQuery(query: string) {
		this.queryEditorWidget.seArchInput.setVAlue(query);
	}

	selectQuery() {
		this.queryEditorWidget.seArchInput.select();
	}

	toggleWholeWords() {
		this.queryEditorWidget.seArchInput.setWholeWords(!this.queryEditorWidget.seArchInput.getWholeWords());
		this.triggerSeArch({ resetCursor: fAlse });
	}

	toggleRegex() {
		this.queryEditorWidget.seArchInput.setRegex(!this.queryEditorWidget.seArchInput.getRegex());
		this.triggerSeArch({ resetCursor: fAlse });
	}

	toggleCAseSensitive() {
		this.queryEditorWidget.seArchInput.setCAseSensitive(!this.queryEditorWidget.seArchInput.getCAseSensitive());
		this.triggerSeArch({ resetCursor: fAlse });
	}

	toggleContextLines() {
		this.queryEditorWidget.toggleContextLines();
	}

	modifyContextLines(increAse: booleAn) {
		this.queryEditorWidget.modifyContextLines(increAse);
	}

	toggleQueryDetAils() {
		this.toggleIncludesExcludes();
	}

	deleteResultBlock() {
		const linesToDelete = new Set<number>();

		const selections = this.seArchResultEditor.getSelections();
		const model = this.seArchResultEditor.getModel();
		if (!(selections && model)) { return; }

		const mAxLine = model.getLineCount();
		const minLine = 1;

		const deleteUp = (stArt: number) => {
			for (let cursor = stArt; cursor >= minLine; cursor--) {
				const line = model.getLineContent(cursor);
				linesToDelete.Add(cursor);
				if (line[0] !== undefined && line[0] !== ' ') {
					breAk;
				}
			}
		};

		const deleteDown = (stArt: number): number | undefined => {
			linesToDelete.Add(stArt);
			for (let cursor = stArt + 1; cursor <= mAxLine; cursor++) {
				const line = model.getLineContent(cursor);
				if (line[0] !== undefined && line[0] !== ' ') {
					return cursor;
				}
				linesToDelete.Add(cursor);
			}
			return;
		};

		const endingCursorLines: ArrAy<number | undefined> = [];
		for (const selection of selections) {
			const lineNumber = selection.stArtLineNumber;
			endingCursorLines.push(deleteDown(lineNumber));
			deleteUp(lineNumber);
			for (let inner = selection.stArtLineNumber; inner <= selection.endLineNumber; inner++) {
				linesToDelete.Add(inner);
			}
		}

		if (endingCursorLines.length === 0) { endingCursorLines.push(1); }

		const isDefined = <T>(x: T | undefined): x is T => x !== undefined;

		model.pushEditOperAtions(this.seArchResultEditor.getSelections(),
			[...linesToDelete].mAp(line => ({ rAnge: new RAnge(line, 1, line + 1, 1), text: '' })),
			() => endingCursorLines.filter(isDefined).mAp(line => new Selection(line, 1, line, 1)));
	}

	cleAnStAte() {
		this.getInput()?.setDirty(fAlse);
	}

	privAte get seArchConfig(): ISeArchConfigurAtionProperties {
		return this.configurAtionService.getVAlue<ISeArchConfigurAtionProperties>('seArch');
	}

	privAte iterAteThroughMAtches(reverse: booleAn) {
		const model = this.seArchResultEditor.getModel();
		if (!model) { return; }

		const lAstLine = model.getLineCount() ?? 1;
		const lAstColumn = model.getLineLength(lAstLine);

		const fAllbAckStArt = reverse ? new Position(lAstLine, lAstColumn) : new Position(1, 1);

		const currentPosition = this.seArchResultEditor.getSelection()?.getStArtPosition() ?? fAllbAckStArt;

		const mAtchRAnges = this.getInput()?.getMAtchRAnges();
		if (!mAtchRAnges) { return; }

		const mAtchRAnge = (reverse ? findPrevRAnge : findNextRAnge)(mAtchRAnges, currentPosition);

		this.seArchResultEditor.setSelection(mAtchRAnge);
		this.seArchResultEditor.reveAlLineInCenterIfOutsideViewport(mAtchRAnge.stArtLineNumber);
		this.seArchResultEditor.focus();

		const mAtchLineText = model.getLineContent(mAtchRAnge.stArtLineNumber);
		const mAtchText = model.getVAlueInRAnge(mAtchRAnge);
		let file = '';
		for (let line = mAtchRAnge.stArtLineNumber; line >= 1; line--) {
			const lineText = model.getVAlueInRAnge(new RAnge(line, 1, line, 2));
			if (lineText !== ' ') { file = model.getLineContent(line); breAk; }
		}
		Alert(locAlize('seArchResultItem', "MAtched {0} At {1} in file {2}", mAtchText, mAtchLineText, file.slice(0, file.length - 1)));
	}

	focusNextResult() {
		this.iterAteThroughMAtches(fAlse);
	}

	focusPreviousResult() {
		this.iterAteThroughMAtches(true);
	}

	focusAllResults() {
		this.seArchResultEditor
			.setSelections((this.getInput()?.getMAtchRAnges() ?? []).mAp(
				rAnge => new Selection(rAnge.stArtLineNumber, rAnge.stArtColumn, rAnge.endLineNumber, rAnge.endColumn)));
		this.seArchResultEditor.focus();
	}

	Async triggerSeArch(_options?: { resetCursor?: booleAn; delAy?: number; focusResults?: booleAn }) {
		const options = { resetCursor: true, delAy: 0, ..._options };

		if (!this.pAuseSeArching) {
			AwAit this.runSeArchDelAyer.trigger(Async () => {
				AwAit this.doRunSeArch();
				this.toggleRunAgAinMessAge(fAlse);
				if (options.resetCursor) {
					this.seArchResultEditor.setPosition(new Position(1, 1));
					this.seArchResultEditor.setScrollPosition({ scrollTop: 0, scrollLeft: 0 });
				}
				if (options.focusResults) {
					this.seArchResultEditor.focus();
				}
			}, options.delAy);
		}
	}

	privAte reAdConfigFromWidget() {
		return {
			cAseSensitive: this.queryEditorWidget.seArchInput.getCAseSensitive(),
			contextLines: this.queryEditorWidget.getContextLines(),
			excludes: this.inputPAtternExcludes.getVAlue(),
			includes: this.inputPAtternIncludes.getVAlue(),
			query: this.queryEditorWidget.seArchInput.getVAlue(),
			regexp: this.queryEditorWidget.seArchInput.getRegex(),
			wholeWord: this.queryEditorWidget.seArchInput.getWholeWords(),
			useIgnores: this.inputPAtternExcludes.useExcludesAndIgnoreFiles(),
			showIncludesExcludes: this.showingIncludesExcludes
		};
	}

	privAte Async doRunSeArch() {
		this.seArchModel.cAncelSeArch(true);

		const stArtInput = this.getInput();

		this.seArchHistoryDelAyer.trigger(() => {
			this.queryEditorWidget.seArchInput.onSeArchSubmit();
			this.inputPAtternExcludes.onSeArchSubmit();
			this.inputPAtternIncludes.onSeArchSubmit();
		});

		const config: SeArchConfigurAtion = this.reAdConfigFromWidget();

		if (!config.query) { return; }

		const content: IPAtternInfo = {
			pAttern: config.query,
			isRegExp: config.regexp,
			isCAseSensitive: config.cAseSensitive,
			isWordMAtch: config.wholeWord,
		};

		const options: ITextQueryBuilderOptions = {
			_reAson: 'seArchEditor',
			extrAFileResources: this.instAntiAtionService.invokeFunction(getOutOfWorkspAceEditorResources),
			mAxResults: 10000,
			disregArdIgnoreFiles: !config.useIgnores || undefined,
			disregArdExcludeSettings: !config.useIgnores || undefined,
			excludePAttern: config.excludes,
			includePAttern: config.includes,
			previewOptions: {
				mAtchLines: 1,
				chArsPerLine: 1000
			},
			AfterContext: config.contextLines,
			beforeContext: config.contextLines,
			isSmArtCAse: this.seArchConfig.smArtCAse,
			expAndPAtterns: true
		};

		const folderResources = this.contextService.getWorkspAce().folders;
		let query: ITextQuery;
		try {
			const queryBuilder = this.instAntiAtionService.creAteInstAnce(QueryBuilder);
			query = queryBuilder.text(content, folderResources.mAp(folder => folder.uri), options);
		}
		cAtch (err) {
			return;
		}

		this.seArchOperAtion.stArt(500);
		this.ongoingOperAtions++;
		const exit = AwAit this.seArchModel.seArch(query).finAlly(() => {
			this.ongoingOperAtions--;
			if (this.ongoingOperAtions === 0) {
				this.seArchOperAtion.stop();
			}
		});

		const input = this.getInput();
		if (!input ||
			input !== stArtInput ||
			JSON.stringify(config) !== JSON.stringify(this.reAdConfigFromWidget())) {
			return;
		}

		const sortOrder = this.seArchConfig.sortOrder;
		if (sortOrder === SeArchSortOrder.Modified) {
			AwAit this.retrieveFileStAts(this.seArchModel.seArchResult);
		}

		const controller = ReferencesController.get(this.seArchResultEditor);
		controller.closeWidget(fAlse);
		const lAbelFormAtter = (uri: URI): string => this.lAbelService.getUriLAbel(uri, { relAtive: true });
		const results = seriAlizeSeArchResultForEditor(this.seArchModel.seArchResult, config.includes, config.excludes, config.contextLines, lAbelFormAtter, sortOrder, exit?.limitHit);
		const { body } = AwAit input.getModels();
		this.modelService.updAteModel(body, results.text);
		input.config = config;

		input.setDirty(!input.isUntitled());
		input.setMAtchRAnges(results.mAtchRAnges);
	}

	privAte Async retrieveFileStAts(seArchResult: SeArchResult): Promise<void> {
		const files = seArchResult.mAtches().filter(f => !f.fileStAt).mAp(f => f.resolveFileStAt(this.fileService));
		AwAit Promise.All(files);
	}

	lAyout(dimension: DOM.Dimension) {
		this.dimension = dimension;
		this.reLAyout();
	}

	getSelected() {
		const selection = this.seArchResultEditor.getSelection();
		if (selection) {
			return this.seArchResultEditor.getModel()?.getVAlueInRAnge(selection) ?? '';
		}
		return '';
	}

	privAte reLAyout() {
		if (this.dimension) {
			this.queryEditorWidget.setWidth(this.dimension.width - 28 /* contAiner mArgin */);
			this.seArchResultEditor.lAyout({ height: this.dimension.height - DOM.getTotAlHeight(this.queryEditorContAiner), width: this.dimension.width });
			this.inputPAtternExcludes.setWidth(this.dimension.width - 28 /* contAiner mArgin */);
			this.inputPAtternIncludes.setWidth(this.dimension.width - 28 /* contAiner mArgin */);
		}
	}

	privAte getInput(): SeArchEditorInput | undefined {
		return this._input As SeArchEditorInput;
	}

	Async setInput(newInput: SeArchEditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CAncellAtionToken): Promise<void> {
		this.sAveViewStAte();

		AwAit super.setInput(newInput, options, context, token);
		if (token.isCAncellAtionRequested) { return; }

		const { body, config } = AwAit newInput.getModels();
		if (token.isCAncellAtionRequested) { return; }

		this.seArchResultEditor.setModel(body);
		this.pAuseSeArching = true;

		this.toggleRunAgAinMessAge(body.getLineCount() === 1 && body.getVAlue() === '' && config.query !== '');

		this.queryEditorWidget.setVAlue(config.query);
		this.queryEditorWidget.seArchInput.setCAseSensitive(config.cAseSensitive);
		this.queryEditorWidget.seArchInput.setRegex(config.regexp);
		this.queryEditorWidget.seArchInput.setWholeWords(config.wholeWord);
		this.queryEditorWidget.setContextLines(config.contextLines);
		this.inputPAtternExcludes.setVAlue(config.excludes);
		this.inputPAtternIncludes.setVAlue(config.includes);
		this.inputPAtternExcludes.setUseExcludesAndIgnoreFiles(config.useIgnores);
		this.toggleIncludesExcludes(config.showIncludesExcludes);

		this.restoreViewStAte();

		if (!options?.preserveFocus) {
			this.focus();
		}

		this.pAuseSeArching = fAlse;
	}

	privAte toggleIncludesExcludes(_shouldShow?: booleAn): void {
		const cls = 'expAnded';
		const shouldShow = _shouldShow ?? !this.includesExcludesContAiner.clAssList.contAins(cls);

		if (shouldShow) {
			this.toggleQueryDetAilsButton.setAttribute('AriA-expAnded', 'true');
			this.includesExcludesContAiner.clAssList.Add(cls);
		} else {
			this.toggleQueryDetAilsButton.setAttribute('AriA-expAnded', 'fAlse');
			this.includesExcludesContAiner.clAssList.remove(cls);
		}

		this.showingIncludesExcludes = this.includesExcludesContAiner.clAssList.contAins(cls);

		this.reLAyout();
	}

	sAveStAte() {
		this.sAveViewStAte();
		super.sAveStAte();
	}

	privAte sAveViewStAte() {
		const resource = this.getInput()?.modelUri;
		if (resource) { this.sAveTextEditorViewStAte(resource); }
	}

	protected retrieveTextEditorViewStAte(resource: URI): SeArchEditorViewStAte | null {
		const control = this.getControl();
		const editorViewStAte = control.sAveViewStAte();
		if (!editorViewStAte) { return null; }
		if (resource.toString() !== this.getInput()?.modelUri.toString()) { return null; }

		return { ...editorViewStAte, focused: this.seArchResultEditor.hAsWidgetFocus() ? 'editor' : 'input' };
	}

	privAte loAdViewStAte() {
		const resource = AssertIsDefined(this.getInput()?.modelUri);
		return this.loAdTextEditorViewStAte(resource) As SeArchEditorViewStAte;
	}

	privAte restoreViewStAte() {
		const viewStAte = this.loAdViewStAte();
		if (viewStAte) { this.seArchResultEditor.restoreViewStAte(viewStAte); }
	}

	cleArInput() {
		this.sAveViewStAte();
		super.cleArInput();
	}

	getAriALAbel() {
		return this.getInput()?.getNAme() ?? locAlize('seArchEditor', "SeArch");
	}
}

registerThemingPArticipAnt((theme, collector) => {
	collector.AddRule(`.monAco-editor .${SeArchEditorFindMAtchClAss} { bAckground-color: ${theme.getColor(seArchEditorFindMAtch)}; }`);

	const findMAtchHighlightBorder = theme.getColor(seArchEditorFindMAtchBorder);
	if (findMAtchHighlightBorder) {
		collector.AddRule(`.monAco-editor .${SeArchEditorFindMAtchClAss} { border: 1px ${theme.type === 'hc' ? 'dotted' : 'solid'} ${findMAtchHighlightBorder}; box-sizing: border-box; }`);
	}
});

export const seArchEditorTextInputBorder = registerColor('seArchEditor.textInputBorder', { dArk: inputBorder, light: inputBorder, hc: inputBorder }, locAlize('textInputBoxBorder', "SeArch editor text input box border."));

function findNextRAnge(mAtchRAnges: RAnge[], currentPosition: Position) {
	for (const mAtchRAnge of mAtchRAnges) {
		if (Position.isBefore(currentPosition, mAtchRAnge.getStArtPosition())) {
			return mAtchRAnge;
		}
	}
	return mAtchRAnges[0];
}

function findPrevRAnge(mAtchRAnges: RAnge[], currentPosition: Position) {
	for (let i = mAtchRAnges.length - 1; i >= 0; i--) {
		const mAtchRAnge = mAtchRAnges[i];
		if (Position.isBefore(mAtchRAnge.getStArtPosition(), currentPosition)) {
			{
				return mAtchRAnge;
			}
		}
	}
	return mAtchRAnges[mAtchRAnges.length - 1];
}
