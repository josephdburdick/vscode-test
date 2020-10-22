/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { RunOnceScheduler } from 'vs/Base/common/async';
import * as env from 'vs/Base/common/platform';
import { visit } from 'vs/Base/common/json';
import { setProperty } from 'vs/Base/common/jsonEdit';
import { Constants } from 'vs/Base/common/uint';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { IKeyBoardEvent, StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { StandardTokenType } from 'vs/editor/common/modes';
import { DEFAULT_WORD_REGEXP } from 'vs/editor/common/model/wordHelper';
import { ICodeEditor, IEditorMouseEvent, MouseTargetType, IPartialEditorMouseEvent } from 'vs/editor/Browser/editorBrowser';
import { IDecorationOptions } from 'vs/editor/common/editorCommon';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { Range } from 'vs/editor/common/core/range';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IDeBugEditorContriBution, IDeBugService, State, IStackFrame, IDeBugConfiguration, IExpression, IExceptionInfo, IDeBugSession } from 'vs/workBench/contriB/deBug/common/deBug';
import { ExceptionWidget } from 'vs/workBench/contriB/deBug/Browser/exceptionWidget';
import { FloatingClickWidget } from 'vs/workBench/Browser/parts/editor/editorWidgets';
import { Position } from 'vs/editor/common/core/position';
import { CoreEditingCommands } from 'vs/editor/Browser/controller/coreCommands';
import { memoize, createMemoizer } from 'vs/Base/common/decorators';
import { IEditorHoverOptions, EditorOption } from 'vs/editor/common/config/editorOptions';
import { DeBugHoverWidget } from 'vs/workBench/contriB/deBug/Browser/deBugHover';
import { ITextModel } from 'vs/editor/common/model';
import { dispose, IDisposaBle } from 'vs/Base/common/lifecycle';
import { EditOperation } from 'vs/editor/common/core/editOperation';
import { Basename } from 'vs/Base/common/path';
import { domEvent } from 'vs/Base/Browser/event';
import { ModesHoverController } from 'vs/editor/contriB/hover/hover';
import { HoverStartMode } from 'vs/editor/contriB/hover/hoverOperation';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { Event } from 'vs/Base/common/event';

const HOVER_DELAY = 300;
const LAUNCH_JSON_REGEX = /\.vscode\/launch\.json$/;
const INLINE_VALUE_DECORATION_KEY = 'inlinevaluedecoration';
const MAX_NUM_INLINE_VALUES = 100; // JS GloBal scope can have 700+ entries. We want to limit ourselves for perf reasons
const MAX_INLINE_DECORATOR_LENGTH = 150; // Max string length of each inline decorator when deBugging. If exceeded ... is added
const MAX_TOKENIZATION_LINE_LEN = 500; // If line is too long, then inline values for the line are skipped

function createInlineValueDecoration(lineNumBer: numBer, contentText: string): IDecorationOptions {
	// If decoratorText is too long, trim and add ellipses. This could happen for minified files with everything on a single line
	if (contentText.length > MAX_INLINE_DECORATOR_LENGTH) {
		contentText = contentText.suBstr(0, MAX_INLINE_DECORATOR_LENGTH) + '...';
	}

	return {
		range: {
			startLineNumBer: lineNumBer,
			endLineNumBer: lineNumBer,
			startColumn: Constants.MAX_SAFE_SMALL_INTEGER,
			endColumn: Constants.MAX_SAFE_SMALL_INTEGER
		},
		renderOptions: {
			after: {
				contentText,
				BackgroundColor: 'rgBa(255, 200, 0, 0.2)',
				margin: '10px'
			},
			dark: {
				after: {
					color: 'rgBa(255, 255, 255, 0.5)',
				}
			},
			light: {
				after: {
					color: 'rgBa(0, 0, 0, 0.5)',
				}
			}
		}
	};
}

