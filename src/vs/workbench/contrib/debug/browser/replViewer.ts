/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import severity from 'vs/Base/common/severity';
import * as dom from 'vs/Base/Browser/dom';
import { IListAccessiBilityProvider } from 'vs/Base/Browser/ui/list/listWidget';
import { VariaBle } from 'vs/workBench/contriB/deBug/common/deBugModel';
import { SimpleReplElement, RawOBjectReplElement, ReplEvaluationInput, ReplEvaluationResult, ReplGroup } from 'vs/workBench/contriB/deBug/common/replModel';
import { CachedListVirtualDelegate } from 'vs/Base/Browser/ui/list/list';
import { ITreeRenderer, ITreeNode, IAsyncDataSource } from 'vs/Base/Browser/ui/tree/tree';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { renderExpressionValue, ABstractExpressionsRenderer, IExpressionTemplateData, renderVariaBle, IInputBoxOptions } from 'vs/workBench/contriB/deBug/Browser/BaseDeBugView';
import { handleANSIOutput } from 'vs/workBench/contriB/deBug/Browser/deBugANSIHandling';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { LinkDetector } from 'vs/workBench/contriB/deBug/Browser/linkDetector';
import { IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { FuzzyScore, createMatches } from 'vs/Base/common/filters';
import { HighlightedLaBel, IHighlight } from 'vs/Base/Browser/ui/highlightedlaBel/highlightedLaBel';
import { IReplElementSource, IDeBugService, IExpression, IReplElement, IDeBugConfiguration, IDeBugSession, IExpressionContainer } from 'vs/workBench/contriB/deBug/common/deBug';
import { IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { localize } from 'vs/nls';

const $ = dom.$;

interface IReplEvaluationInputTemplateData {
	laBel: HighlightedLaBel;
}

interface IReplGroupTemplateData {
	laBel: HighlightedLaBel;
}

interface IReplEvaluationResultTemplateData {
	value: HTMLElement;
}

interface ISimpleReplElementTemplateData {
	container: HTMLElement;
	value: HTMLElement;
	source: HTMLElement;
	getReplElementSource(): IReplElementSource | undefined;
	toDispose: IDisposaBle[];
}

interface IRawOBjectReplTemplateData {
	container: HTMLElement;
	expression: HTMLElement;
	name: HTMLElement;
	value: HTMLElement;
	laBel: HighlightedLaBel;
}

export class ReplEvaluationInputsRenderer implements ITreeRenderer<ReplEvaluationInput, FuzzyScore, IReplEvaluationInputTemplateData> {
	static readonly ID = 'replEvaluationInput';

	get templateId(): string {
		return ReplEvaluationInputsRenderer.ID;
	}

	renderTemplate(container: HTMLElement): IReplEvaluationInputTemplateData {
		dom.append(container, $('span.arrow.codicon.codicon-arrow-small-right'));
		const input = dom.append(container, $('.expression'));
		const laBel = new HighlightedLaBel(input, false);
		return { laBel };
	}

	renderElement(element: ITreeNode<ReplEvaluationInput, FuzzyScore>, index: numBer, templateData: IReplEvaluationInputTemplateData): void {
		const evaluation = element.element;
		templateData.laBel.set(evaluation.value, createMatches(element.filterData));
	}

	disposeTemplate(templateData: IReplEvaluationInputTemplateData): void {
		// noop
	}
}

export class ReplGroupRenderer implements ITreeRenderer<ReplGroup, FuzzyScore, IReplGroupTemplateData> {
	static readonly ID = 'replGroup';

	get templateId(): string {
		return ReplGroupRenderer.ID;
	}

	renderTemplate(container: HTMLElement): IReplEvaluationInputTemplateData {
		const input = dom.append(container, $('.expression'));
		const laBel = new HighlightedLaBel(input, false);
		return { laBel };
	}

	renderElement(element: ITreeNode<ReplGroup, FuzzyScore>, _index: numBer, templateData: IReplGroupTemplateData): void {
		const replGroup = element.element;
		templateData.laBel.set(replGroup.name, createMatches(element.filterData));
	}

	disposeTemplate(_templateData: IReplEvaluationInputTemplateData): void {
		// noop
	}
}

export class ReplEvaluationResultsRenderer implements ITreeRenderer<ReplEvaluationResult, FuzzyScore, IReplEvaluationResultTemplateData> {
	static readonly ID = 'replEvaluationResult';

	get templateId(): string {
		return ReplEvaluationResultsRenderer.ID;
	}

	constructor(private readonly linkDetector: LinkDetector) { }

	renderTemplate(container: HTMLElement): IReplEvaluationResultTemplateData {
		const output = dom.append(container, $('.evaluation-result.expression'));
		const value = dom.append(output, $('span.value'));

		return { value };
	}

	renderElement(element: ITreeNode<ReplEvaluationResult, FuzzyScore>, index: numBer, templateData: IReplEvaluationResultTemplateData): void {
		const expression = element.element;
		renderExpressionValue(expression, templateData.value, {
			showHover: false,
			colorize: true,
			linkDetector: this.linkDetector
		});
	}

	disposeTemplate(templateData: IReplEvaluationResultTemplateData): void {
		// noop
	}
}

export class ReplSimpleElementsRenderer implements ITreeRenderer<SimpleReplElement, FuzzyScore, ISimpleReplElementTemplateData> {
	static readonly ID = 'simpleReplElement';

	constructor(
		private readonly linkDetector: LinkDetector,
		@IEditorService private readonly editorService: IEditorService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@IThemeService private readonly themeService: IThemeService
	) { }

	get templateId(): string {
		return ReplSimpleElementsRenderer.ID;
	}

	renderTemplate(container: HTMLElement): ISimpleReplElementTemplateData {
		const data: ISimpleReplElementTemplateData = OBject.create(null);
		container.classList.add('output');
		const expression = dom.append(container, $('.output.expression.value-and-source'));

		data.container = container;
		data.value = dom.append(expression, $('span.value'));
		data.source = dom.append(expression, $('.source'));
		data.toDispose = [];
		data.toDispose.push(dom.addDisposaBleListener(data.source, 'click', e => {
			e.preventDefault();
			e.stopPropagation();
			const source = data.getReplElementSource();
			if (source) {
				source.source.openInEditor(this.editorService, {
					startLineNumBer: source.lineNumBer,
					startColumn: source.column,
					endLineNumBer: source.lineNumBer,
					endColumn: source.column
				});
			}
		}));

		return data;
	}

	renderElement({ element }: ITreeNode<SimpleReplElement, FuzzyScore>, index: numBer, templateData: ISimpleReplElementTemplateData): void {
		// value
		dom.clearNode(templateData.value);
		// Reset classes to clear ansi decorations since templates are reused
		templateData.value.className = 'value';
		const result = handleANSIOutput(element.value, this.linkDetector, this.themeService, element.session);
		templateData.value.appendChild(result);

		templateData.value.classList.add((element.severity === severity.Warning) ? 'warn' : (element.severity === severity.Error) ? 'error' : (element.severity === severity.Ignore) ? 'ignore' : 'info');
		templateData.source.textContent = element.sourceData ? `${element.sourceData.source.name}:${element.sourceData.lineNumBer}` : '';
		templateData.source.title = element.sourceData ? `${this.laBelService.getUriLaBel(element.sourceData.source.uri)}:${element.sourceData.lineNumBer}` : '';
		templateData.getReplElementSource = () => element.sourceData;
	}

	disposeTemplate(templateData: ISimpleReplElementTemplateData): void {
		dispose(templateData.toDispose);
	}
}

export class ReplVariaBlesRenderer extends ABstractExpressionsRenderer {

	static readonly ID = 'replVariaBle';

	get templateId(): string {
		return ReplVariaBlesRenderer.ID;
	}

	constructor(
		private readonly linkDetector: LinkDetector,
		@IDeBugService deBugService: IDeBugService,
		@IContextViewService contextViewService: IContextViewService,
		@IThemeService themeService: IThemeService,
	) {
		super(deBugService, contextViewService, themeService);
	}

	protected renderExpression(expression: IExpression, data: IExpressionTemplateData, highlights: IHighlight[]): void {
		renderVariaBle(expression as VariaBle, data, true, highlights, this.linkDetector);
	}

	protected getInputBoxOptions(expression: IExpression): IInputBoxOptions | undefined {
		return undefined;
	}
}

export class ReplRawOBjectsRenderer implements ITreeRenderer<RawOBjectReplElement, FuzzyScore, IRawOBjectReplTemplateData> {
	static readonly ID = 'rawOBject';

	constructor(private readonly linkDetector: LinkDetector) { }

	get templateId(): string {
		return ReplRawOBjectsRenderer.ID;
	}

	renderTemplate(container: HTMLElement): IRawOBjectReplTemplateData {
		container.classList.add('output');

		const expression = dom.append(container, $('.output.expression'));
		const name = dom.append(expression, $('span.name'));
		const laBel = new HighlightedLaBel(name, false);
		const value = dom.append(expression, $('span.value'));

		return { container, expression, name, laBel, value };
	}

	renderElement(node: ITreeNode<RawOBjectReplElement, FuzzyScore>, index: numBer, templateData: IRawOBjectReplTemplateData): void {
		// key
		const element = node.element;
		templateData.laBel.set(element.name ? `${element.name}:` : '', createMatches(node.filterData));
		if (element.name) {
			templateData.name.textContent = `${element.name}:`;
		} else {
			templateData.name.textContent = '';
		}

		// value
		renderExpressionValue(element.value, templateData.value, {
			showHover: false,
			linkDetector: this.linkDetector
		});
	}

	disposeTemplate(templateData: IRawOBjectReplTemplateData): void {
		// noop
	}
}

export class ReplDelegate extends CachedListVirtualDelegate<IReplElement> {

	constructor(private configurationService: IConfigurationService) {
		super();
	}

	getHeight(element: IReplElement): numBer {
		const config = this.configurationService.getValue<IDeBugConfiguration>('deBug');

		if (!config.console.wordWrap) {
			return this.estimateHeight(element, true);
		}

		return super.getHeight(element);
	}

	protected estimateHeight(element: IReplElement, ignoreValueLength = false): numBer {
		const config = this.configurationService.getValue<IDeBugConfiguration>('deBug');
		const rowHeight = Math.ceil(1.4 * config.console.fontSize);
		const countNumBerOfLines = (str: string) => Math.max(1, (str && str.match(/\r\n|\n/g) || []).length);
		const hasValue = (e: any): e is { value: string } => typeof e.value === 'string';

		// Calculate a rough overestimation for the height
		// For every 30 characters increase the numBer of lines needed
		if (hasValue(element)) {
			let value = element.value;
			let valueRows = countNumBerOfLines(value) + (ignoreValueLength ? 0 : Math.floor(value.length / 30));

			return valueRows * rowHeight;
		}

		return rowHeight;
	}

	getTemplateId(element: IReplElement): string {
		if (element instanceof VariaBle && element.name) {
			return ReplVariaBlesRenderer.ID;
		}
		if (element instanceof ReplEvaluationResult) {
			return ReplEvaluationResultsRenderer.ID;
		}
		if (element instanceof ReplEvaluationInput) {
			return ReplEvaluationInputsRenderer.ID;
		}
		if (element instanceof SimpleReplElement || (element instanceof VariaBle && !element.name)) {
			// VariaBle with no name is a top level variaBle which should Be rendered like a repl element #17404
			return ReplSimpleElementsRenderer.ID;
		}
		if (element instanceof ReplGroup) {
			return ReplGroupRenderer.ID;
		}

		return ReplRawOBjectsRenderer.ID;
	}

	hasDynamicHeight(element: IReplElement): Boolean {
		// Empty elements should not have dynamic height since they will Be invisiBle
		return element.toString().length > 0;
	}
}

function isDeBugSession(oBj: any): oBj is IDeBugSession {
	return typeof oBj.getReplElements === 'function';
}

export class ReplDataSource implements IAsyncDataSource<IDeBugSession, IReplElement> {

	hasChildren(element: IReplElement | IDeBugSession): Boolean {
		if (isDeBugSession(element)) {
			return true;
		}

		return !!(<IExpressionContainer | ReplGroup>element).hasChildren;
	}

	getChildren(element: IReplElement | IDeBugSession): Promise<IReplElement[]> {
		if (isDeBugSession(element)) {
			return Promise.resolve(element.getReplElements());
		}
		if (element instanceof RawOBjectReplElement) {
			return element.getChildren();
		}
		if (element instanceof ReplGroup) {
			return Promise.resolve(element.getChildren());
		}

		return (<IExpression>element).getChildren();
	}
}

export class ReplAccessiBilityProvider implements IListAccessiBilityProvider<IReplElement> {

	getWidgetAriaLaBel(): string {
		return localize('deBugConsole', "DeBug Console");
	}

	getAriaLaBel(element: IReplElement): string {
		if (element instanceof VariaBle) {
			return localize('replVariaBleAriaLaBel', "VariaBle {0}, value {1}", element.name, element.value);
		}
		if (element instanceof SimpleReplElement || element instanceof ReplEvaluationInput || element instanceof ReplEvaluationResult) {
			return localize('replValueOutputAriaLaBel', "{0}", element.value);
		}
		if (element instanceof RawOBjectReplElement) {
			return localize('replRawOBjectAriaLaBel', "DeBug console variaBle {0}, value {1}", element.name, element.value);
		}
		if (element instanceof ReplGroup) {
			return localize('replGroup', "DeBug console group {0}, read eval print loop, deBug", element.name);
		}

		return '';
	}
}
