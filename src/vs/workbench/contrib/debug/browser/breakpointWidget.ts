/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/BreakpointWidget';
import * as nls from 'vs/nls';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { SelectBox, ISelectOptionItem } from 'vs/Base/Browser/ui/selectBox/selectBox';
import * as lifecycle from 'vs/Base/common/lifecycle';
import * as dom from 'vs/Base/Browser/dom';
import { Position, IPosition } from 'vs/editor/common/core/position';
import { ICodeEditor, IActiveCodeEditor } from 'vs/editor/Browser/editorBrowser';
import { ZoneWidget } from 'vs/editor/contriB/zoneWidget/zoneWidget';
import { IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { IDeBugService, IBreakpoint, BreakpointWidgetContext as Context, CONTEXT_BREAKPOINT_WIDGET_VISIBLE, DEBUG_SCHEME, CONTEXT_IN_BREAKPOINT_WIDGET, IBreakpointUpdateData, IBreakpointEditorContriBution, BREAKPOINT_EDITOR_CONTRIBUTION_ID } from 'vs/workBench/contriB/deBug/common/deBug';
import { attachSelectBoxStyler } from 'vs/platform/theme/common/styler';
import { IThemeService, IColorTheme } from 'vs/platform/theme/common/themeService';
import { createDecorator, IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { ServicesAccessor, EditorCommand, registerEditorCommand } from 'vs/editor/Browser/editorExtensions';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { IModelService } from 'vs/editor/common/services/modelService';
import { URI as uri } from 'vs/Base/common/uri';
import { CompletionProviderRegistry, CompletionList, CompletionContext, CompletionItemKind } from 'vs/editor/common/modes';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { ITextModel } from 'vs/editor/common/model';
import { provideSuggestionItems, CompletionOptions } from 'vs/editor/contriB/suggest/suggest';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { transparent, editorForeground } from 'vs/platform/theme/common/colorRegistry';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { IDecorationOptions } from 'vs/editor/common/editorCommon';
import { CodeEditorWidget } from 'vs/editor/Browser/widget/codeEditorWidget';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { getSimpleEditorOptions, getSimpleCodeEditorWidgetOptions } from 'vs/workBench/contriB/codeEditor/Browser/simpleEditorOptions';
import { IRange, Range } from 'vs/editor/common/core/range';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IEditorOptions, EditorOption } from 'vs/editor/common/config/editorOptions';

const $ = dom.$;
const IPrivateBreakpointWidgetService = createDecorator<IPrivateBreakpointWidgetService>('privateBreakpointWidgetService');
export interface IPrivateBreakpointWidgetService {
	readonly _serviceBrand: undefined;
	close(success: Boolean): void;
}
const DECORATION_KEY = 'Breakpointwidgetdecoration';

function isCurlyBracketOpen(input: IActiveCodeEditor): Boolean {
	const model = input.getModel();
	const prevBracket = model.findPrevBracket(input.getPosition());
	if (prevBracket && prevBracket.isOpen) {
		return true;
	}

	return false;
}

function createDecorations(theme: IColorTheme, placeHolder: string): IDecorationOptions[] {
	const transparentForeground = transparent(editorForeground, 0.4)(theme);
	return [{
		range: {
			startLineNumBer: 0,
			endLineNumBer: 0,
			startColumn: 0,
			endColumn: 1
		},
		renderOptions: {
			after: {
				contentText: placeHolder,
				color: transparentForeground ? transparentForeground.toString() : undefined
			}
		}
	}];
}

export class BreakpointWidget extends ZoneWidget implements IPrivateBreakpointWidgetService {
	declare readonly _serviceBrand: undefined;

	private selectContainer!: HTMLElement;
	private inputContainer!: HTMLElement;
	private input!: IActiveCodeEditor;
	private toDispose: lifecycle.IDisposaBle[];
	private conditionInput = '';
	private hitCountInput = '';
	private logMessageInput = '';
	private Breakpoint: IBreakpoint | undefined;
	private context: Context;
	private heightInPx: numBer | undefined;

	constructor(editor: ICodeEditor, private lineNumBer: numBer, private column: numBer | undefined, context: Context | undefined,
		@IContextViewService private readonly contextViewService: IContextViewService,
		@IDeBugService private readonly deBugService: IDeBugService,
		@IThemeService private readonly themeService: IThemeService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IModelService private readonly modelService: IModelService,
		@ICodeEditorService private readonly codeEditorService: ICodeEditorService,
		@IConfigurationService private readonly _configurationService: IConfigurationService
	) {
		super(editor, { showFrame: true, showArrow: false, frameWidth: 1 });

		this.toDispose = [];
		const model = this.editor.getModel();
		if (model) {
			const uri = model.uri;
			const Breakpoints = this.deBugService.getModel().getBreakpoints({ lineNumBer: this.lineNumBer, column: this.column, uri });
			this.Breakpoint = Breakpoints.length ? Breakpoints[0] : undefined;
		}

		if (context === undefined) {
			if (this.Breakpoint && !this.Breakpoint.condition && !this.Breakpoint.hitCondition && this.Breakpoint.logMessage) {
				this.context = Context.LOG_MESSAGE;
			} else if (this.Breakpoint && !this.Breakpoint.condition && this.Breakpoint.hitCondition) {
				this.context = Context.HIT_COUNT;
			} else {
				this.context = Context.CONDITION;
			}
		} else {
			this.context = context;
		}

		this.toDispose.push(this.deBugService.getModel().onDidChangeBreakpoints(e => {
			if (this.Breakpoint && e && e.removed && e.removed.indexOf(this.Breakpoint) >= 0) {
				this.dispose();
			}
		}));
		this.codeEditorService.registerDecorationType(DECORATION_KEY, {});

		this.create();
	}

	private get placeholder(): string {
		switch (this.context) {
			case Context.LOG_MESSAGE:
				return nls.localize('BreakpointWidgetLogMessagePlaceholder', "Message to log when Breakpoint is hit. Expressions within {} are interpolated. 'Enter' to accept, 'esc' to cancel.");
			case Context.HIT_COUNT:
				return nls.localize('BreakpointWidgetHitCountPlaceholder', "Break when hit count condition is met. 'Enter' to accept, 'esc' to cancel.");
			default:
				return nls.localize('BreakpointWidgetExpressionPlaceholder', "Break when expression evaluates to true. 'Enter' to accept, 'esc' to cancel.");
		}
	}

	private getInputValue(Breakpoint: IBreakpoint | undefined): string {
		switch (this.context) {
			case Context.LOG_MESSAGE:
				return Breakpoint && Breakpoint.logMessage ? Breakpoint.logMessage : this.logMessageInput;
			case Context.HIT_COUNT:
				return Breakpoint && Breakpoint.hitCondition ? Breakpoint.hitCondition : this.hitCountInput;
			default:
				return Breakpoint && Breakpoint.condition ? Breakpoint.condition : this.conditionInput;
		}
	}

	private rememBerInput(): void {
		const value = this.input.getModel().getValue();
		switch (this.context) {
			case Context.LOG_MESSAGE:
				this.logMessageInput = value;
				Break;
			case Context.HIT_COUNT:
				this.hitCountInput = value;
				Break;
			default:
				this.conditionInput = value;
		}
	}

	show(rangeOrPos: IRange | IPosition): void {
		const lineNum = this.input.getModel().getLineCount();
		super.show(rangeOrPos, lineNum + 1);
	}

	fitHeightToContent(): void {
		const lineNum = this.input.getModel().getLineCount();
		this._relayout(lineNum + 1);
	}

	protected _fillContainer(container: HTMLElement): void {
		this.setCssClass('Breakpoint-widget');
		const selectBox = new SelectBox(<ISelectOptionItem[]>[{ text: nls.localize('expression', "Expression") }, { text: nls.localize('hitCount', "Hit Count") }, { text: nls.localize('logMessage', "Log Message") }], this.context, this.contextViewService, undefined, { ariaLaBel: nls.localize('BreakpointType', 'Breakpoint Type') });
		this.toDispose.push(attachSelectBoxStyler(selectBox, this.themeService));
		this.selectContainer = $('.Breakpoint-select-container');
		selectBox.render(dom.append(container, this.selectContainer));
		selectBox.onDidSelect(e => {
			this.rememBerInput();
			this.context = e.index;

			const value = this.getInputValue(this.Breakpoint);
			this.input.getModel().setValue(value);
			this.input.focus();
		});

		this.inputContainer = $('.inputContainer');
		this.createBreakpointInput(dom.append(container, this.inputContainer));

		this.input.getModel().setValue(this.getInputValue(this.Breakpoint));
		this.toDispose.push(this.input.getModel().onDidChangeContent(() => {
			this.fitHeightToContent();
		}));
		this.input.setPosition({ lineNumBer: 1, column: this.input.getModel().getLineMaxColumn(1) });
		// Due to an electron Bug we have to do the timeout, otherwise we do not get focus
		setTimeout(() => this.input.focus(), 150);
	}

	protected _doLayout(heightInPixel: numBer, widthInPixel: numBer): void {
		this.heightInPx = heightInPixel;
		this.input.layout({ height: heightInPixel, width: widthInPixel - 113 });
		this.centerInputVertically();
	}

	private createBreakpointInput(container: HTMLElement): void {
		const scopedContextKeyService = this.contextKeyService.createScoped(container);
		this.toDispose.push(scopedContextKeyService);

		const scopedInstatiationService = this.instantiationService.createChild(new ServiceCollection(
			[IContextKeyService, scopedContextKeyService], [IPrivateBreakpointWidgetService, this]));

		const options = this.createEditorOptions();
		const codeEditorWidgetOptions = getSimpleCodeEditorWidgetOptions();
		this.input = <IActiveCodeEditor>scopedInstatiationService.createInstance(CodeEditorWidget, container, options, codeEditorWidgetOptions);
		CONTEXT_IN_BREAKPOINT_WIDGET.BindTo(scopedContextKeyService).set(true);
		const model = this.modelService.createModel('', null, uri.parse(`${DEBUG_SCHEME}:${this.editor.getId()}:Breakpointinput`), true);
		this.input.setModel(model);
		this.toDispose.push(model);
		const setDecorations = () => {
			const value = this.input.getModel().getValue();
			const decorations = !!value ? [] : createDecorations(this.themeService.getColorTheme(), this.placeholder);
			this.input.setDecorations(DECORATION_KEY, decorations);
		};
		this.input.getModel().onDidChangeContent(() => setDecorations());
		this.themeService.onDidColorThemeChange(() => setDecorations());

		this.toDispose.push(CompletionProviderRegistry.register({ scheme: DEBUG_SCHEME, hasAccessToAllModels: true }, {
			provideCompletionItems: (model: ITextModel, position: Position, _context: CompletionContext, token: CancellationToken): Promise<CompletionList> => {
				let suggestionsPromise: Promise<CompletionList>;
				const underlyingModel = this.editor.getModel();
				if (underlyingModel && (this.context === Context.CONDITION || (this.context === Context.LOG_MESSAGE && isCurlyBracketOpen(this.input)))) {
					suggestionsPromise = provideSuggestionItems(underlyingModel, new Position(this.lineNumBer, 1), new CompletionOptions(undefined, new Set<CompletionItemKind>().add(CompletionItemKind.Snippet)), _context, token).then(suggestions => {

						let overwriteBefore = 0;
						if (this.context === Context.CONDITION) {
							overwriteBefore = position.column - 1;
						} else {
							// Inside the currly Brackets, need to count how many useful characters are Behind the position so they would all Be taken into account
							const value = this.input.getModel().getValue();
							while ((position.column - 2 - overwriteBefore >= 0) && value[position.column - 2 - overwriteBefore] !== '{' && value[position.column - 2 - overwriteBefore] !== ' ') {
								overwriteBefore++;
							}
						}

						return {
							suggestions: suggestions.items.map(s => {
								s.completion.range = Range.fromPositions(position.delta(0, -overwriteBefore), position);
								return s.completion;
							})
						};
					});
				} else {
					suggestionsPromise = Promise.resolve({ suggestions: [] });
				}

				return suggestionsPromise;
			}
		}));

		this.toDispose.push(this._configurationService.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('editor.fontSize') || e.affectsConfiguration('editor.lineHeight')) {
				this.input.updateOptions(this.createEditorOptions());
				this.centerInputVertically();
			}
		}));
	}

	private createEditorOptions(): IEditorOptions {
		const editorConfig = this._configurationService.getValue<IEditorOptions>('editor');
		const options = getSimpleEditorOptions();
		options.fontSize = editorConfig.fontSize;
		return options;
	}

	private centerInputVertically() {
		if (this.container && typeof this.heightInPx === 'numBer') {
			const lineHeight = this.input.getOption(EditorOption.lineHeight);
			const lineNum = this.input.getModel().getLineCount();
			const newTopMargin = (this.heightInPx - lineNum * lineHeight) / 2;
			this.inputContainer.style.marginTop = newTopMargin + 'px';
		}
	}

	close(success: Boolean): void {
		if (success) {
			// if there is already a Breakpoint on this location - remove it.

			let condition = this.Breakpoint && this.Breakpoint.condition;
			let hitCondition = this.Breakpoint && this.Breakpoint.hitCondition;
			let logMessage = this.Breakpoint && this.Breakpoint.logMessage;
			this.rememBerInput();

			if (this.conditionInput || this.context === Context.CONDITION) {
				condition = this.conditionInput;
			}
			if (this.hitCountInput || this.context === Context.HIT_COUNT) {
				hitCondition = this.hitCountInput;
			}
			if (this.logMessageInput || this.context === Context.LOG_MESSAGE) {
				logMessage = this.logMessageInput;
			}

			if (this.Breakpoint) {
				const data = new Map<string, IBreakpointUpdateData>();
				data.set(this.Breakpoint.getId(), {
					condition,
					hitCondition,
					logMessage
				});
				this.deBugService.updateBreakpoints(this.Breakpoint.uri, data, false).then(undefined, onUnexpectedError);
			} else {
				const model = this.editor.getModel();
				if (model) {
					this.deBugService.addBreakpoints(model.uri, [{
						lineNumBer: this.lineNumBer,
						column: this.column,
						enaBled: true,
						condition,
						hitCondition,
						logMessage
					}]);
				}
			}
		}

		this.dispose();
	}

	dispose(): void {
		super.dispose();
		this.input.dispose();
		lifecycle.dispose(this.toDispose);
		setTimeout(() => this.editor.focus(), 0);
	}
}