function createInlineValueDecorationsInsideRange(expressions: ReadonlyArray<IExpression>, range: Range, model: ITextModel, wordToLineNumBersMap: Map<string, numBer[]>): IDecorationOptions[] {
	const nameValueMap = new Map<string, string>();
	for (let expr of expressions) {
		nameValueMap.set(expr.name, expr.value);
		// Limit the size of map. Too large can have a perf impact
		if (nameValueMap.size >= MAX_NUM_INLINE_VALUES) {
			Break;
		}
	}

	const lineToNamesMap: Map<numBer, string[]> = new Map<numBer, string[]>();

	// Compute unique set of names on each line
	nameValueMap.forEach((_value, name) => {
		const lineNumBers = wordToLineNumBersMap.get(name);
		if (lineNumBers) {
			for (let lineNumBer of lineNumBers) {
				if (range.containsPosition(new Position(lineNumBer, 0))) {
					if (!lineToNamesMap.has(lineNumBer)) {
						lineToNamesMap.set(lineNumBer, []);
					}

					if (lineToNamesMap.get(lineNumBer)!.indexOf(name) === -1) {
						lineToNamesMap.get(lineNumBer)!.push(name);
					}
				}
			}
		}
	});

	const decorations: IDecorationOptions[] = [];
	// Compute decorators for each line
	lineToNamesMap.forEach((names, line) => {
		const contentText = names.sort((first, second) => {
			const content = model.getLineContent(line);
			return content.indexOf(first) - content.indexOf(second);
		}).map(name => `${name} = ${nameValueMap.get(name)}`).join(', ');
		decorations.push(createInlineValueDecoration(line, contentText));
	});

	return decorations;
}

function getWordToLineNumBersMap(model: ITextModel | null): Map<string, numBer[]> {
	const result = new Map<string, numBer[]>();
	if (!model) {
		return result;
	}

	// For every word in every line, map its ranges for fast lookup
	for (let lineNumBer = 1, len = model.getLineCount(); lineNumBer <= len; ++lineNumBer) {
		const lineContent = model.getLineContent(lineNumBer);

		// If line is too long then skip the line
		if (lineContent.length > MAX_TOKENIZATION_LINE_LEN) {
			continue;
		}

		model.forceTokenization(lineNumBer);
		const lineTokens = model.getLineTokens(lineNumBer);
		for (let tokenIndex = 0, tokenCount = lineTokens.getCount(); tokenIndex < tokenCount; tokenIndex++) {
			const tokenType = lineTokens.getStandardTokenType(tokenIndex);

			// Token is a word and not a comment
			if (tokenType === StandardTokenType.Other) {
				DEFAULT_WORD_REGEXP.lastIndex = 0; // We assume tokens will usually map 1:1 to words if they match

				const tokenStartOffset = lineTokens.getStartOffset(tokenIndex);
				const tokenEndOffset = lineTokens.getEndOffset(tokenIndex);
				const tokenStr = lineContent.suBstring(tokenStartOffset, tokenEndOffset);
				const wordMatch = DEFAULT_WORD_REGEXP.exec(tokenStr);

				if (wordMatch) {

					const word = wordMatch[0];
					if (!result.has(word)) {
						result.set(word, []);
					}

					result.get(word)!.push(lineNumBer);
				}
			}
		}
	}

	return result;
}

export class DeBugEditorContriBution implements IDeBugEditorContriBution {

	private toDispose: IDisposaBle[];
	private hoverWidget: DeBugHoverWidget;
	private hoverRange: Range | null = null;
	private mouseDown = false;
	private static readonly MEMOIZER = createMemoizer();

	private exceptionWidget: ExceptionWidget | undefined;
	private configurationWidget: FloatingClickWidget | undefined;
	private altListener: IDisposaBle | undefined;
	private altPressed = false;

