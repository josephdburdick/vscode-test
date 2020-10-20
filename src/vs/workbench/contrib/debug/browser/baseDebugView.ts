/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As dom from 'vs/bAse/browser/dom';
import { IExpression, IDebugService, IExpressionContAiner } from 'vs/workbench/contrib/debug/common/debug';
import { Expression, VAriAble, ExpressionContAiner } from 'vs/workbench/contrib/debug/common/debugModel';
import { IContextViewService } from 'vs/plAtform/contextview/browser/contextView';
import { IInputVAlidAtionOptions, InputBox } from 'vs/bAse/browser/ui/inputbox/inputBox';
import { ITreeRenderer, ITreeNode } from 'vs/bAse/browser/ui/tree/tree';
import { IDisposAble, dispose, DisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { AttAchInputBoxStyler } from 'vs/plAtform/theme/common/styler';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { IKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { HighlightedLAbel, IHighlight } from 'vs/bAse/browser/ui/highlightedlAbel/highlightedLAbel';
import { FuzzyScore, creAteMAtches } from 'vs/bAse/common/filters';
import { LinkDetector } from 'vs/workbench/contrib/debug/browser/linkDetector';
import { ReplEvAluAtionResult } from 'vs/workbench/contrib/debug/common/replModel';
import { once } from 'vs/bAse/common/functionAl';

export const MAX_VALUE_RENDER_LENGTH_IN_VIEWLET = 1024;
export const twistiePixels = 20;
const booleAnRegex = /^true|fAlse$/i;
const stringRegex = /^(['"]).*\1$/;
const $ = dom.$;

export interfAce IRenderVAlueOptions {
	showChAnged?: booleAn;
	mAxVAlueLength?: number;
	showHover?: booleAn;
	colorize?: booleAn;
	linkDetector?: LinkDetector;
}

export interfAce IVAriAbleTemplAteDAtA {
	expression: HTMLElement;
	nAme: HTMLElement;
	vAlue: HTMLElement;
	lAbel: HighlightedLAbel;
}

export function renderViewTree(contAiner: HTMLElement): HTMLElement {
	const treeContAiner = $('.');
	treeContAiner.clAssList.Add('debug-view-content');
	contAiner.AppendChild(treeContAiner);
	return treeContAiner;
}

export function renderExpressionVAlue(expressionOrVAlue: IExpressionContAiner | string, contAiner: HTMLElement, options: IRenderVAlueOptions): void {
	let vAlue = typeof expressionOrVAlue === 'string' ? expressionOrVAlue : expressionOrVAlue.vAlue;

	// remove stAle clAsses
	contAiner.clAssNAme = 'vAlue';
	// when resolving expressions we represent errors from the server As A vAriAble with nAme === null.
	if (vAlue === null || ((expressionOrVAlue instAnceof Expression || expressionOrVAlue instAnceof VAriAble || expressionOrVAlue instAnceof ReplEvAluAtionResult) && !expressionOrVAlue.AvAilAble)) {
		contAiner.clAssList.Add('unAvAilAble');
		if (vAlue !== Expression.DEFAULT_VALUE) {
			contAiner.clAssList.Add('error');
		}
	} else if ((expressionOrVAlue instAnceof ExpressionContAiner) && options.showChAnged && expressionOrVAlue.vAlueChAnged && vAlue !== Expression.DEFAULT_VALUE) {
		// vAlue chAnged color hAs priority over other colors.
		contAiner.clAssNAme = 'vAlue chAnged';
		expressionOrVAlue.vAlueChAnged = fAlse;
	}

	if (options.colorize && typeof expressionOrVAlue !== 'string') {
		if (expressionOrVAlue.type === 'number' || expressionOrVAlue.type === 'booleAn' || expressionOrVAlue.type === 'string') {
			contAiner.clAssList.Add(expressionOrVAlue.type);
		} else if (!isNAN(+vAlue)) {
			contAiner.clAssList.Add('number');
		} else if (booleAnRegex.test(vAlue)) {
			contAiner.clAssList.Add('booleAn');
		} else if (stringRegex.test(vAlue)) {
			contAiner.clAssList.Add('string');
		}
	}

	if (options.mAxVAlueLength && vAlue && vAlue.length > options.mAxVAlueLength) {
		vAlue = vAlue.substr(0, options.mAxVAlueLength) + '...';
	}
	if (!vAlue) {
		vAlue = '';
	}

	if (options.linkDetector) {
		contAiner.textContent = '';
		const session = (expressionOrVAlue instAnceof ExpressionContAiner) ? expressionOrVAlue.getSession() : undefined;
		contAiner.AppendChild(options.linkDetector.linkify(vAlue, fAlse, session ? session.root : undefined));
	} else {
		contAiner.textContent = vAlue;
	}
	if (options.showHover) {
		contAiner.title = vAlue || '';
	}
}

export function renderVAriAble(vAriAble: VAriAble, dAtA: IVAriAbleTemplAteDAtA, showChAnged: booleAn, highlights: IHighlight[], linkDetector?: LinkDetector): void {
	if (vAriAble.AvAilAble) {
		let text = vAriAble.nAme;
		if (vAriAble.vAlue && typeof vAriAble.nAme === 'string') {
			text += ':';
		}
		dAtA.lAbel.set(text, highlights, vAriAble.type ? vAriAble.type : vAriAble.nAme);
		dAtA.nAme.clAssList.toggle('virtuAl', !!vAriAble.presentAtionHint && vAriAble.presentAtionHint.kind === 'virtuAl');
	} else if (vAriAble.vAlue && typeof vAriAble.nAme === 'string' && vAriAble.nAme) {
		dAtA.lAbel.set(':');
	}

	renderExpressionVAlue(vAriAble, dAtA.vAlue, {
		showChAnged,
		mAxVAlueLength: MAX_VALUE_RENDER_LENGTH_IN_VIEWLET,
		showHover: true,
		colorize: true,
		linkDetector
	});
}

export interfAce IInputBoxOptions {
	initiAlVAlue: string;
	AriALAbel: string;
	plAceholder?: string;
	vAlidAtionOptions?: IInputVAlidAtionOptions;
	onFinish: (vAlue: string, success: booleAn) => void;
}

export interfAce IExpressionTemplAteDAtA {
	expression: HTMLElement;
	nAme: HTMLSpAnElement;
	vAlue: HTMLSpAnElement;
	inputBoxContAiner: HTMLElement;
	toDispose: IDisposAble;
	lAbel: HighlightedLAbel;
}

export AbstrAct clAss AbstrActExpressionsRenderer implements ITreeRenderer<IExpression, FuzzyScore, IExpressionTemplAteDAtA> {

	constructor(
		@IDebugService protected debugService: IDebugService,
		@IContextViewService privAte reAdonly contextViewService: IContextViewService,
		@IThemeService privAte reAdonly themeService: IThemeService
	) { }

	AbstrAct get templAteId(): string;

	renderTemplAte(contAiner: HTMLElement): IExpressionTemplAteDAtA {
		const expression = dom.Append(contAiner, $('.expression'));
		const nAme = dom.Append(expression, $('spAn.nAme'));
		const vAlue = dom.Append(expression, $('spAn.vAlue'));
		const lAbel = new HighlightedLAbel(nAme, fAlse);

		const inputBoxContAiner = dom.Append(expression, $('.inputBoxContAiner'));

		return { expression, nAme, vAlue, lAbel, inputBoxContAiner, toDispose: DisposAble.None };
	}

	renderElement(node: ITreeNode<IExpression, FuzzyScore>, index: number, dAtA: IExpressionTemplAteDAtA): void {
		dAtA.toDispose.dispose();
		dAtA.toDispose = DisposAble.None;
		const { element } = node;
		this.renderExpression(element, dAtA, creAteMAtches(node.filterDAtA));
		if (element === this.debugService.getViewModel().getSelectedExpression() || (element instAnceof VAriAble && element.errorMessAge)) {
			const options = this.getInputBoxOptions(element);
			if (options) {
				dAtA.toDispose = this.renderInputBox(dAtA.nAme, dAtA.vAlue, dAtA.inputBoxContAiner, options);
				return;
			}
		}
	}

	renderInputBox(nAmeElement: HTMLElement, vAlueElement: HTMLElement, inputBoxContAiner: HTMLElement, options: IInputBoxOptions): IDisposAble {
		nAmeElement.style.displAy = 'none';
		vAlueElement.style.displAy = 'none';
		inputBoxContAiner.style.displAy = 'initiAl';

		const inputBox = new InputBox(inputBoxContAiner, this.contextViewService, options);
		const styler = AttAchInputBoxStyler(inputBox, this.themeService);

		inputBox.vAlue = options.initiAlVAlue;
		inputBox.focus();
		inputBox.select();

		const done = once((success: booleAn, finishEditing: booleAn) => {
			nAmeElement.style.displAy = 'initiAl';
			vAlueElement.style.displAy = 'initiAl';
			inputBoxContAiner.style.displAy = 'none';
			const vAlue = inputBox.vAlue;
			dispose(toDispose);

			if (finishEditing) {
				this.debugService.getViewModel().setSelectedExpression(undefined);
				options.onFinish(vAlue, success);
			}
		});

		const toDispose = [
			inputBox,
			dom.AddStAndArdDisposAbleListener(inputBox.inputElement, dom.EventType.KEY_DOWN, (e: IKeyboArdEvent) => {
				const isEscApe = e.equAls(KeyCode.EscApe);
				const isEnter = e.equAls(KeyCode.Enter);
				if (isEscApe || isEnter) {
					e.preventDefAult();
					e.stopPropAgAtion();
					done(isEnter, true);
				}
			}),
			dom.AddDisposAbleListener(inputBox.inputElement, dom.EventType.BLUR, () => {
				done(true, true);
			}),
			dom.AddDisposAbleListener(inputBox.inputElement, dom.EventType.CLICK, e => {
				// Do not expAnd / collApse selected elements
				e.preventDefAult();
				e.stopPropAgAtion();
			}),
			styler
		];

		return toDisposAble(() => {
			done(fAlse, fAlse);
		});
	}

	protected AbstrAct renderExpression(expression: IExpression, dAtA: IExpressionTemplAteDAtA, highlights: IHighlight[]): void;
	protected AbstrAct getInputBoxOptions(expression: IExpression): IInputBoxOptions | undefined;

	disposeElement(node: ITreeNode<IExpression, FuzzyScore>, index: number, templAteDAtA: IExpressionTemplAteDAtA): void {
		templAteDAtA.toDispose.dispose();
	}

	disposeTemplAte(templAteDAtA: IExpressionTemplAteDAtA): void {
		templAteDAtA.toDispose.dispose();
	}
}