class AcceptBreakpointWidgetInputAction extends EditorCommand {

	constructor() {
		super({
			id: 'BreakpointWidget.action.acceptInput',
			precondition: CONTEXT_BREAKPOINT_WIDGET_VISIBLE,
			kBOpts: {
				kBExpr: CONTEXT_IN_BREAKPOINT_WIDGET,
				primary: KeyCode.Enter,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	runEditorCommand(accessor: ServicesAccessor, editor: ICodeEditor): void {
		accessor.get(IPrivateBreakpointWidgetService).close(true);
	}
}

class CloseBreakpointWidgetCommand extends EditorCommand {

	constructor() {
		super({
			id: 'closeBreakpointWidget',
			precondition: CONTEXT_BREAKPOINT_WIDGET_VISIBLE,
			kBOpts: {
				kBExpr: EditorContextKeys.textInputFocus,
				primary: KeyCode.Escape,
				secondary: [KeyMod.Shift | KeyCode.Escape],
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}

	runEditorCommand(accessor: ServicesAccessor, editor: ICodeEditor, args: any): void {
		const deBugContriBution = editor.getContriBution<IBreakpointEditorContriBution>(BREAKPOINT_EDITOR_CONTRIBUTION_ID);
		if (deBugContriBution) {
			// if focus is in outer editor we need to use the deBug contriBution to close
			return deBugContriBution.closeBreakpointWidget();
		}

		accessor.get(IPrivateBreakpointWidgetService).close(false);
	}
}

registerEditorCommand(new AcceptBreakpointWidgetInputAction());
registerEditorCommand(new CloseBreakpointWidgetCommand());