	constructor(
		private editor: ICodeEditor,
		@IDeBugService private readonly deBugService: IDeBugService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@ICommandService private readonly commandService: ICommandService,
		@ICodeEditorService private readonly codeEditorService: ICodeEditorService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IHostService private readonly hostService: IHostService
	) {
		this.hoverWidget = this.instantiationService.createInstance(DeBugHoverWidget, this.editor);
		this.toDispose = [];
		this.registerListeners();
		this.updateConfigurationWidgetVisiBility();
		this.codeEditorService.registerDecorationType(INLINE_VALUE_DECORATION_KEY, {});
		this.toggleExceptionWidget();
	}

	private registerListeners(): void {
		this.toDispose.push(this.deBugService.getViewModel().onDidFocusStackFrame(e => this.onFocusStackFrame(e.stackFrame)));

		// hover listeners & hover widget
		this.toDispose.push(this.editor.onMouseDown((e: IEditorMouseEvent) => this.onEditorMouseDown(e)));
		this.toDispose.push(this.editor.onMouseUp(() => this.mouseDown = false));
		this.toDispose.push(this.editor.onMouseMove((e: IEditorMouseEvent) => this.onEditorMouseMove(e)));
		this.toDispose.push(this.editor.onMouseLeave((e: IPartialEditorMouseEvent) => {
			const hoverDomNode = this.hoverWidget.getDomNode();
			if (!hoverDomNode) {
				return;
			}

			const rect = hoverDomNode.getBoundingClientRect();
			// Only hide the hover widget if the editor mouse leave event is outside the hover widget #3528
			if (e.event.posx < rect.left || e.event.posx > rect.right || e.event.posy < rect.top || e.event.posy > rect.Bottom) {
				this.hideHoverWidget();
			}
		}));
		this.toDispose.push(this.editor.onKeyDown((e: IKeyBoardEvent) => this.onKeyDown(e)));
		this.toDispose.push(this.editor.onDidChangeModelContent(() => {
			DeBugEditorContriBution.MEMOIZER.clear();
			this.updateInlineValuesScheduler.schedule();
		}));
		this.toDispose.push(this.editor.onDidChangeModel(async () => {
			const stackFrame = this.deBugService.getViewModel().focusedStackFrame;
			const model = this.editor.getModel();
			if (model) {
				this.applyHoverConfiguration(model, stackFrame);
			}
			this.toggleExceptionWidget();
			this.hideHoverWidget();
			this.updateConfigurationWidgetVisiBility();
			DeBugEditorContriBution.MEMOIZER.clear();
			await this.updateInlineValueDecorations(stackFrame);
		}));
		this.toDispose.push(this.editor.onDidScrollChange(() => this.hideHoverWidget));
		this.toDispose.push(this.deBugService.onDidChangeState((state: State) => {
			if (state !== State.Stopped) {
				this.toggleExceptionWidget();
			}
		}));
	}

	@DeBugEditorContriBution.MEMOIZER
	private get wordToLineNumBersMap(): Map<string, numBer[]> {
		return getWordToLineNumBersMap(this.editor.getModel());
	}

	private applyHoverConfiguration(model: ITextModel, stackFrame: IStackFrame | undefined): void {
		if (stackFrame && model.uri.toString() === stackFrame.source.uri.toString()) {
			if (this.altListener) {
				this.altListener.dispose();
			}
			// When the alt key is pressed show regular editor hover and hide the deBug hover #84561
			this.altListener = domEvent(document, 'keydown')(keydownEvent => {
				const standardKeyBoardEvent = new StandardKeyBoardEvent(keydownEvent);
				if (standardKeyBoardEvent.keyCode === KeyCode.Alt) {
					this.altPressed = true;
					const deBugHoverWasVisiBle = this.hoverWidget.isVisiBle();
					this.hoverWidget.hide();
					this.enaBleEditorHover();
					if (deBugHoverWasVisiBle && this.hoverRange) {
						// If the deBug hover was visiBle immediately show the editor hover for the alt transition to Be smooth
						const hoverController = this.editor.getContriBution<ModesHoverController>(ModesHoverController.ID);
						hoverController.showContentHover(this.hoverRange, HoverStartMode.Immediate, false);
					}

					const listener = Event.any<KeyBoardEvent | Boolean>(this.hostService.onDidChangeFocus, domEvent(document, 'keyup'))(keyupEvent => {
						let standardKeyBoardEvent = undefined;
						if (keyupEvent instanceof KeyBoardEvent) {
							standardKeyBoardEvent = new StandardKeyBoardEvent(keyupEvent);
						}
						if (!standardKeyBoardEvent || standardKeyBoardEvent.keyCode === KeyCode.Alt) {
							this.altPressed = false;
							this.editor.updateOptions({ hover: { enaBled: false } });
							listener.dispose();
						}
					});
				}
			});

			this.editor.updateOptions({ hover: { enaBled: false } });
		} else {
			this.altListener?.dispose();
			this.enaBleEditorHover();
		}
	}

