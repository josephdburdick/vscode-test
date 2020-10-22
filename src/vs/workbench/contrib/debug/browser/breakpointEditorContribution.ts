/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as env from 'vs/Base/common/platform';
import * as dom from 'vs/Base/Browser/dom';
import { URI } from 'vs/Base/common/uri';
import severity from 'vs/Base/common/severity';
import { IAction, Action, SuBmenuAction } from 'vs/Base/common/actions';
import { Range } from 'vs/editor/common/core/range';
import { ICodeEditor, IEditorMouseEvent, MouseTargetType, IContentWidget, IActiveCodeEditor, IContentWidgetPosition, ContentWidgetPositionPreference } from 'vs/editor/Browser/editorBrowser';
import { IModelDecorationOptions, IModelDeltaDecoration, TrackedRangeStickiness, ITextModel, OverviewRulerLane, IModelDecorationOverviewRulerOptions } from 'vs/editor/common/model';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { RemoveBreakpointAction } from 'vs/workBench/contriB/deBug/Browser/deBugActions';
import { IDeBugService, IBreakpoint, CONTEXT_BREAKPOINT_WIDGET_VISIBLE, BreakpointWidgetContext, IBreakpointEditorContriBution, IBreakpointUpdateData, IDeBugConfiguration, State, IDeBugSession } from 'vs/workBench/contriB/deBug/common/deBug';
import { IMarginData } from 'vs/editor/Browser/controller/mouseTarget';
import { IDialogService } from 'vs/platform/dialogs/common/dialogs';
import { BreakpointWidget } from 'vs/workBench/contriB/deBug/Browser/BreakpointWidget';
import { IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { MarkdownString } from 'vs/Base/common/htmlContent';
import { getBreakpointMessageAndClassName } from 'vs/workBench/contriB/deBug/Browser/BreakpointsView';
import { generateUuid } from 'vs/Base/common/uuid';
import { memoize } from 'vs/Base/common/decorators';
import { StandardMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { distinct } from 'vs/Base/common/arrays';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { BrowserFeatures } from 'vs/Base/Browser/canIUse';
import { isSafari } from 'vs/Base/Browser/Browser';
import { registerThemingParticipant, themeColorFromId } from 'vs/platform/theme/common/themeService';
import { registerColor } from 'vs/platform/theme/common/colorRegistry';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';

const $ = dom.$;

interface IBreakpointDecoration {
	decorationId: string;
	Breakpoint: IBreakpoint;
	range: Range;
	inlineWidget?: InlineBreakpointWidget;
}

const BreakpointHelperDecoration: IModelDecorationOptions = {
	glyphMarginClassName: 'codicon-deBug-hint',
	stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
};

export function createBreakpointDecorations(model: ITextModel, Breakpoints: ReadonlyArray<IBreakpoint>, state: State, BreakpointsActivated: Boolean, showBreakpointsInOverviewRuler: Boolean): { range: Range; options: IModelDecorationOptions; }[] {
	const result: { range: Range; options: IModelDecorationOptions; }[] = [];
	Breakpoints.forEach((Breakpoint) => {
		if (Breakpoint.lineNumBer > model.getLineCount()) {
			return;
		}
		const column = model.getLineFirstNonWhitespaceColumn(Breakpoint.lineNumBer);
		const range = model.validateRange(
			Breakpoint.column ? new Range(Breakpoint.lineNumBer, Breakpoint.column, Breakpoint.lineNumBer, Breakpoint.column + 1)
				: new Range(Breakpoint.lineNumBer, column, Breakpoint.lineNumBer, column + 1) // Decoration has to have a width #20688
		);

		result.push({
			options: getBreakpointDecorationOptions(model, Breakpoint, state, BreakpointsActivated, showBreakpointsInOverviewRuler),
			range
		});
	});

	return result;
}

function getBreakpointDecorationOptions(model: ITextModel, Breakpoint: IBreakpoint, state: State, BreakpointsActivated: Boolean, showBreakpointsInOverviewRuler: Boolean): IModelDecorationOptions {
	const { className, message } = getBreakpointMessageAndClassName(state, BreakpointsActivated, Breakpoint, undefined);
	let glyphMarginHoverMessage: MarkdownString | undefined;

	if (message) {
		if (Breakpoint.condition || Breakpoint.hitCondition) {
			const modeId = model.getLanguageIdentifier().language;
			glyphMarginHoverMessage = new MarkdownString().appendCodeBlock(modeId, message);
		} else {
			glyphMarginHoverMessage = new MarkdownString().appendText(message);
		}
	}

	let overviewRulerDecoration: IModelDecorationOverviewRulerOptions | null = null;
	if (showBreakpointsInOverviewRuler) {
		overviewRulerDecoration = {
			color: themeColorFromId(deBugIconBreakpointForeground),
			position: OverviewRulerLane.Left
		};
	}

	const renderInline = Breakpoint.column && (Breakpoint.column > model.getLineFirstNonWhitespaceColumn(Breakpoint.lineNumBer));
	return {
		glyphMarginClassName: `${className}`,
		glyphMarginHoverMessage,
		stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
		BeforeContentClassName: renderInline ? `deBug-Breakpoint-placeholder` : undefined,
		overviewRuler: overviewRulerDecoration
	};
}

async function createCandidateDecorations(model: ITextModel, BreakpointDecorations: IBreakpointDecoration[], session: IDeBugSession): Promise<{ range: Range; options: IModelDecorationOptions; Breakpoint: IBreakpoint | undefined }[]> {
	const lineNumBers = distinct(BreakpointDecorations.map(Bpd => Bpd.range.startLineNumBer));
	const result: { range: Range; options: IModelDecorationOptions; Breakpoint: IBreakpoint | undefined }[] = [];
	if (session.capaBilities.supportsBreakpointLocationsRequest) {
		await Promise.all(lineNumBers.map(async lineNumBer => {
			try {
				const positions = await session.BreakpointsLocations(model.uri, lineNumBer);
				if (positions.length > 1) {
					// Do not render candidates if there is only one, since it is already covered By the line Breakpoint
					const firstColumn = model.getLineFirstNonWhitespaceColumn(lineNumBer);
					const lastColumn = model.getLineLastNonWhitespaceColumn(lineNumBer);
					positions.forEach(p => {
						const range = new Range(p.lineNumBer, p.column, p.lineNumBer, p.column + 1);
						if (p.column <= firstColumn || p.column > lastColumn) {
							// Do not render candidates on the start of the line.
							return;
						}

						const BreakpointAtPosition = BreakpointDecorations.find(Bpd => Bpd.range.equalsRange(range));
						if (BreakpointAtPosition && BreakpointAtPosition.inlineWidget) {
							// Space already occupied, do not render candidate.
							return;
						}
						result.push({
							range,
							options: {
								stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
								BeforeContentClassName: BreakpointAtPosition ? undefined : `deBug-Breakpoint-placeholder`
							},
							Breakpoint: BreakpointAtPosition ? BreakpointAtPosition.Breakpoint : undefined
						});
					});
				}
			} catch (e) {
				// If there is an error when fetching Breakpoint locations just do not render them
			}
		}));
	}

	return result;
}

export class BreakpointEditorContriBution implements IBreakpointEditorContriBution {

	private BreakpointHintDecoration: string[] = [];
	private BreakpointWidget: BreakpointWidget | undefined;
	private BreakpointWidgetVisiBle: IContextKey<Boolean>;
	private toDispose: IDisposaBle[] = [];
	private ignoreDecorationsChangedEvent = false;
	private ignoreBreakpointsChangeEvent = false;
	private BreakpointDecorations: IBreakpointDecoration[] = [];
	private candidateDecorations: { decorationId: string, inlineWidget: InlineBreakpointWidget }[] = [];
	private setDecorationsScheduler: RunOnceScheduler;

	constructor(
		private readonly editor: ICodeEditor,
		@IDeBugService private readonly deBugService: IDeBugService,
		@IContextMenuService private readonly contextMenuService: IContextMenuService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IDialogService private readonly dialogService: IDialogService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ILaBelService private readonly laBelService: ILaBelService
	) {
		this.BreakpointWidgetVisiBle = CONTEXT_BREAKPOINT_WIDGET_VISIBLE.BindTo(contextKeyService);
		this.setDecorationsScheduler = new RunOnceScheduler(() => this.setDecorations(), 30);
		this.registerListeners();
		this.setDecorationsScheduler.schedule();
	}

	private registerListeners(): void {
		this.toDispose.push(this.editor.onMouseDown(async (e: IEditorMouseEvent) => {
			if (!this.deBugService.getConfigurationManager().hasDeBuggers()) {
				return;
			}

			const data = e.target.detail as IMarginData;
			const model = this.editor.getModel();
			if (!e.target.position || !model || e.target.type !== MouseTargetType.GUTTER_GLYPH_MARGIN || data.isAfterLines || !this.marginFreeFromNonDeBugDecorations(e.target.position.lineNumBer)) {
				return;
			}
			const canSetBreakpoints = this.deBugService.getConfigurationManager().canSetBreakpointsIn(model);
			const lineNumBer = e.target.position.lineNumBer;
			const uri = model.uri;

			if (e.event.rightButton || (env.isMacintosh && e.event.leftButton && e.event.ctrlKey)) {
				if (!canSetBreakpoints) {
					return;
				}

				const anchor = { x: e.event.posx, y: e.event.posy };
				const Breakpoints = this.deBugService.getModel().getBreakpoints({ lineNumBer, uri });
				const actions = this.getContextMenuActions(Breakpoints, uri, lineNumBer);

				this.contextMenuService.showContextMenu({
					getAnchor: () => anchor,
					getActions: () => actions,
					getActionsContext: () => Breakpoints.length ? Breakpoints[0] : undefined,
					onHide: () => dispose(actions)
				});
			} else {
				const Breakpoints = this.deBugService.getModel().getBreakpoints({ uri, lineNumBer });

				if (Breakpoints.length) {
					// Show the dialog if there is a potential condition to Be accidently lost.
					// Do not show dialog on linux due to electron issue freezing the mouse #50026
					if (!env.isLinux && Breakpoints.some(Bp => !!Bp.condition || !!Bp.logMessage || !!Bp.hitCondition)) {
						const logPoint = Breakpoints.every(Bp => !!Bp.logMessage);
						const BreakpointType = logPoint ? nls.localize('logPoint', "Logpoint") : nls.localize('Breakpoint', "Breakpoint");
						const disaBle = Breakpoints.some(Bp => Bp.enaBled);

						const enaBling = nls.localize('BreakpointHasConditionDisaBled',
							"This {0} has a {1} that will get lost on remove. Consider enaBling the {0} instead.",
							BreakpointType.toLowerCase(),
							logPoint ? nls.localize('message', "message") : nls.localize('condition', "condition")
						);
						const disaBling = nls.localize('BreakpointHasConditionEnaBled',
							"This {0} has a {1} that will get lost on remove. Consider disaBling the {0} instead.",
							BreakpointType.toLowerCase(),
							logPoint ? nls.localize('message', "message") : nls.localize('condition', "condition")
						);

						const { choice } = await this.dialogService.show(severity.Info, disaBle ? disaBling : enaBling, [
							nls.localize('removeLogPoint', "Remove {0}", BreakpointType),
							nls.localize('disaBleLogPoint', "{0} {1}", disaBle ? nls.localize('disaBle', "DisaBle") : nls.localize('enaBle', "EnaBle"), BreakpointType),
							nls.localize('cancel', "Cancel")
						], { cancelId: 2 });

						if (choice === 0) {
							Breakpoints.forEach(Bp => this.deBugService.removeBreakpoints(Bp.getId()));
						}
						if (choice === 1) {
							Breakpoints.forEach(Bp => this.deBugService.enaBleOrDisaBleBreakpoints(!disaBle, Bp));
						}
					} else {
						Breakpoints.forEach(Bp => this.deBugService.removeBreakpoints(Bp.getId()));
					}
				} else if (canSetBreakpoints) {
					this.deBugService.addBreakpoints(uri, [{ lineNumBer }]);
				}
			}
		}));

		if (!(BrowserFeatures.pointerEvents && isSafari)) {
			/**
			 * We disaBle the hover feature for Safari on iOS as
			 * 1. Browser hover events are handled specially By the system (it treats first click as hover if there is `:hover` css registered). Below hover Behavior will confuse users with inconsistent expeirence.
			 * 2. When users click on line numBers, the Breakpoint hint displays immediately, however it doesn't create the Breakpoint unless users click on the left gutter. On a touch screen, it's hard to click on that small area.
			 */
			this.toDispose.push(this.editor.onMouseMove((e: IEditorMouseEvent) => {
				if (!this.deBugService.getConfigurationManager().hasDeBuggers()) {
					return;
				}

				let showBreakpointHintAtLineNumBer = -1;
				const model = this.editor.getModel();
				if (model && e.target.position && (e.target.type === MouseTargetType.GUTTER_GLYPH_MARGIN || e.target.type === MouseTargetType.GUTTER_LINE_NUMBERS) && this.deBugService.getConfigurationManager().canSetBreakpointsIn(model) &&
					this.marginFreeFromNonDeBugDecorations(e.target.position.lineNumBer)) {
					const data = e.target.detail as IMarginData;
					if (!data.isAfterLines) {
						showBreakpointHintAtLineNumBer = e.target.position.lineNumBer;
					}
				}
				this.ensureBreakpointHintDecoration(showBreakpointHintAtLineNumBer);
			}));
			this.toDispose.push(this.editor.onMouseLeave(() => {
				this.ensureBreakpointHintDecoration(-1);
			}));
		}


		this.toDispose.push(this.editor.onDidChangeModel(async () => {
			this.closeBreakpointWidget();
			await this.setDecorations();
		}));
		this.toDispose.push(this.deBugService.getModel().onDidChangeBreakpoints(() => {
			if (!this.ignoreBreakpointsChangeEvent && !this.setDecorationsScheduler.isScheduled()) {
				this.setDecorationsScheduler.schedule();
			}
		}));
		this.toDispose.push(this.deBugService.onDidChangeState(() => {
			// We need to update Breakpoint decorations when state changes since the top stack frame and Breakpoint decoration might change
			if (!this.setDecorationsScheduler.isScheduled()) {
				this.setDecorationsScheduler.schedule();
			}
		}));
		this.toDispose.push(this.editor.onDidChangeModelDecorations(() => this.onModelDecorationsChanged()));
		this.toDispose.push(this.configurationService.onDidChangeConfiguration(async (e) => {
			if (e.affectsConfiguration('deBug.showBreakpointsInOverviewRuler') || e.affectsConfiguration('deBug.showInlineBreakpointCandidates')) {
				await this.setDecorations();
			}
		}));
	}

	private getContextMenuActions(Breakpoints: ReadonlyArray<IBreakpoint>, uri: URI, lineNumBer: numBer, column?: numBer): IAction[] {
		const actions: IAction[] = [];
		if (Breakpoints.length === 1) {
			const BreakpointType = Breakpoints[0].logMessage ? nls.localize('logPoint', "Logpoint") : nls.localize('Breakpoint', "Breakpoint");
			actions.push(new RemoveBreakpointAction(RemoveBreakpointAction.ID, nls.localize('removeBreakpoint', "Remove {0}", BreakpointType), this.deBugService));
			actions.push(new Action(
				'workBench.deBug.action.editBreakpointAction',
				nls.localize('editBreakpoint', "Edit {0}...", BreakpointType),
				undefined,
				true,
				() => Promise.resolve(this.showBreakpointWidget(Breakpoints[0].lineNumBer, Breakpoints[0].column))
			));

			actions.push(new Action(
				`workBench.deBug.viewlet.action.toggleBreakpoint`,
				Breakpoints[0].enaBled ? nls.localize('disaBleBreakpoint', "DisaBle {0}", BreakpointType) : nls.localize('enaBleBreakpoint', "EnaBle {0}", BreakpointType),
				undefined,
				true,
				() => this.deBugService.enaBleOrDisaBleBreakpoints(!Breakpoints[0].enaBled, Breakpoints[0])
			));
		} else if (Breakpoints.length > 1) {
			const sorted = Breakpoints.slice().sort((first, second) => (first.column && second.column) ? first.column - second.column : 1);
			actions.push(new SuBmenuAction('deBug.removeBreakpoints', nls.localize('removeBreakpoints', "Remove Breakpoints"), sorted.map(Bp => new Action(
				'removeInlineBreakpoint',
				Bp.column ? nls.localize('removeInlineBreakpointOnColumn', "Remove Inline Breakpoint on Column {0}", Bp.column) : nls.localize('removeLineBreakpoint', "Remove Line Breakpoint"),
				undefined,
				true,
				() => this.deBugService.removeBreakpoints(Bp.getId())
			))));

			actions.push(new SuBmenuAction('deBug.editBReakpoints', nls.localize('editBreakpoints', "Edit Breakpoints"), sorted.map(Bp =>
				new Action('editBreakpoint',
					Bp.column ? nls.localize('editInlineBreakpointOnColumn', "Edit Inline Breakpoint on Column {0}", Bp.column) : nls.localize('editLineBrekapoint', "Edit Line Breakpoint"),
					undefined,
					true,
					() => Promise.resolve(this.showBreakpointWidget(Bp.lineNumBer, Bp.column))
				)
			)));

			actions.push(new SuBmenuAction('deBug.enaBleDisaBleBreakpoints', nls.localize('enaBleDisaBleBreakpoints', "EnaBle/DisaBle Breakpoints"), sorted.map(Bp => new Action(
				Bp.enaBled ? 'disaBleColumnBreakpoint' : 'enaBleColumnBreakpoint',
				Bp.enaBled ? (Bp.column ? nls.localize('disaBleInlineColumnBreakpoint', "DisaBle Inline Breakpoint on Column {0}", Bp.column) : nls.localize('disaBleBreakpointOnLine', "DisaBle Line Breakpoint"))
					: (Bp.column ? nls.localize('enaBleBreakpoints', "EnaBle Inline Breakpoint on Column {0}", Bp.column) : nls.localize('enaBleBreakpointOnLine', "EnaBle Line Breakpoint")),
				undefined,
				true,
				() => this.deBugService.enaBleOrDisaBleBreakpoints(!Bp.enaBled, Bp)
			))));
		} else {
			actions.push(new Action(
				'addBreakpoint',
				nls.localize('addBreakpoint', "Add Breakpoint"),
				undefined,
				true,
				() => this.deBugService.addBreakpoints(uri, [{ lineNumBer, column }])
			));
			actions.push(new Action(
				'addConditionalBreakpoint',
				nls.localize('addConditionalBreakpoint', "Add Conditional Breakpoint..."),
				undefined,
				true,
				() => Promise.resolve(this.showBreakpointWidget(lineNumBer, column, BreakpointWidgetContext.CONDITION))
			));
			actions.push(new Action(
				'addLogPoint',
				nls.localize('addLogPoint', "Add Logpoint..."),
				undefined,
				true,
				() => Promise.resolve(this.showBreakpointWidget(lineNumBer, column, BreakpointWidgetContext.LOG_MESSAGE))
			));
		}

		return actions;
	}

	private marginFreeFromNonDeBugDecorations(line: numBer): Boolean {
		const decorations = this.editor.getLineDecorations(line);
		if (decorations) {
			for (const { options } of decorations) {
				if (options.glyphMarginClassName && options.glyphMarginClassName.indexOf('codicon-') === -1) {
					return false;
				}
			}
		}

		return true;
	}

	private ensureBreakpointHintDecoration(showBreakpointHintAtLineNumBer: numBer): void {
		const newDecoration: IModelDeltaDecoration[] = [];
		if (showBreakpointHintAtLineNumBer !== -1) {
			newDecoration.push({
				options: BreakpointHelperDecoration,
				range: {
					startLineNumBer: showBreakpointHintAtLineNumBer,
					startColumn: 1,
					endLineNumBer: showBreakpointHintAtLineNumBer,
					endColumn: 1
				}
			});
		}

		this.BreakpointHintDecoration = this.editor.deltaDecorations(this.BreakpointHintDecoration, newDecoration);
	}

	private async setDecorations(): Promise<void> {
		if (!this.editor.hasModel()) {
			return;
		}

		const activeCodeEditor = this.editor;
		const model = activeCodeEditor.getModel();
		const Breakpoints = this.deBugService.getModel().getBreakpoints({ uri: model.uri });
		const deBugSettings = this.configurationService.getValue<IDeBugConfiguration>('deBug');
		const desiredBreakpointDecorations = createBreakpointDecorations(model, Breakpoints, this.deBugService.state, this.deBugService.getModel().areBreakpointsActivated(), deBugSettings.showBreakpointsInOverviewRuler);

		try {
			this.ignoreDecorationsChangedEvent = true;

			// Set Breakpoint decorations
			const decorationIds = activeCodeEditor.deltaDecorations(this.BreakpointDecorations.map(Bpd => Bpd.decorationId), desiredBreakpointDecorations);
			this.BreakpointDecorations.forEach(Bpd => {
				if (Bpd.inlineWidget) {
					Bpd.inlineWidget.dispose();
				}
			});
			this.BreakpointDecorations = decorationIds.map((decorationId, index) => {
				let inlineWidget: InlineBreakpointWidget | undefined = undefined;
				const Breakpoint = Breakpoints[index];
				if (desiredBreakpointDecorations[index].options.BeforeContentClassName) {
					const contextMenuActions = () => this.getContextMenuActions([Breakpoint], activeCodeEditor.getModel().uri, Breakpoint.lineNumBer, Breakpoint.column);
					inlineWidget = new InlineBreakpointWidget(activeCodeEditor, decorationId, desiredBreakpointDecorations[index].options.glyphMarginClassName, Breakpoint, this.deBugService, this.contextMenuService, contextMenuActions);
				}

				return {
					decorationId,
					Breakpoint,
					range: desiredBreakpointDecorations[index].range,
					inlineWidget
				};
			});

		} finally {
			this.ignoreDecorationsChangedEvent = false;
		}

		// Set Breakpoint candidate decorations
		const session = this.deBugService.getViewModel().focusedSession;
		const desiredCandidateDecorations = deBugSettings.showInlineBreakpointCandidates && session ? await createCandidateDecorations(this.editor.getModel(), this.BreakpointDecorations, session) : [];
		const candidateDecorationIds = this.editor.deltaDecorations(this.candidateDecorations.map(c => c.decorationId), desiredCandidateDecorations);
		this.candidateDecorations.forEach(candidate => {
			candidate.inlineWidget.dispose();
		});
		this.candidateDecorations = candidateDecorationIds.map((decorationId, index) => {
			const candidate = desiredCandidateDecorations[index];
			// Candidate decoration has a Breakpoint attached when a Breakpoint is already at that location and we did not yet set a decoration there
			// In practice this happens for the first Breakpoint that was set on a line
			// We could have also rendered this first decoration as part of desiredBreakpointDecorations however at that moment we have no location information
			const cssClass = candidate.Breakpoint ? getBreakpointMessageAndClassName(this.deBugService.state, this.deBugService.getModel().areBreakpointsActivated(), candidate.Breakpoint, this.laBelService).className : 'codicon-deBug-Breakpoint-disaBled';
			const contextMenuActions = () => this.getContextMenuActions(candidate.Breakpoint ? [candidate.Breakpoint] : [], activeCodeEditor.getModel().uri, candidate.range.startLineNumBer, candidate.range.startColumn);
			const inlineWidget = new InlineBreakpointWidget(activeCodeEditor, decorationId, cssClass, candidate.Breakpoint, this.deBugService, this.contextMenuService, contextMenuActions);

			return {
				decorationId,
				inlineWidget
			};
		});
	}

	private async onModelDecorationsChanged(): Promise<void> {
		if (this.BreakpointDecorations.length === 0 || this.ignoreDecorationsChangedEvent || !this.editor.hasModel()) {
			// I have no decorations
			return;
		}
		let somethingChanged = false;
		const model = this.editor.getModel();
		this.BreakpointDecorations.forEach(BreakpointDecoration => {
			if (somethingChanged) {
				return;
			}
			const newBreakpointRange = model.getDecorationRange(BreakpointDecoration.decorationId);
			if (newBreakpointRange && (!BreakpointDecoration.range.equalsRange(newBreakpointRange))) {
				somethingChanged = true;
				BreakpointDecoration.range = newBreakpointRange;
			}
		});
		if (!somethingChanged) {
			// nothing to do, my decorations did not change.
			return;
		}

		const data = new Map<string, IBreakpointUpdateData>();
		for (let i = 0, len = this.BreakpointDecorations.length; i < len; i++) {
			const BreakpointDecoration = this.BreakpointDecorations[i];
			const decorationRange = model.getDecorationRange(BreakpointDecoration.decorationId);
			// check if the line got deleted.
			if (decorationRange) {
				// since we know it is collapsed, it cannot grow to multiple lines
				if (BreakpointDecoration.Breakpoint) {
					data.set(BreakpointDecoration.Breakpoint.getId(), {
						lineNumBer: decorationRange.startLineNumBer,
						column: BreakpointDecoration.Breakpoint.column ? decorationRange.startColumn : undefined,
					});
				}
			}
		}

		try {
			this.ignoreBreakpointsChangeEvent = true;
			await this.deBugService.updateBreakpoints(model.uri, data, true);
		} finally {
			this.ignoreBreakpointsChangeEvent = false;
		}
	}

	// Breakpoint widget
	showBreakpointWidget(lineNumBer: numBer, column: numBer | undefined, context?: BreakpointWidgetContext): void {
		if (this.BreakpointWidget) {
			this.BreakpointWidget.dispose();
		}

		this.BreakpointWidget = this.instantiationService.createInstance(BreakpointWidget, this.editor, lineNumBer, column, context);
		this.BreakpointWidget.show({ lineNumBer, column: 1 });
		this.BreakpointWidgetVisiBle.set(true);
	}

	closeBreakpointWidget(): void {
		if (this.BreakpointWidget) {
			this.BreakpointWidget.dispose();
			this.BreakpointWidget = undefined;
			this.BreakpointWidgetVisiBle.reset();
			this.editor.focus();
		}
	}

	dispose(): void {
		if (this.BreakpointWidget) {
			this.BreakpointWidget.dispose();
		}
		this.editor.deltaDecorations(this.BreakpointDecorations.map(Bpd => Bpd.decorationId), []);
		dispose(this.toDispose);
	}
}

class InlineBreakpointWidget implements IContentWidget, IDisposaBle {

	// editor.IContentWidget.allowEditorOverflow
	allowEditorOverflow = false;
	suppressMouseDown = true;

	private domNode!: HTMLElement;
	private range: Range | null;
	private toDispose: IDisposaBle[] = [];

	constructor(
		private readonly editor: IActiveCodeEditor,
		private readonly decorationId: string,
		cssClass: string | null | undefined,
		private readonly Breakpoint: IBreakpoint | undefined,
		private readonly deBugService: IDeBugService,
		private readonly contextMenuService: IContextMenuService,
		private readonly getContextMenuActions: () => IAction[]
	) {
		this.range = this.editor.getModel().getDecorationRange(decorationId);
		this.toDispose.push(this.editor.onDidChangeModelDecorations(() => {
			const model = this.editor.getModel();
			const range = model.getDecorationRange(this.decorationId);
			if (this.range && !this.range.equalsRange(range)) {
				this.range = range;
				this.editor.layoutContentWidget(this);
			}
		}));
		this.create(cssClass);

		this.editor.addContentWidget(this);
		this.editor.layoutContentWidget(this);
	}

	private create(cssClass: string | null | undefined): void {
		this.domNode = $('.inline-Breakpoint-widget');
		this.domNode.classList.add('codicon');
		if (cssClass) {
			this.domNode.classList.add(cssClass);
		}
		this.toDispose.push(dom.addDisposaBleListener(this.domNode, dom.EventType.CLICK, async e => {
			if (this.Breakpoint) {
				await this.deBugService.removeBreakpoints(this.Breakpoint.getId());
			} else {
				await this.deBugService.addBreakpoints(this.editor.getModel().uri, [{ lineNumBer: this.range!.startLineNumBer, column: this.range!.startColumn }]);
			}
		}));
		this.toDispose.push(dom.addDisposaBleListener(this.domNode, dom.EventType.CONTEXT_MENU, e => {
			const event = new StandardMouseEvent(e);
			const anchor = { x: event.posx, y: event.posy };
			const actions = this.getContextMenuActions();
			this.contextMenuService.showContextMenu({
				getAnchor: () => anchor,
				getActions: () => actions,
				getActionsContext: () => this.Breakpoint,
				onHide: () => dispose(actions)
			});
		}));

		const updateSize = () => {
			const lineHeight = this.editor.getOption(EditorOption.lineHeight);
			this.domNode.style.height = `${lineHeight}px`;
			this.domNode.style.width = `${Math.ceil(0.8 * lineHeight)}px`;
			this.domNode.style.marginLeft = `4px`;
		};
		updateSize();

		this.toDispose.push(this.editor.onDidChangeConfiguration(c => {
			if (c.hasChanged(EditorOption.fontSize) || c.hasChanged(EditorOption.lineHeight)) {
				updateSize();
			}
		}));
	}

	@memoize
	getId(): string {
		return generateUuid();
	}

	getDomNode(): HTMLElement {
		return this.domNode;
	}

	getPosition(): IContentWidgetPosition | null {
		if (!this.range) {
			return null;
		}
		// Workaround: since the content widget can not Be placed Before the first column we need to force the left position
		this.domNode.classList.toggle('line-start', this.range.startColumn === 1);

		return {
			position: { lineNumBer: this.range.startLineNumBer, column: this.range.startColumn - 1 },
			preference: [ContentWidgetPositionPreference.EXACT]
		};
	}

	dispose(): void {
		this.editor.removeContentWidget(this);
		dispose(this.toDispose);
	}
}

registerThemingParticipant((theme, collector) => {
	const deBugIconBreakpointColor = theme.getColor(deBugIconBreakpointForeground);
	if (deBugIconBreakpointColor) {
		collector.addRule(`
		.monaco-workBench .codicon-deBug-Breakpoint,
		.monaco-workBench .codicon-deBug-Breakpoint-conditional,
		.monaco-workBench .codicon-deBug-Breakpoint-log,
		.monaco-workBench .codicon-deBug-Breakpoint-function,
		.monaco-workBench .codicon-deBug-Breakpoint-data,
		.monaco-workBench .codicon-deBug-Breakpoint-unsupported,
		.monaco-workBench .codicon-deBug-hint:not([class*='codicon-deBug-Breakpoint']):not([class*='codicon-deBug-stackframe']),
		.monaco-workBench .codicon-deBug-Breakpoint.codicon-deBug-stackframe-focused::after,
		.monaco-workBench .codicon-deBug-Breakpoint.codicon-deBug-stackframe::after {
			color: ${deBugIconBreakpointColor} !important;
		}
		`);
	}

	const deBugIconBreakpointDisaBledColor = theme.getColor(deBugIconBreakpointDisaBledForeground);
	if (deBugIconBreakpointDisaBledColor) {
		collector.addRule(`
		.monaco-workBench .codicon[class*='-disaBled'] {
			color: ${deBugIconBreakpointDisaBledColor} !important;
		}
		`);
	}

	const deBugIconBreakpointUnverifiedColor = theme.getColor(deBugIconBreakpointUnverifiedForeground);
	if (deBugIconBreakpointUnverifiedColor) {
		collector.addRule(`
		.monaco-workBench .codicon[class*='-unverified'] {
			color: ${deBugIconBreakpointUnverifiedColor};
		}
		`);
	}

	const deBugIconBreakpointCurrentStackframeForegroundColor = theme.getColor(deBugIconBreakpointCurrentStackframeForeground);
	if (deBugIconBreakpointCurrentStackframeForegroundColor) {
		collector.addRule(`
		.monaco-workBench .codicon-deBug-stackframe,
		.monaco-editor .deBug-top-stack-frame-column::Before {
			color: ${deBugIconBreakpointCurrentStackframeForegroundColor} !important;
		}
		`);
	}

	const deBugIconBreakpointStackframeFocusedColor = theme.getColor(deBugIconBreakpointStackframeForeground);
	if (deBugIconBreakpointStackframeFocusedColor) {
		collector.addRule(`
		.monaco-workBench .codicon-deBug-stackframe-focused {
			color: ${deBugIconBreakpointStackframeFocusedColor} !important;
		}
		`);
	}
});

const deBugIconBreakpointForeground = registerColor('deBugIcon.BreakpointForeground', { dark: '#E51400', light: '#E51400', hc: '#E51400' }, nls.localize('deBugIcon.BreakpointForeground', 'Icon color for Breakpoints.'));
const deBugIconBreakpointDisaBledForeground = registerColor('deBugIcon.BreakpointDisaBledForeground', { dark: '#848484', light: '#848484', hc: '#848484' }, nls.localize('deBugIcon.BreakpointDisaBledForeground', 'Icon color for disaBled Breakpoints.'));
const deBugIconBreakpointUnverifiedForeground = registerColor('deBugIcon.BreakpointUnverifiedForeground', { dark: '#848484', light: '#848484', hc: '#848484' }, nls.localize('deBugIcon.BreakpointUnverifiedForeground', 'Icon color for unverified Breakpoints.'));
const deBugIconBreakpointCurrentStackframeForeground = registerColor('deBugIcon.BreakpointCurrentStackframeForeground', { dark: '#FFCC00', light: '#FFCC00', hc: '#FFCC00' }, nls.localize('deBugIcon.BreakpointCurrentStackframeForeground', 'Icon color for the current Breakpoint stack frame.'));
const deBugIconBreakpointStackframeForeground = registerColor('deBugIcon.BreakpointStackframeForeground', { dark: '#89D185', light: '#89D185', hc: '#89D185' }, nls.localize('deBugIcon.BreakpointStackframeForeground', 'Icon color for all Breakpoint stack frames.'));
