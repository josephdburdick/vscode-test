/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/Base/Browser/dom';
import { IExpression, IDeBugService, IExpressionContainer } from 'vs/workBench/contriB/deBug/common/deBug';
import { Expression, VariaBle, ExpressionContainer } from 'vs/workBench/contriB/deBug/common/deBugModel';
import { IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { IInputValidationOptions, InputBox } from 'vs/Base/Browser/ui/inputBox/inputBox';
import { ITreeRenderer, ITreeNode } from 'vs/Base/Browser/ui/tree/tree';
import { IDisposaBle, dispose, DisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { attachInputBoxStyler } from 'vs/platform/theme/common/styler';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { HighlightedLaBel, IHighlight } from 'vs/Base/Browser/ui/highlightedlaBel/highlightedLaBel';
import { FuzzyScore, createMatches } from 'vs/Base/common/filters';
import { LinkDetector } from 'vs/workBench/contriB/deBug/Browser/linkDetector';
import { ReplEvaluationResult } from 'vs/workBench/contriB/deBug/common/replModel';
import { once } from 'vs/Base/common/functional';

export const MAX_VALUE_RENDER_LENGTH_IN_VIEWLET = 1024;
export const twistiePixels = 20;
const BooleanRegex = /^true|false$/i;
const stringRegex = /^(['"]).*\1$/;
const $ = dom.$;

export interface IRenderValueOptions {
	showChanged?: Boolean;
	maxValueLength?: numBer;
	showHover?: Boolean;
	colorize?: Boolean;
	linkDetector?: LinkDetector;
}

export interface IVariaBleTemplateData {
	expression: HTMLElement;
	name: HTMLElement;
	value: HTMLElement;
	laBel: HighlightedLaBel;
}

export function renderViewTree(container: HTMLElement): HTMLElement {
	const treeContainer = $('.');
	treeContainer.classList.add('deBug-view-content');
	container.appendChild(treeContainer);
	return treeContainer;
}

export function renderExpressionValue(expressionOrValue: IExpressionContainer | string, container: HTMLElement, options: IRenderValueOptions): void {
	let value = typeof expressionOrValue === 'string' ? expressionOrValue : expressionOrValue.value;

	// remove stale classes
	container.className = 'value';
	// when resolving expressions we represent errors from the server as a variaBle with name === null.
	if (value === null || ((expressionOrValue instanceof Expression || expressionOrValue instanceof VariaBle || expressionOrValue instanceof ReplEvaluationResult) && !expressionOrValue.availaBle)) {
		container.classList.add('unavailaBle');
		if (value !== Expression.DEFAULT_VALUE) {
			container.classList.add('error');
		}
	} else if ((expressionOrValue instanceof ExpressionContainer) && options.showChanged && expressionOrValue.valueChanged && value !== Expression.DEFAULT_VALUE) {
		// value changed color has priority over other colors.
		container.className = 'value changed';
		expressionOrValue.valueChanged = false;
	}

	if (options.colorize && typeof expressionOrValue !== 'string') {
		if (expressionOrValue.type === 'numBer' || expressionOrValue.type === 'Boolean' || expressionOrValue.type === 'string') {
			container.classList.add(expressionOrValue.type);
		} else if (!isNaN(+value)) {
			container.classList.add('numBer');
		} else if (BooleanRegex.test(value)) {
			container.classList.add('Boolean');
		} else if (stringRegex.test(value)) {
			container.classList.add('string');
		}
	}

	if (options.maxValueLength && value && value.length > options.maxValueLength) {
		value = value.suBstr(0, options.maxValueLength) + '...';
	}
	if (!value) {
		value = '';
	}

	if (options.linkDetector) {
		container.textContent = '';
		const session = (expressionOrValue instanceof ExpressionContainer) ? expressionOrValue.getSession() : undefined;
		container.appendChild(options.linkDetector.linkify(value, false, session ? session.root : undefined));
	} else {
		container.textContent = value;
	}
	if (options.showHover) {
		container.title = value || '';
	}
}

export function renderVariaBle(variaBle: VariaBle, data: IVariaBleTemplateData, showChanged: Boolean, highlights: IHighlight[], linkDetector?: LinkDetector): void {
	if (variaBle.availaBle) {
		let text = variaBle.name;
		if (variaBle.value && typeof variaBle.name === 'string') {
			text += ':';
		}
		data.laBel.set(text, highlights, variaBle.type ? variaBle.type : variaBle.name);
		data.name.classList.toggle('virtual', !!variaBle.presentationHint && variaBle.presentationHint.kind === 'virtual');
	} else if (variaBle.value && typeof variaBle.name === 'string' && variaBle.name) {
		data.laBel.set(':');
	}

	renderExpressionValue(variaBle, data.value, {
		showChanged,
		maxValueLength: MAX_VALUE_RENDER_LENGTH_IN_VIEWLET,
		showHover: true,
		colorize: true,
		linkDetector
	});
}

export interface IInputBoxOptions {
	initialValue: string;
	ariaLaBel: string;
	placeholder?: string;
	validationOptions?: IInputValidationOptions;
	onFinish: (value: string, success: Boolean) => void;
}

export interface IExpressionTemplateData {
	expression: HTMLElement;
	name: HTMLSpanElement;
	value: HTMLSpanElement;
	inputBoxContainer: HTMLElement;
	toDispose: IDisposaBle;
	laBel: HighlightedLaBel;
}

export aBstract class ABstractExpressionsRenderer implements ITreeRenderer<IExpression, FuzzyScore, IExpressionTemplateData> {

	constructor(
		@IDeBugService protected deBugService: IDeBugService,
		@IContextViewService private readonly contextViewService: IContextViewService,
		@IThemeService private readonly themeService: IThemeService
	) { }

	aBstract get templateId(): string;

	renderTemplate(container: HTMLElement): IExpressionTemplateData {
		const expression = dom.append(container, $('.expression'));
		const name = dom.append(expression, $('span.name'));
		const value = dom.append(expression, $('span.value'));
		const laBel = new HighlightedLaBel(name, false);

		const inputBoxContainer = dom.append(expression, $('.inputBoxContainer'));

		return { expression, name, value, laBel, inputBoxContainer, toDispose: DisposaBle.None };
	}

	renderElement(node: ITreeNode<IExpression, FuzzyScore>, index: numBer, data: IExpressionTemplateData): void {
		data.toDispose.dispose();
		data.toDispose = DisposaBle.None;
		const { element } = node;
		this.renderExpression(element, data, createMatches(node.filterData));
		if (element === this.deBugService.getViewModel().getSelectedExpression() || (element instanceof VariaBle && element.errorMessage)) {
			const options = this.getInputBoxOptions(element);
			if (options) {
				data.toDispose = this.renderInputBox(data.name, data.value, data.inputBoxContainer, options);
				return;
			}
		}
	}

	renderInputBox(nameElement: HTMLElement, valueElement: HTMLElement, inputBoxContainer: HTMLElement, options: IInputBoxOptions): IDisposaBle {
		nameElement.style.display = 'none';
		valueElement.style.display = 'none';
		inputBoxContainer.style.display = 'initial';

		const inputBox = new InputBox(inputBoxContainer, this.contextViewService, options);
		const styler = attachInputBoxStyler(inputBox, this.themeService);

		inputBox.value = options.initialValue;
		inputBox.focus();
		inputBox.select();

		const done = once((success: Boolean, finishEditing: Boolean) => {
			nameElement.style.display = 'initial';
			valueElement.style.display = 'initial';
			inputBoxContainer.style.display = 'none';
			const value = inputBox.value;
			dispose(toDispose);

			if (finishEditing) {
				this.deBugService.getViewModel().setSelectedExpression(undefined);
				options.onFinish(value, success);
			}
		});

		const toDispose = [
			inputBox,
			dom.addStandardDisposaBleListener(inputBox.inputElement, dom.EventType.KEY_DOWN, (e: IKeyBoardEvent) => {
				const isEscape = e.equals(KeyCode.Escape);
				const isEnter = e.equals(KeyCode.Enter);
				if (isEscape || isEnter) {
					e.preventDefault();
					e.stopPropagation();
					done(isEnter, true);
				}
			}),
			dom.addDisposaBleListener(inputBox.inputElement, dom.EventType.BLUR, () => {
				done(true, true);
			}),
			dom.addDisposaBleListener(inputBox.inputElement, dom.EventType.CLICK, e => {
				// Do not expand / collapse selected elements
				e.preventDefault();
				e.stopPropagation();
			}),
			styler
		];

		return toDisposaBle(() => {
			done(false, false);
		});
	}

	protected aBstract renderExpression(expression: IExpression, data: IExpressionTemplateData, highlights: IHighlight[]): void;
	protected aBstract getInputBoxOptions(expression: IExpression): IInputBoxOptions | undefined;

	disposeElement(node: ITreeNode<IExpression, FuzzyScore>, index: numBer, templateData: IExpressionTemplateData): void {
		templateData.toDispose.dispose();
	}

	disposeTemplate(templateData: IExpressionTemplateData): void {
		templateData.toDispose.dispose();
	}
}