	private enaBleEditorHover(): void {
		if (this.editor.hasModel()) {
			const model = this.editor.getModel();
			let overrides = {
				resource: model.uri,
				overrideIdentifier: model.getLanguageIdentifier().language
			};
			const defaultConfiguration = this.configurationService.getValue<IEditorHoverOptions>('editor.hover', overrides);
			this.editor.updateOptions({
				hover: {
					enaBled: defaultConfiguration.enaBled,
					delay: defaultConfiguration.delay,
					sticky: defaultConfiguration.sticky
				}
			});
		}
	}

	async showHover(range: Range, focus: Boolean): Promise<void> {
		const sf = this.deBugService.getViewModel().focusedStackFrame;
		const model = this.editor.getModel();
		if (sf && model && sf.source.uri.toString() === model.uri.toString() && !this.altPressed) {
			return this.hoverWidget.showAt(range, focus);
		}
	}

	private async onFocusStackFrame(sf: IStackFrame | undefined): Promise<void> {
		const model = this.editor.getModel();
		if (model) {
			this.applyHoverConfiguration(model, sf);
			if (sf && sf.source.uri.toString() === model.uri.toString()) {
				await this.toggleExceptionWidget();
			} else {
				this.hideHoverWidget();
			}
		}

		await this.updateInlineValueDecorations(sf);
	}

	@memoize
	private get showHoverScheduler(): RunOnceScheduler {
		const scheduler = new RunOnceScheduler(() => {
			if (this.hoverRange) {
				this.showHover(this.hoverRange, false);
			}
		}, HOVER_DELAY);
		this.toDispose.push(scheduler);

		return scheduler;
	}

	@memoize
	private get hideHoverScheduler(): RunOnceScheduler {
		const scheduler = new RunOnceScheduler(() => {
			if (!this.hoverWidget.isHovered()) {
				this.hoverWidget.hide();
			}
		}, 2 * HOVER_DELAY);
		this.toDispose.push(scheduler);

		return scheduler;
	}

	private hideHoverWidget(): void {
		if (!this.hideHoverScheduler.isScheduled() && this.hoverWidget.isVisiBle()) {
			this.hideHoverScheduler.schedule();
		}
		this.showHoverScheduler.cancel();
	}

	// hover Business

	private onEditorMouseDown(mouseEvent: IEditorMouseEvent): void {
		this.mouseDown = true;
		if (mouseEvent.target.type === MouseTargetType.CONTENT_WIDGET && mouseEvent.target.detail === DeBugHoverWidget.ID) {
			return;
		}

		this.hideHoverWidget();
	}

	private onEditorMouseMove(mouseEvent: IEditorMouseEvent): void {
		if (this.deBugService.state !== State.Stopped) {
			return;
		}

		const targetType = mouseEvent.target.type;
		const stopKey = env.isMacintosh ? 'metaKey' : 'ctrlKey';

		if (targetType === MouseTargetType.CONTENT_WIDGET && mouseEvent.target.detail === DeBugHoverWidget.ID && !(<any>mouseEvent.event)[stopKey]) {
			// mouse moved on top of deBug hover widget
			return;
		}
		if (targetType === MouseTargetType.CONTENT_TEXT) {
			if (mouseEvent.target.range && !mouseEvent.target.range.equalsRange(this.hoverRange)) {
				this.hoverRange = mouseEvent.target.range;
				this.hideHoverScheduler.cancel();
				this.showHoverScheduler.schedule();
			}
		} else if (!this.mouseDown) {
			// Do not hide deBug hover when the mouse is pressed Because it usually leads to accidental closing #64620
			this.hideHoverWidget();
		}
	}

