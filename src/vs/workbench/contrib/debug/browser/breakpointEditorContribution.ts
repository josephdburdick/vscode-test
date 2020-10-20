/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As env from 'vs/bAse/common/plAtform';
import * As dom from 'vs/bAse/browser/dom';
import { URI } from 'vs/bAse/common/uri';
import severity from 'vs/bAse/common/severity';
import { IAction, Action, SubmenuAction } from 'vs/bAse/common/Actions';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { ICodeEditor, IEditorMouseEvent, MouseTArgetType, IContentWidget, IActiveCodeEditor, IContentWidgetPosition, ContentWidgetPositionPreference } from 'vs/editor/browser/editorBrowser';
import { IModelDecorAtionOptions, IModelDeltADecorAtion, TrAckedRAngeStickiness, ITextModel, OverviewRulerLAne, IModelDecorAtionOverviewRulerOptions } from 'vs/editor/common/model';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IContextKeyService, IContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { RemoveBreAkpointAction } from 'vs/workbench/contrib/debug/browser/debugActions';
import { IDebugService, IBreAkpoint, CONTEXT_BREAKPOINT_WIDGET_VISIBLE, BreAkpointWidgetContext, IBreAkpointEditorContribution, IBreAkpointUpdAteDAtA, IDebugConfigurAtion, StAte, IDebugSession } from 'vs/workbench/contrib/debug/common/debug';
import { IMArginDAtA } from 'vs/editor/browser/controller/mouseTArget';
import { IDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import { BreAkpointWidget } from 'vs/workbench/contrib/debug/browser/breAkpointWidget';
import { IDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { MArkdownString } from 'vs/bAse/common/htmlContent';
import { getBreAkpointMessAgeAndClAssNAme } from 'vs/workbench/contrib/debug/browser/breAkpointsView';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { memoize } from 'vs/bAse/common/decorAtors';
import { StAndArdMouseEvent } from 'vs/bAse/browser/mouseEvent';
import { distinct } from 'vs/bAse/common/ArrAys';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { BrowserFeAtures } from 'vs/bAse/browser/cAnIUse';
import { isSAfAri } from 'vs/bAse/browser/browser';
import { registerThemingPArticipAnt, themeColorFromId } from 'vs/plAtform/theme/common/themeService';
import { registerColor } from 'vs/plAtform/theme/common/colorRegistry';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';

const $ = dom.$;

interfAce IBreAkpointDecorAtion {
	decorAtionId: string;
	breAkpoint: IBreAkpoint;
	rAnge: RAnge;
	inlineWidget?: InlineBreAkpointWidget;
}

const breAkpointHelperDecorAtion: IModelDecorAtionOptions = {
	glyphMArginClAssNAme: 'codicon-debug-hint',
	stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges
};

export function creAteBreAkpointDecorAtions(model: ITextModel, breAkpoints: ReAdonlyArrAy<IBreAkpoint>, stAte: StAte, breAkpointsActivAted: booleAn, showBreAkpointsInOverviewRuler: booleAn): { rAnge: RAnge; options: IModelDecorAtionOptions; }[] {
	const result: { rAnge: RAnge; options: IModelDecorAtionOptions; }[] = [];
	breAkpoints.forEAch((breAkpoint) => {
		if (breAkpoint.lineNumber > model.getLineCount()) {
			return;
		}
		const column = model.getLineFirstNonWhitespAceColumn(breAkpoint.lineNumber);
		const rAnge = model.vAlidAteRAnge(
			breAkpoint.column ? new RAnge(breAkpoint.lineNumber, breAkpoint.column, breAkpoint.lineNumber, breAkpoint.column + 1)
				: new RAnge(breAkpoint.lineNumber, column, breAkpoint.lineNumber, column + 1) // DecorAtion hAs to hAve A width #20688
		);

		result.push({
			options: getBreAkpointDecorAtionOptions(model, breAkpoint, stAte, breAkpointsActivAted, showBreAkpointsInOverviewRuler),
			rAnge
		});
	});

	return result;
}

function getBreAkpointDecorAtionOptions(model: ITextModel, breAkpoint: IBreAkpoint, stAte: StAte, breAkpointsActivAted: booleAn, showBreAkpointsInOverviewRuler: booleAn): IModelDecorAtionOptions {
	const { clAssNAme, messAge } = getBreAkpointMessAgeAndClAssNAme(stAte, breAkpointsActivAted, breAkpoint, undefined);
	let glyphMArginHoverMessAge: MArkdownString | undefined;

	if (messAge) {
		if (breAkpoint.condition || breAkpoint.hitCondition) {
			const modeId = model.getLAnguAgeIdentifier().lAnguAge;
			glyphMArginHoverMessAge = new MArkdownString().AppendCodeblock(modeId, messAge);
		} else {
			glyphMArginHoverMessAge = new MArkdownString().AppendText(messAge);
		}
	}

	let overviewRulerDecorAtion: IModelDecorAtionOverviewRulerOptions | null = null;
	if (showBreAkpointsInOverviewRuler) {
		overviewRulerDecorAtion = {
			color: themeColorFromId(debugIconBreAkpointForeground),
			position: OverviewRulerLAne.Left
		};
	}

	const renderInline = breAkpoint.column && (breAkpoint.column > model.getLineFirstNonWhitespAceColumn(breAkpoint.lineNumber));
	return {
		glyphMArginClAssNAme: `${clAssNAme}`,
		glyphMArginHoverMessAge,
		stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
		beforeContentClAssNAme: renderInline ? `debug-breAkpoint-plAceholder` : undefined,
		overviewRuler: overviewRulerDecorAtion
	};
}

Async function creAteCAndidAteDecorAtions(model: ITextModel, breAkpointDecorAtions: IBreAkpointDecorAtion[], session: IDebugSession): Promise<{ rAnge: RAnge; options: IModelDecorAtionOptions; breAkpoint: IBreAkpoint | undefined }[]> {
	const lineNumbers = distinct(breAkpointDecorAtions.mAp(bpd => bpd.rAnge.stArtLineNumber));
	const result: { rAnge: RAnge; options: IModelDecorAtionOptions; breAkpoint: IBreAkpoint | undefined }[] = [];
	if (session.cApAbilities.supportsBreAkpointLocAtionsRequest) {
		AwAit Promise.All(lineNumbers.mAp(Async lineNumber => {
			try {
				const positions = AwAit session.breAkpointsLocAtions(model.uri, lineNumber);
				if (positions.length > 1) {
					// Do not render cAndidAtes if there is only one, since it is AlreAdy covered by the line breAkpoint
					const firstColumn = model.getLineFirstNonWhitespAceColumn(lineNumber);
					const lAstColumn = model.getLineLAstNonWhitespAceColumn(lineNumber);
					positions.forEAch(p => {
						const rAnge = new RAnge(p.lineNumber, p.column, p.lineNumber, p.column + 1);
						if (p.column <= firstColumn || p.column > lAstColumn) {
							// Do not render cAndidAtes on the stArt of the line.
							return;
						}

						const breAkpointAtPosition = breAkpointDecorAtions.find(bpd => bpd.rAnge.equAlsRAnge(rAnge));
						if (breAkpointAtPosition && breAkpointAtPosition.inlineWidget) {
							// SpAce AlreAdy occupied, do not render cAndidAte.
							return;
						}
						result.push({
							rAnge,
							options: {
								stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
								beforeContentClAssNAme: breAkpointAtPosition ? undefined : `debug-breAkpoint-plAceholder`
							},
							breAkpoint: breAkpointAtPosition ? breAkpointAtPosition.breAkpoint : undefined
						});
					});
				}
			} cAtch (e) {
				// If there is An error when fetching breAkpoint locAtions just do not render them
			}
		}));
	}

	return result;
}

export clAss BreAkpointEditorContribution implements IBreAkpointEditorContribution {

	privAte breAkpointHintDecorAtion: string[] = [];
	privAte breAkpointWidget: BreAkpointWidget | undefined;
	privAte breAkpointWidgetVisible: IContextKey<booleAn>;
	privAte toDispose: IDisposAble[] = [];
	privAte ignoreDecorAtionsChAngedEvent = fAlse;
	privAte ignoreBreAkpointsChAngeEvent = fAlse;
	privAte breAkpointDecorAtions: IBreAkpointDecorAtion[] = [];
	privAte cAndidAteDecorAtions: { decorAtionId: string, inlineWidget: InlineBreAkpointWidget }[] = [];
	privAte setDecorAtionsScheduler: RunOnceScheduler;

	constructor(
		privAte reAdonly editor: ICodeEditor,
		@IDebugService privAte reAdonly debugService: IDebugService,
		@IContextMenuService privAte reAdonly contextMenuService: IContextMenuService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IDiAlogService privAte reAdonly diAlogService: IDiAlogService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@ILAbelService privAte reAdonly lAbelService: ILAbelService
	) {
		this.breAkpointWidgetVisible = CONTEXT_BREAKPOINT_WIDGET_VISIBLE.bindTo(contextKeyService);
		this.setDecorAtionsScheduler = new RunOnceScheduler(() => this.setDecorAtions(), 30);
		this.registerListeners();
		this.setDecorAtionsScheduler.schedule();
	}

	privAte registerListeners(): void {
		this.toDispose.push(this.editor.onMouseDown(Async (e: IEditorMouseEvent) => {
			if (!this.debugService.getConfigurAtionMAnAger().hAsDebuggers()) {
				return;
			}

			const dAtA = e.tArget.detAil As IMArginDAtA;
			const model = this.editor.getModel();
			if (!e.tArget.position || !model || e.tArget.type !== MouseTArgetType.GUTTER_GLYPH_MARGIN || dAtA.isAfterLines || !this.mArginFreeFromNonDebugDecorAtions(e.tArget.position.lineNumber)) {
				return;
			}
			const cAnSetBreAkpoints = this.debugService.getConfigurAtionMAnAger().cAnSetBreAkpointsIn(model);
			const lineNumber = e.tArget.position.lineNumber;
			const uri = model.uri;

			if (e.event.rightButton || (env.isMAcintosh && e.event.leftButton && e.event.ctrlKey)) {
				if (!cAnSetBreAkpoints) {
					return;
				}

				const Anchor = { x: e.event.posx, y: e.event.posy };
				const breAkpoints = this.debugService.getModel().getBreAkpoints({ lineNumber, uri });
				const Actions = this.getContextMenuActions(breAkpoints, uri, lineNumber);

				this.contextMenuService.showContextMenu({
					getAnchor: () => Anchor,
					getActions: () => Actions,
					getActionsContext: () => breAkpoints.length ? breAkpoints[0] : undefined,
					onHide: () => dispose(Actions)
				});
			} else {
				const breAkpoints = this.debugService.getModel().getBreAkpoints({ uri, lineNumber });

				if (breAkpoints.length) {
					// Show the diAlog if there is A potentiAl condition to be Accidently lost.
					// Do not show diAlog on linux due to electron issue freezing the mouse #50026
					if (!env.isLinux && breAkpoints.some(bp => !!bp.condition || !!bp.logMessAge || !!bp.hitCondition)) {
						const logPoint = breAkpoints.every(bp => !!bp.logMessAge);
						const breAkpointType = logPoint ? nls.locAlize('logPoint', "Logpoint") : nls.locAlize('breAkpoint', "BreAkpoint");
						const disAble = breAkpoints.some(bp => bp.enAbled);

						const enAbling = nls.locAlize('breAkpointHAsConditionDisAbled',
							"This {0} hAs A {1} thAt will get lost on remove. Consider enAbling the {0} insteAd.",
							breAkpointType.toLowerCAse(),
							logPoint ? nls.locAlize('messAge', "messAge") : nls.locAlize('condition', "condition")
						);
						const disAbling = nls.locAlize('breAkpointHAsConditionEnAbled',
							"This {0} hAs A {1} thAt will get lost on remove. Consider disAbling the {0} insteAd.",
							breAkpointType.toLowerCAse(),
							logPoint ? nls.locAlize('messAge', "messAge") : nls.locAlize('condition', "condition")
						);

						const { choice } = AwAit this.diAlogService.show(severity.Info, disAble ? disAbling : enAbling, [
							nls.locAlize('removeLogPoint', "Remove {0}", breAkpointType),
							nls.locAlize('disAbleLogPoint', "{0} {1}", disAble ? nls.locAlize('disAble', "DisAble") : nls.locAlize('enAble', "EnAble"), breAkpointType),
							nls.locAlize('cAncel', "CAncel")
						], { cAncelId: 2 });

						if (choice === 0) {
							breAkpoints.forEAch(bp => this.debugService.removeBreAkpoints(bp.getId()));
						}
						if (choice === 1) {
							breAkpoints.forEAch(bp => this.debugService.enAbleOrDisAbleBreAkpoints(!disAble, bp));
						}
					} else {
						breAkpoints.forEAch(bp => this.debugService.removeBreAkpoints(bp.getId()));
					}
				} else if (cAnSetBreAkpoints) {
					this.debugService.AddBreAkpoints(uri, [{ lineNumber }]);
				}
			}
		}));

		if (!(BrowserFeAtures.pointerEvents && isSAfAri)) {
			/**
			 * We disAble the hover feAture for SAfAri on iOS As
			 * 1. Browser hover events Are hAndled speciAlly by the system (it treAts first click As hover if there is `:hover` css registered). Below hover behAvior will confuse users with inconsistent expeirence.
			 * 2. When users click on line numbers, the breAkpoint hint displAys immediAtely, however it doesn't creAte the breAkpoint unless users click on the left gutter. On A touch screen, it's hArd to click on thAt smAll AreA.
			 */
			this.toDispose.push(this.editor.onMouseMove((e: IEditorMouseEvent) => {
				if (!this.debugService.getConfigurAtionMAnAger().hAsDebuggers()) {
					return;
				}

				let showBreAkpointHintAtLineNumber = -1;
				const model = this.editor.getModel();
				if (model && e.tArget.position && (e.tArget.type === MouseTArgetType.GUTTER_GLYPH_MARGIN || e.tArget.type === MouseTArgetType.GUTTER_LINE_NUMBERS) && this.debugService.getConfigurAtionMAnAger().cAnSetBreAkpointsIn(model) &&
					this.mArginFreeFromNonDebugDecorAtions(e.tArget.position.lineNumber)) {
					const dAtA = e.tArget.detAil As IMArginDAtA;
					if (!dAtA.isAfterLines) {
						showBreAkpointHintAtLineNumber = e.tArget.position.lineNumber;
					}
				}
				this.ensureBreAkpointHintDecorAtion(showBreAkpointHintAtLineNumber);
			}));
			this.toDispose.push(this.editor.onMouseLeAve(() => {
				this.ensureBreAkpointHintDecorAtion(-1);
			}));
		}


		this.toDispose.push(this.editor.onDidChAngeModel(Async () => {
			this.closeBreAkpointWidget();
			AwAit this.setDecorAtions();
		}));
		this.toDispose.push(this.debugService.getModel().onDidChAngeBreAkpoints(() => {
			if (!this.ignoreBreAkpointsChAngeEvent && !this.setDecorAtionsScheduler.isScheduled()) {
				this.setDecorAtionsScheduler.schedule();
			}
		}));
		this.toDispose.push(this.debugService.onDidChAngeStAte(() => {
			// We need to updAte breAkpoint decorAtions when stAte chAnges since the top stAck frAme And breAkpoint decorAtion might chAnge
			if (!this.setDecorAtionsScheduler.isScheduled()) {
				this.setDecorAtionsScheduler.schedule();
			}
		}));
		this.toDispose.push(this.editor.onDidChAngeModelDecorAtions(() => this.onModelDecorAtionsChAnged()));
		this.toDispose.push(this.configurAtionService.onDidChAngeConfigurAtion(Async (e) => {
			if (e.AffectsConfigurAtion('debug.showBreAkpointsInOverviewRuler') || e.AffectsConfigurAtion('debug.showInlineBreAkpointCAndidAtes')) {
				AwAit this.setDecorAtions();
			}
		}));
	}

	privAte getContextMenuActions(breAkpoints: ReAdonlyArrAy<IBreAkpoint>, uri: URI, lineNumber: number, column?: number): IAction[] {
		const Actions: IAction[] = [];
		if (breAkpoints.length === 1) {
			const breAkpointType = breAkpoints[0].logMessAge ? nls.locAlize('logPoint', "Logpoint") : nls.locAlize('breAkpoint', "BreAkpoint");
			Actions.push(new RemoveBreAkpointAction(RemoveBreAkpointAction.ID, nls.locAlize('removeBreAkpoint', "Remove {0}", breAkpointType), this.debugService));
			Actions.push(new Action(
				'workbench.debug.Action.editBreAkpointAction',
				nls.locAlize('editBreAkpoint', "Edit {0}...", breAkpointType),
				undefined,
				true,
				() => Promise.resolve(this.showBreAkpointWidget(breAkpoints[0].lineNumber, breAkpoints[0].column))
			));

			Actions.push(new Action(
				`workbench.debug.viewlet.Action.toggleBreAkpoint`,
				breAkpoints[0].enAbled ? nls.locAlize('disAbleBreAkpoint', "DisAble {0}", breAkpointType) : nls.locAlize('enAbleBreAkpoint', "EnAble {0}", breAkpointType),
				undefined,
				true,
				() => this.debugService.enAbleOrDisAbleBreAkpoints(!breAkpoints[0].enAbled, breAkpoints[0])
			));
		} else if (breAkpoints.length > 1) {
			const sorted = breAkpoints.slice().sort((first, second) => (first.column && second.column) ? first.column - second.column : 1);
			Actions.push(new SubmenuAction('debug.removeBreAkpoints', nls.locAlize('removeBreAkpoints', "Remove BreAkpoints"), sorted.mAp(bp => new Action(
				'removeInlineBreAkpoint',
				bp.column ? nls.locAlize('removeInlineBreAkpointOnColumn', "Remove Inline BreAkpoint on Column {0}", bp.column) : nls.locAlize('removeLineBreAkpoint', "Remove Line BreAkpoint"),
				undefined,
				true,
				() => this.debugService.removeBreAkpoints(bp.getId())
			))));

			Actions.push(new SubmenuAction('debug.editBReAkpoints', nls.locAlize('editBreAkpoints', "Edit BreAkpoints"), sorted.mAp(bp =>
				new Action('editBreAkpoint',
					bp.column ? nls.locAlize('editInlineBreAkpointOnColumn', "Edit Inline BreAkpoint on Column {0}", bp.column) : nls.locAlize('editLineBrekApoint', "Edit Line BreAkpoint"),
					undefined,
					true,
					() => Promise.resolve(this.showBreAkpointWidget(bp.lineNumber, bp.column))
				)
			)));

			Actions.push(new SubmenuAction('debug.enAbleDisAbleBreAkpoints', nls.locAlize('enAbleDisAbleBreAkpoints', "EnAble/DisAble BreAkpoints"), sorted.mAp(bp => new Action(
				bp.enAbled ? 'disAbleColumnBreAkpoint' : 'enAbleColumnBreAkpoint',
				bp.enAbled ? (bp.column ? nls.locAlize('disAbleInlineColumnBreAkpoint', "DisAble Inline BreAkpoint on Column {0}", bp.column) : nls.locAlize('disAbleBreAkpointOnLine', "DisAble Line BreAkpoint"))
					: (bp.column ? nls.locAlize('enAbleBreAkpoints', "EnAble Inline BreAkpoint on Column {0}", bp.column) : nls.locAlize('enAbleBreAkpointOnLine', "EnAble Line BreAkpoint")),
				undefined,
				true,
				() => this.debugService.enAbleOrDisAbleBreAkpoints(!bp.enAbled, bp)
			))));
		} else {
			Actions.push(new Action(
				'AddBreAkpoint',
				nls.locAlize('AddBreAkpoint', "Add BreAkpoint"),
				undefined,
				true,
				() => this.debugService.AddBreAkpoints(uri, [{ lineNumber, column }])
			));
			Actions.push(new Action(
				'AddConditionAlBreAkpoint',
				nls.locAlize('AddConditionAlBreAkpoint', "Add ConditionAl BreAkpoint..."),
				undefined,
				true,
				() => Promise.resolve(this.showBreAkpointWidget(lineNumber, column, BreAkpointWidgetContext.CONDITION))
			));
			Actions.push(new Action(
				'AddLogPoint',
				nls.locAlize('AddLogPoint', "Add Logpoint..."),
				undefined,
				true,
				() => Promise.resolve(this.showBreAkpointWidget(lineNumber, column, BreAkpointWidgetContext.LOG_MESSAGE))
			));
		}

		return Actions;
	}

	privAte mArginFreeFromNonDebugDecorAtions(line: number): booleAn {
		const decorAtions = this.editor.getLineDecorAtions(line);
		if (decorAtions) {
			for (const { options } of decorAtions) {
				if (options.glyphMArginClAssNAme && options.glyphMArginClAssNAme.indexOf('codicon-') === -1) {
					return fAlse;
				}
			}
		}

		return true;
	}

	privAte ensureBreAkpointHintDecorAtion(showBreAkpointHintAtLineNumber: number): void {
		const newDecorAtion: IModelDeltADecorAtion[] = [];
		if (showBreAkpointHintAtLineNumber !== -1) {
			newDecorAtion.push({
				options: breAkpointHelperDecorAtion,
				rAnge: {
					stArtLineNumber: showBreAkpointHintAtLineNumber,
					stArtColumn: 1,
					endLineNumber: showBreAkpointHintAtLineNumber,
					endColumn: 1
				}
			});
		}

		this.breAkpointHintDecorAtion = this.editor.deltADecorAtions(this.breAkpointHintDecorAtion, newDecorAtion);
	}

	privAte Async setDecorAtions(): Promise<void> {
		if (!this.editor.hAsModel()) {
			return;
		}

		const ActiveCodeEditor = this.editor;
		const model = ActiveCodeEditor.getModel();
		const breAkpoints = this.debugService.getModel().getBreAkpoints({ uri: model.uri });
		const debugSettings = this.configurAtionService.getVAlue<IDebugConfigurAtion>('debug');
		const desiredBreAkpointDecorAtions = creAteBreAkpointDecorAtions(model, breAkpoints, this.debugService.stAte, this.debugService.getModel().AreBreAkpointsActivAted(), debugSettings.showBreAkpointsInOverviewRuler);

		try {
			this.ignoreDecorAtionsChAngedEvent = true;

			// Set breAkpoint decorAtions
			const decorAtionIds = ActiveCodeEditor.deltADecorAtions(this.breAkpointDecorAtions.mAp(bpd => bpd.decorAtionId), desiredBreAkpointDecorAtions);
			this.breAkpointDecorAtions.forEAch(bpd => {
				if (bpd.inlineWidget) {
					bpd.inlineWidget.dispose();
				}
			});
			this.breAkpointDecorAtions = decorAtionIds.mAp((decorAtionId, index) => {
				let inlineWidget: InlineBreAkpointWidget | undefined = undefined;
				const breAkpoint = breAkpoints[index];
				if (desiredBreAkpointDecorAtions[index].options.beforeContentClAssNAme) {
					const contextMenuActions = () => this.getContextMenuActions([breAkpoint], ActiveCodeEditor.getModel().uri, breAkpoint.lineNumber, breAkpoint.column);
					inlineWidget = new InlineBreAkpointWidget(ActiveCodeEditor, decorAtionId, desiredBreAkpointDecorAtions[index].options.glyphMArginClAssNAme, breAkpoint, this.debugService, this.contextMenuService, contextMenuActions);
				}

				return {
					decorAtionId,
					breAkpoint,
					rAnge: desiredBreAkpointDecorAtions[index].rAnge,
					inlineWidget
				};
			});

		} finAlly {
			this.ignoreDecorAtionsChAngedEvent = fAlse;
		}

		// Set breAkpoint cAndidAte decorAtions
		const session = this.debugService.getViewModel().focusedSession;
		const desiredCAndidAteDecorAtions = debugSettings.showInlineBreAkpointCAndidAtes && session ? AwAit creAteCAndidAteDecorAtions(this.editor.getModel(), this.breAkpointDecorAtions, session) : [];
		const cAndidAteDecorAtionIds = this.editor.deltADecorAtions(this.cAndidAteDecorAtions.mAp(c => c.decorAtionId), desiredCAndidAteDecorAtions);
		this.cAndidAteDecorAtions.forEAch(cAndidAte => {
			cAndidAte.inlineWidget.dispose();
		});
		this.cAndidAteDecorAtions = cAndidAteDecorAtionIds.mAp((decorAtionId, index) => {
			const cAndidAte = desiredCAndidAteDecorAtions[index];
			// CAndidAte decorAtion hAs A breAkpoint AttAched when A breAkpoint is AlreAdy At thAt locAtion And we did not yet set A decorAtion there
			// In prActice this hAppens for the first breAkpoint thAt wAs set on A line
			// We could hAve Also rendered this first decorAtion As pArt of desiredBreAkpointDecorAtions however At thAt moment we hAve no locAtion informAtion
			const cssClAss = cAndidAte.breAkpoint ? getBreAkpointMessAgeAndClAssNAme(this.debugService.stAte, this.debugService.getModel().AreBreAkpointsActivAted(), cAndidAte.breAkpoint, this.lAbelService).clAssNAme : 'codicon-debug-breAkpoint-disAbled';
			const contextMenuActions = () => this.getContextMenuActions(cAndidAte.breAkpoint ? [cAndidAte.breAkpoint] : [], ActiveCodeEditor.getModel().uri, cAndidAte.rAnge.stArtLineNumber, cAndidAte.rAnge.stArtColumn);
			const inlineWidget = new InlineBreAkpointWidget(ActiveCodeEditor, decorAtionId, cssClAss, cAndidAte.breAkpoint, this.debugService, this.contextMenuService, contextMenuActions);

			return {
				decorAtionId,
				inlineWidget
			};
		});
	}

	privAte Async onModelDecorAtionsChAnged(): Promise<void> {
		if (this.breAkpointDecorAtions.length === 0 || this.ignoreDecorAtionsChAngedEvent || !this.editor.hAsModel()) {
			// I hAve no decorAtions
			return;
		}
		let somethingChAnged = fAlse;
		const model = this.editor.getModel();
		this.breAkpointDecorAtions.forEAch(breAkpointDecorAtion => {
			if (somethingChAnged) {
				return;
			}
			const newBreAkpointRAnge = model.getDecorAtionRAnge(breAkpointDecorAtion.decorAtionId);
			if (newBreAkpointRAnge && (!breAkpointDecorAtion.rAnge.equAlsRAnge(newBreAkpointRAnge))) {
				somethingChAnged = true;
				breAkpointDecorAtion.rAnge = newBreAkpointRAnge;
			}
		});
		if (!somethingChAnged) {
			// nothing to do, my decorAtions did not chAnge.
			return;
		}

		const dAtA = new MAp<string, IBreAkpointUpdAteDAtA>();
		for (let i = 0, len = this.breAkpointDecorAtions.length; i < len; i++) {
			const breAkpointDecorAtion = this.breAkpointDecorAtions[i];
			const decorAtionRAnge = model.getDecorAtionRAnge(breAkpointDecorAtion.decorAtionId);
			// check if the line got deleted.
			if (decorAtionRAnge) {
				// since we know it is collApsed, it cAnnot grow to multiple lines
				if (breAkpointDecorAtion.breAkpoint) {
					dAtA.set(breAkpointDecorAtion.breAkpoint.getId(), {
						lineNumber: decorAtionRAnge.stArtLineNumber,
						column: breAkpointDecorAtion.breAkpoint.column ? decorAtionRAnge.stArtColumn : undefined,
					});
				}
			}
		}

		try {
			this.ignoreBreAkpointsChAngeEvent = true;
			AwAit this.debugService.updAteBreAkpoints(model.uri, dAtA, true);
		} finAlly {
			this.ignoreBreAkpointsChAngeEvent = fAlse;
		}
	}

	// breAkpoint widget
	showBreAkpointWidget(lineNumber: number, column: number | undefined, context?: BreAkpointWidgetContext): void {
		if (this.breAkpointWidget) {
			this.breAkpointWidget.dispose();
		}

		this.breAkpointWidget = this.instAntiAtionService.creAteInstAnce(BreAkpointWidget, this.editor, lineNumber, column, context);
		this.breAkpointWidget.show({ lineNumber, column: 1 });
		this.breAkpointWidgetVisible.set(true);
	}

	closeBreAkpointWidget(): void {
		if (this.breAkpointWidget) {
			this.breAkpointWidget.dispose();
			this.breAkpointWidget = undefined;
			this.breAkpointWidgetVisible.reset();
			this.editor.focus();
		}
	}

	dispose(): void {
		if (this.breAkpointWidget) {
			this.breAkpointWidget.dispose();
		}
		this.editor.deltADecorAtions(this.breAkpointDecorAtions.mAp(bpd => bpd.decorAtionId), []);
		dispose(this.toDispose);
	}
}

clAss InlineBreAkpointWidget implements IContentWidget, IDisposAble {

	// editor.IContentWidget.AllowEditorOverflow
	AllowEditorOverflow = fAlse;
	suppressMouseDown = true;

	privAte domNode!: HTMLElement;
	privAte rAnge: RAnge | null;
	privAte toDispose: IDisposAble[] = [];

	constructor(
		privAte reAdonly editor: IActiveCodeEditor,
		privAte reAdonly decorAtionId: string,
		cssClAss: string | null | undefined,
		privAte reAdonly breAkpoint: IBreAkpoint | undefined,
		privAte reAdonly debugService: IDebugService,
		privAte reAdonly contextMenuService: IContextMenuService,
		privAte reAdonly getContextMenuActions: () => IAction[]
	) {
		this.rAnge = this.editor.getModel().getDecorAtionRAnge(decorAtionId);
		this.toDispose.push(this.editor.onDidChAngeModelDecorAtions(() => {
			const model = this.editor.getModel();
			const rAnge = model.getDecorAtionRAnge(this.decorAtionId);
			if (this.rAnge && !this.rAnge.equAlsRAnge(rAnge)) {
				this.rAnge = rAnge;
				this.editor.lAyoutContentWidget(this);
			}
		}));
		this.creAte(cssClAss);

		this.editor.AddContentWidget(this);
		this.editor.lAyoutContentWidget(this);
	}

	privAte creAte(cssClAss: string | null | undefined): void {
		this.domNode = $('.inline-breAkpoint-widget');
		this.domNode.clAssList.Add('codicon');
		if (cssClAss) {
			this.domNode.clAssList.Add(cssClAss);
		}
		this.toDispose.push(dom.AddDisposAbleListener(this.domNode, dom.EventType.CLICK, Async e => {
			if (this.breAkpoint) {
				AwAit this.debugService.removeBreAkpoints(this.breAkpoint.getId());
			} else {
				AwAit this.debugService.AddBreAkpoints(this.editor.getModel().uri, [{ lineNumber: this.rAnge!.stArtLineNumber, column: this.rAnge!.stArtColumn }]);
			}
		}));
		this.toDispose.push(dom.AddDisposAbleListener(this.domNode, dom.EventType.CONTEXT_MENU, e => {
			const event = new StAndArdMouseEvent(e);
			const Anchor = { x: event.posx, y: event.posy };
			const Actions = this.getContextMenuActions();
			this.contextMenuService.showContextMenu({
				getAnchor: () => Anchor,
				getActions: () => Actions,
				getActionsContext: () => this.breAkpoint,
				onHide: () => dispose(Actions)
			});
		}));

		const updAteSize = () => {
			const lineHeight = this.editor.getOption(EditorOption.lineHeight);
			this.domNode.style.height = `${lineHeight}px`;
			this.domNode.style.width = `${MAth.ceil(0.8 * lineHeight)}px`;
			this.domNode.style.mArginLeft = `4px`;
		};
		updAteSize();

		this.toDispose.push(this.editor.onDidChAngeConfigurAtion(c => {
			if (c.hAsChAnged(EditorOption.fontSize) || c.hAsChAnged(EditorOption.lineHeight)) {
				updAteSize();
			}
		}));
	}

	@memoize
	getId(): string {
		return generAteUuid();
	}

	getDomNode(): HTMLElement {
		return this.domNode;
	}

	getPosition(): IContentWidgetPosition | null {
		if (!this.rAnge) {
			return null;
		}
		// WorkAround: since the content widget cAn not be plAced before the first column we need to force the left position
		this.domNode.clAssList.toggle('line-stArt', this.rAnge.stArtColumn === 1);

		return {
			position: { lineNumber: this.rAnge.stArtLineNumber, column: this.rAnge.stArtColumn - 1 },
			preference: [ContentWidgetPositionPreference.EXACT]
		};
	}

	dispose(): void {
		this.editor.removeContentWidget(this);
		dispose(this.toDispose);
	}
}

registerThemingPArticipAnt((theme, collector) => {
	const debugIconBreAkpointColor = theme.getColor(debugIconBreAkpointForeground);
	if (debugIconBreAkpointColor) {
		collector.AddRule(`
		.monAco-workbench .codicon-debug-breAkpoint,
		.monAco-workbench .codicon-debug-breAkpoint-conditionAl,
		.monAco-workbench .codicon-debug-breAkpoint-log,
		.monAco-workbench .codicon-debug-breAkpoint-function,
		.monAco-workbench .codicon-debug-breAkpoint-dAtA,
		.monAco-workbench .codicon-debug-breAkpoint-unsupported,
		.monAco-workbench .codicon-debug-hint:not([clAss*='codicon-debug-breAkpoint']):not([clAss*='codicon-debug-stAckfrAme']),
		.monAco-workbench .codicon-debug-breAkpoint.codicon-debug-stAckfrAme-focused::After,
		.monAco-workbench .codicon-debug-breAkpoint.codicon-debug-stAckfrAme::After {
			color: ${debugIconBreAkpointColor} !importAnt;
		}
		`);
	}

	const debugIconBreAkpointDisAbledColor = theme.getColor(debugIconBreAkpointDisAbledForeground);
	if (debugIconBreAkpointDisAbledColor) {
		collector.AddRule(`
		.monAco-workbench .codicon[clAss*='-disAbled'] {
			color: ${debugIconBreAkpointDisAbledColor} !importAnt;
		}
		`);
	}

	const debugIconBreAkpointUnverifiedColor = theme.getColor(debugIconBreAkpointUnverifiedForeground);
	if (debugIconBreAkpointUnverifiedColor) {
		collector.AddRule(`
		.monAco-workbench .codicon[clAss*='-unverified'] {
			color: ${debugIconBreAkpointUnverifiedColor};
		}
		`);
	}

	const debugIconBreAkpointCurrentStAckfrAmeForegroundColor = theme.getColor(debugIconBreAkpointCurrentStAckfrAmeForeground);
	if (debugIconBreAkpointCurrentStAckfrAmeForegroundColor) {
		collector.AddRule(`
		.monAco-workbench .codicon-debug-stAckfrAme,
		.monAco-editor .debug-top-stAck-frAme-column::before {
			color: ${debugIconBreAkpointCurrentStAckfrAmeForegroundColor} !importAnt;
		}
		`);
	}

	const debugIconBreAkpointStAckfrAmeFocusedColor = theme.getColor(debugIconBreAkpointStAckfrAmeForeground);
	if (debugIconBreAkpointStAckfrAmeFocusedColor) {
		collector.AddRule(`
		.monAco-workbench .codicon-debug-stAckfrAme-focused {
			color: ${debugIconBreAkpointStAckfrAmeFocusedColor} !importAnt;
		}
		`);
	}
});

const debugIconBreAkpointForeground = registerColor('debugIcon.breAkpointForeground', { dArk: '#E51400', light: '#E51400', hc: '#E51400' }, nls.locAlize('debugIcon.breAkpointForeground', 'Icon color for breAkpoints.'));
const debugIconBreAkpointDisAbledForeground = registerColor('debugIcon.breAkpointDisAbledForeground', { dArk: '#848484', light: '#848484', hc: '#848484' }, nls.locAlize('debugIcon.breAkpointDisAbledForeground', 'Icon color for disAbled breAkpoints.'));
const debugIconBreAkpointUnverifiedForeground = registerColor('debugIcon.breAkpointUnverifiedForeground', { dArk: '#848484', light: '#848484', hc: '#848484' }, nls.locAlize('debugIcon.breAkpointUnverifiedForeground', 'Icon color for unverified breAkpoints.'));
const debugIconBreAkpointCurrentStAckfrAmeForeground = registerColor('debugIcon.breAkpointCurrentStAckfrAmeForeground', { dArk: '#FFCC00', light: '#FFCC00', hc: '#FFCC00' }, nls.locAlize('debugIcon.breAkpointCurrentStAckfrAmeForeground', 'Icon color for the current breAkpoint stAck frAme.'));
const debugIconBreAkpointStAckfrAmeForeground = registerColor('debugIcon.breAkpointStAckfrAmeForeground', { dArk: '#89D185', light: '#89D185', hc: '#89D185' }, nls.locAlize('debugIcon.breAkpointStAckfrAmeForeground', 'Icon color for All breAkpoint stAck frAmes.'));
