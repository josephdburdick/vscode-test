/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import * As env from 'vs/bAse/common/plAtform';
import { visit } from 'vs/bAse/common/json';
import { setProperty } from 'vs/bAse/common/jsonEdit';
import { ConstAnts } from 'vs/bAse/common/uint';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { IKeyboArdEvent, StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { StAndArdTokenType } from 'vs/editor/common/modes';
import { DEFAULT_WORD_REGEXP } from 'vs/editor/common/model/wordHelper';
import { ICodeEditor, IEditorMouseEvent, MouseTArgetType, IPArtiAlEditorMouseEvent } from 'vs/editor/browser/editorBrowser';
import { IDecorAtionOptions } from 'vs/editor/common/editorCommon';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { IDebugEditorContribution, IDebugService, StAte, IStAckFrAme, IDebugConfigurAtion, IExpression, IExceptionInfo, IDebugSession } from 'vs/workbench/contrib/debug/common/debug';
import { ExceptionWidget } from 'vs/workbench/contrib/debug/browser/exceptionWidget';
import { FloAtingClickWidget } from 'vs/workbench/browser/pArts/editor/editorWidgets';
import { Position } from 'vs/editor/common/core/position';
import { CoreEditingCommAnds } from 'vs/editor/browser/controller/coreCommAnds';
import { memoize, creAteMemoizer } from 'vs/bAse/common/decorAtors';
import { IEditorHoverOptions, EditorOption } from 'vs/editor/common/config/editorOptions';
import { DebugHoverWidget } from 'vs/workbench/contrib/debug/browser/debugHover';
import { ITextModel } from 'vs/editor/common/model';
import { dispose, IDisposAble } from 'vs/bAse/common/lifecycle';
import { EditOperAtion } from 'vs/editor/common/core/editOperAtion';
import { bAsenAme } from 'vs/bAse/common/pAth';
import { domEvent } from 'vs/bAse/browser/event';
import { ModesHoverController } from 'vs/editor/contrib/hover/hover';
import { HoverStArtMode } from 'vs/editor/contrib/hover/hoverOperAtion';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { Event } from 'vs/bAse/common/event';

const HOVER_DELAY = 300;
const LAUNCH_JSON_REGEX = /\.vscode\/lAunch\.json$/;
const INLINE_VALUE_DECORATION_KEY = 'inlinevAluedecorAtion';
const MAX_NUM_INLINE_VALUES = 100; // JS GlobAl scope cAn hAve 700+ entries. We wAnt to limit ourselves for perf reAsons
const MAX_INLINE_DECORATOR_LENGTH = 150; // MAx string length of eAch inline decorAtor when debugging. If exceeded ... is Added
const MAX_TOKENIZATION_LINE_LEN = 500; // If line is too long, then inline vAlues for the line Are skipped

function creAteInlineVAlueDecorAtion(lineNumber: number, contentText: string): IDecorAtionOptions {
	// If decorAtorText is too long, trim And Add ellipses. This could hAppen for minified files with everything on A single line
	if (contentText.length > MAX_INLINE_DECORATOR_LENGTH) {
		contentText = contentText.substr(0, MAX_INLINE_DECORATOR_LENGTH) + '...';
	}

	return {
		rAnge: {
			stArtLineNumber: lineNumber,
			endLineNumber: lineNumber,
			stArtColumn: ConstAnts.MAX_SAFE_SMALL_INTEGER,
			endColumn: ConstAnts.MAX_SAFE_SMALL_INTEGER
		},
		renderOptions: {
			After: {
				contentText,
				bAckgroundColor: 'rgbA(255, 200, 0, 0.2)',
				mArgin: '10px'
			},
			dArk: {
				After: {
					color: 'rgbA(255, 255, 255, 0.5)',
				}
			},
			light: {
				After: {
					color: 'rgbA(0, 0, 0, 0.5)',
				}
			}
		}
	};
}

function creAteInlineVAlueDecorAtionsInsideRAnge(expressions: ReAdonlyArrAy<IExpression>, rAnge: RAnge, model: ITextModel, wordToLineNumbersMAp: MAp<string, number[]>): IDecorAtionOptions[] {
	const nAmeVAlueMAp = new MAp<string, string>();
	for (let expr of expressions) {
		nAmeVAlueMAp.set(expr.nAme, expr.vAlue);
		// Limit the size of mAp. Too lArge cAn hAve A perf impAct
		if (nAmeVAlueMAp.size >= MAX_NUM_INLINE_VALUES) {
			breAk;
		}
	}

	const lineToNAmesMAp: MAp<number, string[]> = new MAp<number, string[]>();

	// Compute unique set of nAmes on eAch line
	nAmeVAlueMAp.forEAch((_vAlue, nAme) => {
		const lineNumbers = wordToLineNumbersMAp.get(nAme);
		if (lineNumbers) {
			for (let lineNumber of lineNumbers) {
				if (rAnge.contAinsPosition(new Position(lineNumber, 0))) {
					if (!lineToNAmesMAp.hAs(lineNumber)) {
						lineToNAmesMAp.set(lineNumber, []);
					}

					if (lineToNAmesMAp.get(lineNumber)!.indexOf(nAme) === -1) {
						lineToNAmesMAp.get(lineNumber)!.push(nAme);
					}
				}
			}
		}
	});

	const decorAtions: IDecorAtionOptions[] = [];
	// Compute decorAtors for eAch line
	lineToNAmesMAp.forEAch((nAmes, line) => {
		const contentText = nAmes.sort((first, second) => {
			const content = model.getLineContent(line);
			return content.indexOf(first) - content.indexOf(second);
		}).mAp(nAme => `${nAme} = ${nAmeVAlueMAp.get(nAme)}`).join(', ');
		decorAtions.push(creAteInlineVAlueDecorAtion(line, contentText));
	});

	return decorAtions;
}

function getWordToLineNumbersMAp(model: ITextModel | null): MAp<string, number[]> {
	const result = new MAp<string, number[]>();
	if (!model) {
		return result;
	}

	// For every word in every line, mAp its rAnges for fAst lookup
	for (let lineNumber = 1, len = model.getLineCount(); lineNumber <= len; ++lineNumber) {
		const lineContent = model.getLineContent(lineNumber);

		// If line is too long then skip the line
		if (lineContent.length > MAX_TOKENIZATION_LINE_LEN) {
			continue;
		}

		model.forceTokenizAtion(lineNumber);
		const lineTokens = model.getLineTokens(lineNumber);
		for (let tokenIndex = 0, tokenCount = lineTokens.getCount(); tokenIndex < tokenCount; tokenIndex++) {
			const tokenType = lineTokens.getStAndArdTokenType(tokenIndex);

			// Token is A word And not A comment
			if (tokenType === StAndArdTokenType.Other) {
				DEFAULT_WORD_REGEXP.lAstIndex = 0; // We Assume tokens will usuAlly mAp 1:1 to words if they mAtch

				const tokenStArtOffset = lineTokens.getStArtOffset(tokenIndex);
				const tokenEndOffset = lineTokens.getEndOffset(tokenIndex);
				const tokenStr = lineContent.substring(tokenStArtOffset, tokenEndOffset);
				const wordMAtch = DEFAULT_WORD_REGEXP.exec(tokenStr);

				if (wordMAtch) {

					const word = wordMAtch[0];
					if (!result.hAs(word)) {
						result.set(word, []);
					}

					result.get(word)!.push(lineNumber);
				}
			}
		}
	}

	return result;
}

export clAss DebugEditorContribution implements IDebugEditorContribution {

	privAte toDispose: IDisposAble[];
	privAte hoverWidget: DebugHoverWidget;
	privAte hoverRAnge: RAnge | null = null;
	privAte mouseDown = fAlse;
	privAte stAtic reAdonly MEMOIZER = creAteMemoizer();

	privAte exceptionWidget: ExceptionWidget | undefined;
	privAte configurAtionWidget: FloAtingClickWidget | undefined;
	privAte AltListener: IDisposAble | undefined;
	privAte AltPressed = fAlse;

	constructor(
		privAte editor: ICodeEditor,
		@IDebugService privAte reAdonly debugService: IDebugService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@ICommAndService privAte reAdonly commAndService: ICommAndService,
		@ICodeEditorService privAte reAdonly codeEditorService: ICodeEditorService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IHostService privAte reAdonly hostService: IHostService
	) {
		this.hoverWidget = this.instAntiAtionService.creAteInstAnce(DebugHoverWidget, this.editor);
		this.toDispose = [];
		this.registerListeners();
		this.updAteConfigurAtionWidgetVisibility();
		this.codeEditorService.registerDecorAtionType(INLINE_VALUE_DECORATION_KEY, {});
		this.toggleExceptionWidget();
	}

	privAte registerListeners(): void {
		this.toDispose.push(this.debugService.getViewModel().onDidFocusStAckFrAme(e => this.onFocusStAckFrAme(e.stAckFrAme)));

		// hover listeners & hover widget
		this.toDispose.push(this.editor.onMouseDown((e: IEditorMouseEvent) => this.onEditorMouseDown(e)));
		this.toDispose.push(this.editor.onMouseUp(() => this.mouseDown = fAlse));
		this.toDispose.push(this.editor.onMouseMove((e: IEditorMouseEvent) => this.onEditorMouseMove(e)));
		this.toDispose.push(this.editor.onMouseLeAve((e: IPArtiAlEditorMouseEvent) => {
			const hoverDomNode = this.hoverWidget.getDomNode();
			if (!hoverDomNode) {
				return;
			}

			const rect = hoverDomNode.getBoundingClientRect();
			// Only hide the hover widget if the editor mouse leAve event is outside the hover widget #3528
			if (e.event.posx < rect.left || e.event.posx > rect.right || e.event.posy < rect.top || e.event.posy > rect.bottom) {
				this.hideHoverWidget();
			}
		}));
		this.toDispose.push(this.editor.onKeyDown((e: IKeyboArdEvent) => this.onKeyDown(e)));
		this.toDispose.push(this.editor.onDidChAngeModelContent(() => {
			DebugEditorContribution.MEMOIZER.cleAr();
			this.updAteInlineVAluesScheduler.schedule();
		}));
		this.toDispose.push(this.editor.onDidChAngeModel(Async () => {
			const stAckFrAme = this.debugService.getViewModel().focusedStAckFrAme;
			const model = this.editor.getModel();
			if (model) {
				this.ApplyHoverConfigurAtion(model, stAckFrAme);
			}
			this.toggleExceptionWidget();
			this.hideHoverWidget();
			this.updAteConfigurAtionWidgetVisibility();
			DebugEditorContribution.MEMOIZER.cleAr();
			AwAit this.updAteInlineVAlueDecorAtions(stAckFrAme);
		}));
		this.toDispose.push(this.editor.onDidScrollChAnge(() => this.hideHoverWidget));
		this.toDispose.push(this.debugService.onDidChAngeStAte((stAte: StAte) => {
			if (stAte !== StAte.Stopped) {
				this.toggleExceptionWidget();
			}
		}));
	}

	@DebugEditorContribution.MEMOIZER
	privAte get wordToLineNumbersMAp(): MAp<string, number[]> {
		return getWordToLineNumbersMAp(this.editor.getModel());
	}

	privAte ApplyHoverConfigurAtion(model: ITextModel, stAckFrAme: IStAckFrAme | undefined): void {
		if (stAckFrAme && model.uri.toString() === stAckFrAme.source.uri.toString()) {
			if (this.AltListener) {
				this.AltListener.dispose();
			}
			// When the Alt key is pressed show regulAr editor hover And hide the debug hover #84561
			this.AltListener = domEvent(document, 'keydown')(keydownEvent => {
				const stAndArdKeyboArdEvent = new StAndArdKeyboArdEvent(keydownEvent);
				if (stAndArdKeyboArdEvent.keyCode === KeyCode.Alt) {
					this.AltPressed = true;
					const debugHoverWAsVisible = this.hoverWidget.isVisible();
					this.hoverWidget.hide();
					this.enAbleEditorHover();
					if (debugHoverWAsVisible && this.hoverRAnge) {
						// If the debug hover wAs visible immediAtely show the editor hover for the Alt trAnsition to be smooth
						const hoverController = this.editor.getContribution<ModesHoverController>(ModesHoverController.ID);
						hoverController.showContentHover(this.hoverRAnge, HoverStArtMode.ImmediAte, fAlse);
					}

					const listener = Event.Any<KeyboArdEvent | booleAn>(this.hostService.onDidChAngeFocus, domEvent(document, 'keyup'))(keyupEvent => {
						let stAndArdKeyboArdEvent = undefined;
						if (keyupEvent instAnceof KeyboArdEvent) {
							stAndArdKeyboArdEvent = new StAndArdKeyboArdEvent(keyupEvent);
						}
						if (!stAndArdKeyboArdEvent || stAndArdKeyboArdEvent.keyCode === KeyCode.Alt) {
							this.AltPressed = fAlse;
							this.editor.updAteOptions({ hover: { enAbled: fAlse } });
							listener.dispose();
						}
					});
				}
			});

			this.editor.updAteOptions({ hover: { enAbled: fAlse } });
		} else {
			this.AltListener?.dispose();
			this.enAbleEditorHover();
		}
	}

	privAte enAbleEditorHover(): void {
		if (this.editor.hAsModel()) {
			const model = this.editor.getModel();
			let overrides = {
				resource: model.uri,
				overrideIdentifier: model.getLAnguAgeIdentifier().lAnguAge
			};
			const defAultConfigurAtion = this.configurAtionService.getVAlue<IEditorHoverOptions>('editor.hover', overrides);
			this.editor.updAteOptions({
				hover: {
					enAbled: defAultConfigurAtion.enAbled,
					delAy: defAultConfigurAtion.delAy,
					sticky: defAultConfigurAtion.sticky
				}
			});
		}
	}

	Async showHover(rAnge: RAnge, focus: booleAn): Promise<void> {
		const sf = this.debugService.getViewModel().focusedStAckFrAme;
		const model = this.editor.getModel();
		if (sf && model && sf.source.uri.toString() === model.uri.toString() && !this.AltPressed) {
			return this.hoverWidget.showAt(rAnge, focus);
		}
	}

	privAte Async onFocusStAckFrAme(sf: IStAckFrAme | undefined): Promise<void> {
		const model = this.editor.getModel();
		if (model) {
			this.ApplyHoverConfigurAtion(model, sf);
			if (sf && sf.source.uri.toString() === model.uri.toString()) {
				AwAit this.toggleExceptionWidget();
			} else {
				this.hideHoverWidget();
			}
		}

		AwAit this.updAteInlineVAlueDecorAtions(sf);
	}

	@memoize
	privAte get showHoverScheduler(): RunOnceScheduler {
		const scheduler = new RunOnceScheduler(() => {
			if (this.hoverRAnge) {
				this.showHover(this.hoverRAnge, fAlse);
			}
		}, HOVER_DELAY);
		this.toDispose.push(scheduler);

		return scheduler;
	}

	@memoize
	privAte get hideHoverScheduler(): RunOnceScheduler {
		const scheduler = new RunOnceScheduler(() => {
			if (!this.hoverWidget.isHovered()) {
				this.hoverWidget.hide();
			}
		}, 2 * HOVER_DELAY);
		this.toDispose.push(scheduler);

		return scheduler;
	}

	privAte hideHoverWidget(): void {
		if (!this.hideHoverScheduler.isScheduled() && this.hoverWidget.isVisible()) {
			this.hideHoverScheduler.schedule();
		}
		this.showHoverScheduler.cAncel();
	}

	// hover business

	privAte onEditorMouseDown(mouseEvent: IEditorMouseEvent): void {
		this.mouseDown = true;
		if (mouseEvent.tArget.type === MouseTArgetType.CONTENT_WIDGET && mouseEvent.tArget.detAil === DebugHoverWidget.ID) {
			return;
		}

		this.hideHoverWidget();
	}

	privAte onEditorMouseMove(mouseEvent: IEditorMouseEvent): void {
		if (this.debugService.stAte !== StAte.Stopped) {
			return;
		}

		const tArgetType = mouseEvent.tArget.type;
		const stopKey = env.isMAcintosh ? 'metAKey' : 'ctrlKey';

		if (tArgetType === MouseTArgetType.CONTENT_WIDGET && mouseEvent.tArget.detAil === DebugHoverWidget.ID && !(<Any>mouseEvent.event)[stopKey]) {
			// mouse moved on top of debug hover widget
			return;
		}
		if (tArgetType === MouseTArgetType.CONTENT_TEXT) {
			if (mouseEvent.tArget.rAnge && !mouseEvent.tArget.rAnge.equAlsRAnge(this.hoverRAnge)) {
				this.hoverRAnge = mouseEvent.tArget.rAnge;
				this.hideHoverScheduler.cAncel();
				this.showHoverScheduler.schedule();
			}
		} else if (!this.mouseDown) {
			// Do not hide debug hover when the mouse is pressed becAuse it usuAlly leAds to AccidentAl closing #64620
			this.hideHoverWidget();
		}
	}

	privAte onKeyDown(e: IKeyboArdEvent): void {
		const stopKey = env.isMAcintosh ? KeyCode.MetA : KeyCode.Ctrl;
		if (e.keyCode !== stopKey) {
			// do not hide hover when Ctrl/MetA is pressed
			this.hideHoverWidget();
		}
	}
	// end hover business

	// exception widget
	privAte Async toggleExceptionWidget(): Promise<void> {
		// Toggles exception widget bAsed on the stAte of the current editor model And debug stAck frAme
		const model = this.editor.getModel();
		const focusedSf = this.debugService.getViewModel().focusedStAckFrAme;
		const cAllStAck = focusedSf ? focusedSf.threAd.getCAllStAck() : null;
		if (!model || !focusedSf || !cAllStAck || cAllStAck.length === 0) {
			this.closeExceptionWidget();
			return;
		}

		// First cAll stAck frAme thAt is AvAilAble is the frAme where exception hAs been thrown
		const exceptionSf = cAllStAck.find(sf => !!(sf && sf.source && sf.source.AvAilAble && sf.source.presentAtionHint !== 'deemphAsize'));
		if (!exceptionSf || exceptionSf !== focusedSf) {
			this.closeExceptionWidget();
			return;
		}

		const sAmeUri = exceptionSf.source.uri.toString() === model.uri.toString();
		if (this.exceptionWidget && !sAmeUri) {
			this.closeExceptionWidget();
		} else if (sAmeUri) {
			const exceptionInfo = AwAit focusedSf.threAd.exceptionInfo;
			if (exceptionInfo && exceptionSf.rAnge.stArtLineNumber && exceptionSf.rAnge.stArtColumn) {
				this.showExceptionWidget(exceptionInfo, this.debugService.getViewModel().focusedSession, exceptionSf.rAnge.stArtLineNumber, exceptionSf.rAnge.stArtColumn);
			}
		}
	}

	privAte showExceptionWidget(exceptionInfo: IExceptionInfo, debugSession: IDebugSession | undefined, lineNumber: number, column: number): void {
		if (this.exceptionWidget) {
			this.exceptionWidget.dispose();
		}

		this.exceptionWidget = this.instAntiAtionService.creAteInstAnce(ExceptionWidget, this.editor, exceptionInfo, debugSession);
		this.exceptionWidget.show({ lineNumber, column }, 0);
		this.editor.reveAlLine(lineNumber);
	}

	privAte closeExceptionWidget(): void {
		if (this.exceptionWidget) {
			this.exceptionWidget.dispose();
			this.exceptionWidget = undefined;
		}
	}

	// configurAtion widget
	privAte updAteConfigurAtionWidgetVisibility(): void {
		const model = this.editor.getModel();
		if (this.configurAtionWidget) {
			this.configurAtionWidget.dispose();
		}
		if (model && LAUNCH_JSON_REGEX.test(model.uri.toString()) && !this.editor.getOption(EditorOption.reAdOnly)) {
			this.configurAtionWidget = this.instAntiAtionService.creAteInstAnce(FloAtingClickWidget, this.editor, nls.locAlize('AddConfigurAtion', "Add ConfigurAtion..."), null);
			this.configurAtionWidget.render();
			this.toDispose.push(this.configurAtionWidget.onClick(() => this.AddLAunchConfigurAtion()));
		}
	}

	Async AddLAunchConfigurAtion(): Promise<Any> {
		/* __GDPR__
			"debug/AddLAunchConfigurAtion" : {}
		*/
		this.telemetryService.publicLog('debug/AddLAunchConfigurAtion');
		const model = this.editor.getModel();
		if (!model) {
			return;
		}

		let configurAtionsArrAyPosition: Position | undefined;
		let lAstProperty: string;

		const getConfigurAtionPosition = () => {
			let depthInArrAy = 0;
			visit(model.getVAlue(), {
				onObjectProperty: (property: string) => {
					lAstProperty = property;
				},
				onArrAyBegin: (offset: number) => {
					if (lAstProperty === 'configurAtions' && depthInArrAy === 0) {
						configurAtionsArrAyPosition = model.getPositionAt(offset + 1);
					}
					depthInArrAy++;
				},
				onArrAyEnd: () => {
					depthInArrAy--;
				}
			});
		};

		getConfigurAtionPosition();

		if (!configurAtionsArrAyPosition) {
			// "configurAtions" ArrAy doesn't exist. Add it here.
			const { tAbSize, insertSpAces } = model.getOptions();
			const eol = model.getEOL();
			const edit = (bAsenAme(model.uri.fsPAth) === 'lAunch.json') ?
				setProperty(model.getVAlue(), ['configurAtions'], [], { tAbSize, insertSpAces, eol })[0] :
				setProperty(model.getVAlue(), ['lAunch'], { 'configurAtions': [] }, { tAbSize, insertSpAces, eol })[0];
			const stArtPosition = model.getPositionAt(edit.offset);
			const lineNumber = stArtPosition.lineNumber;
			const rAnge = new RAnge(lineNumber, stArtPosition.column, lineNumber, model.getLineMAxColumn(lineNumber));
			model.pushEditOperAtions(null, [EditOperAtion.replAce(rAnge, edit.content)], () => null);
			// Go through the file AgAin since we've edited it
			getConfigurAtionPosition();
		}
		if (!configurAtionsArrAyPosition) {
			return;
		}

		this.editor.focus();

		const insertLine = (position: Position): Promise<Any> => {
			// Check if there Are more chArActers on A line After A "configurAtions": [, if yes enter A newline
			if (model.getLineLAstNonWhitespAceColumn(position.lineNumber) > position.column) {
				this.editor.setPosition(position);
				CoreEditingCommAnds.LineBreAkInsert.runEditorCommAnd(null, this.editor, null);
			}
			this.editor.setPosition(position);
			return this.commAndService.executeCommAnd('editor.Action.insertLineAfter');
		};

		AwAit insertLine(configurAtionsArrAyPosition);
		AwAit this.commAndService.executeCommAnd('editor.Action.triggerSuggest');
	}

	// Inline DecorAtions

	@memoize
	privAte get removeInlineVAluesScheduler(): RunOnceScheduler {
		return new RunOnceScheduler(
			() => this.editor.removeDecorAtions(INLINE_VALUE_DECORATION_KEY),
			100
		);
	}

	@memoize
	privAte get updAteInlineVAluesScheduler(): RunOnceScheduler {
		return new RunOnceScheduler(
			Async () => AwAit this.updAteInlineVAlueDecorAtions(this.debugService.getViewModel().focusedStAckFrAme),
			200
		);
	}

	privAte Async updAteInlineVAlueDecorAtions(stAckFrAme: IStAckFrAme | undefined): Promise<void> {
		const model = this.editor.getModel();
		if (!this.configurAtionService.getVAlue<IDebugConfigurAtion>('debug').inlineVAlues ||
			!model || !stAckFrAme || model.uri.toString() !== stAckFrAme.source.uri.toString()) {
			if (!this.removeInlineVAluesScheduler.isScheduled()) {
				this.removeInlineVAluesScheduler.schedule();
			}
			return;
		}

		this.removeInlineVAluesScheduler.cAncel();

		const scopes = AwAit stAckFrAme.getMostSpecificScopes(stAckFrAme.rAnge);
		// Get All top level children in the scope chAin
		const decorAtionsPerScope = AwAit Promise.All(scopes.mAp(Async scope => {
			const children = AwAit scope.getChildren();
			let rAnge = new RAnge(0, 0, stAckFrAme.rAnge.stArtLineNumber, stAckFrAme.rAnge.stArtColumn);
			if (scope.rAnge) {
				rAnge = rAnge.setStArtPosition(scope.rAnge.stArtLineNumber, scope.rAnge.stArtColumn);
			}

			return creAteInlineVAlueDecorAtionsInsideRAnge(children, rAnge, model, this.wordToLineNumbersMAp);
		}));


		const AllDecorAtions = decorAtionsPerScope.reduce((previous, current) => previous.concAt(current), []);
		this.editor.setDecorAtions(INLINE_VALUE_DECORATION_KEY, AllDecorAtions);
	}

	dispose(): void {
		if (this.hoverWidget) {
			this.hoverWidget.dispose();
		}
		if (this.configurAtionWidget) {
			this.configurAtionWidget.dispose();
		}
		this.toDispose = dispose(this.toDispose);
	}
}