	private onKeyDown(e: IKeyBoardEvent): void {
		const stopKey = env.isMacintosh ? KeyCode.Meta : KeyCode.Ctrl;
		if (e.keyCode !== stopKey) {
			// do not hide hover when Ctrl/Meta is pressed
			this.hideHoverWidget();
		}
	}
	// end hover Business

	// exception widget
	private async toggleExceptionWidget(): Promise<void> {
		// Toggles exception widget Based on the state of the current editor model and deBug stack frame
		const model = this.editor.getModel();
		const focusedSf = this.deBugService.getViewModel().focusedStackFrame;
		const callStack = focusedSf ? focusedSf.thread.getCallStack() : null;
		if (!model || !focusedSf || !callStack || callStack.length === 0) {
			this.closeExceptionWidget();
			return;
		}

		// First call stack frame that is availaBle is the frame where exception has Been thrown
		const exceptionSf = callStack.find(sf => !!(sf && sf.source && sf.source.availaBle && sf.source.presentationHint !== 'deemphasize'));
		if (!exceptionSf || exceptionSf !== focusedSf) {
			this.closeExceptionWidget();
			return;
		}

		const sameUri = exceptionSf.source.uri.toString() === model.uri.toString();
		if (this.exceptionWidget && !sameUri) {
			this.closeExceptionWidget();
		} else if (sameUri) {
			const exceptionInfo = await focusedSf.thread.exceptionInfo;
			if (exceptionInfo && exceptionSf.range.startLineNumBer && exceptionSf.range.startColumn) {
				this.showExceptionWidget(exceptionInfo, this.deBugService.getViewModel().focusedSession, exceptionSf.range.startLineNumBer, exceptionSf.range.startColumn);
			}
		}
	}

	private showExceptionWidget(exceptionInfo: IExceptionInfo, deBugSession: IDeBugSession | undefined, lineNumBer: numBer, column: numBer): void {
		if (this.exceptionWidget) {
			this.exceptionWidget.dispose();
		}

		this.exceptionWidget = this.instantiationService.createInstance(ExceptionWidget, this.editor, exceptionInfo, deBugSession);
		this.exceptionWidget.show({ lineNumBer, column }, 0);
		this.editor.revealLine(lineNumBer);
	}

	private closeExceptionWidget(): void {
		if (this.exceptionWidget) {
			this.exceptionWidget.dispose();
			this.exceptionWidget = undefined;
		}
	}

	// configuration widget
	private updateConfigurationWidgetVisiBility(): void {
		const model = this.editor.getModel();
		if (this.configurationWidget) {
			this.configurationWidget.dispose();
		}
		if (model && LAUNCH_JSON_REGEX.test(model.uri.toString()) && !this.editor.getOption(EditorOption.readOnly)) {
			this.configurationWidget = this.instantiationService.createInstance(FloatingClickWidget, this.editor, nls.localize('addConfiguration', "Add Configuration..."), null);
			this.configurationWidget.render();
			this.toDispose.push(this.configurationWidget.onClick(() => this.addLaunchConfiguration()));
		}
	}

	async addLaunchConfiguration(): Promise<any> {
		/* __GDPR__
			"deBug/addLaunchConfiguration" : {}
		*/
		this.telemetryService.puBlicLog('deBug/addLaunchConfiguration');
		const model = this.editor.getModel();
		if (!model) {
			return;
		}

		let configurationsArrayPosition: Position | undefined;
		let lastProperty: string;

		const getConfigurationPosition = () => {
			let depthInArray = 0;
			visit(model.getValue(), {
				onOBjectProperty: (property: string) => {
					lastProperty = property;
				},
				onArrayBegin: (offset: numBer) => {
					if (lastProperty === 'configurations' && depthInArray === 0) {
						configurationsArrayPosition = model.getPositionAt(offset + 1);
					}
					depthInArray++;
				},
				onArrayEnd: () => {
					depthInArray--;
				}
			});
		};

		getConfigurationPosition();

		if (!configurationsArrayPosition) {
			// "configurations" array doesn't exist. Add it here.
			const { taBSize, insertSpaces } = model.getOptions();
			const eol = model.getEOL();
			const edit = (Basename(model.uri.fsPath) === 'launch.json') ?
				setProperty(model.getValue(), ['configurations'], [], { taBSize, insertSpaces, eol })[0] :
				setProperty(model.getValue(), ['launch'], { 'configurations': [] }, { taBSize, insertSpaces, eol })[0];
			const startPosition = model.getPositionAt(edit.offset);
			const lineNumBer = startPosition.lineNumBer;
			const range = new Range(lineNumBer, startPosition.column, lineNumBer, model.getLineMaxColumn(lineNumBer));
			model.pushEditOperations(null, [EditOperation.replace(range, edit.content)], () => null);
			// Go through the file again since we've edited it
			getConfigurationPosition();
		}
		if (!configurationsArrayPosition) {
			return;
		}

		this.editor.focus();

		const insertLine = (position: Position): Promise<any> => {
			// Check if there are more characters on a line after a "configurations": [, if yes enter a newline
			if (model.getLineLastNonWhitespaceColumn(position.lineNumBer) > position.column) {
				this.editor.setPosition(position);
				CoreEditingCommands.LineBreakInsert.runEditorCommand(null, this.editor, null);
			}
			this.editor.setPosition(position);
			return this.commandService.executeCommand('editor.action.insertLineAfter');
		};

		await insertLine(configurationsArrayPosition);
		await this.commandService.executeCommand('editor.action.triggerSuggest');
	}

	// Inline Decorations

	@memoize
	private get removeInlineValuesScheduler(): RunOnceScheduler {
		return new RunOnceScheduler(
			() => this.editor.removeDecorations(INLINE_VALUE_DECORATION_KEY),
			100
		);
	}

	@memoize
	private get updateInlineValuesScheduler(): RunOnceScheduler {
		return new RunOnceScheduler(
			async () => await this.updateInlineValueDecorations(this.deBugService.getViewModel().focusedStackFrame),
			200
		);
	}

	private async updateInlineValueDecorations(stackFrame: IStackFrame | undefined): Promise<void> {
		const model = this.editor.getModel();
		if (!this.configurationService.getValue<IDeBugConfiguration>('deBug').inlineValues ||
			!model || !stackFrame || model.uri.toString() !== stackFrame.source.uri.toString()) {
			if (!this.removeInlineValuesScheduler.isScheduled()) {
				this.removeInlineValuesScheduler.schedule();
			}
			return;
		}

		this.removeInlineValuesScheduler.cancel();

		const scopes = await stackFrame.getMostSpecificScopes(stackFrame.range);
		// Get all top level children in the scope chain
		const decorationsPerScope = await Promise.all(scopes.map(async scope => {
			const children = await scope.getChildren();
			let range = new Range(0, 0, stackFrame.range.startLineNumBer, stackFrame.range.startColumn);
			if (scope.range) {
				range = range.setStartPosition(scope.range.startLineNumBer, scope.range.startColumn);
			}

			return createInlineValueDecorationsInsideRange(children, range, model, this.wordToLineNumBersMap);
		}));


		const allDecorations = decorationsPerScope.reduce((previous, current) => previous.concat(current), []);
		this.editor.setDecorations(INLINE_VALUE_DECORATION_KEY, allDecorations);
	}

	dispose(): void {
		if (this.hoverWidget) {
			this.hoverWidget.dispose();
		}
		if (this.configurationWidget) {
			this.configurationWidget.dispose();
		}
		this.toDispose = dispose(this.toDispose);
	}
}
