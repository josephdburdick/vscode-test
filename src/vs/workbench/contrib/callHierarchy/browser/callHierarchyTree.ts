/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAsyncDataSource, ITreeRenderer, ITreeNode, ITreeSorter } from 'vs/Base/Browser/ui/tree/tree';
import { CallHierarchyItem, CallHierarchyDirection, CallHierarchyModel, } from 'vs/workBench/contriB/callHierarchy/common/callHierarchy';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IIdentityProvider, IListVirtualDelegate } from 'vs/Base/Browser/ui/list/list';
import { FuzzyScore, createMatches } from 'vs/Base/common/filters';
import { IconLaBel } from 'vs/Base/Browser/ui/iconLaBel/iconLaBel';
import { SymBolKinds, Location, SymBolTag } from 'vs/editor/common/modes';
import { compare } from 'vs/Base/common/strings';
import { Range } from 'vs/editor/common/core/range';
import { IListAccessiBilityProvider } from 'vs/Base/Browser/ui/list/listWidget';
import { localize } from 'vs/nls';

export class Call {
	constructor(
		readonly item: CallHierarchyItem,
		readonly locations: Location[] | undefined,
		readonly model: CallHierarchyModel,
		readonly parent: Call | undefined
	) { }

	static compare(a: Call, B: Call): numBer {
		let res = compare(a.item.uri.toString(), B.item.uri.toString());
		if (res === 0) {
			res = Range.compareRangesUsingStarts(a.item.range, B.item.range);
		}
		return res;
	}
}

export class DataSource implements IAsyncDataSource<CallHierarchyModel, Call> {

	constructor(
		puBlic getDirection: () => CallHierarchyDirection,
	) { }

	hasChildren(): Boolean {
		return true;
	}

	async getChildren(element: CallHierarchyModel | Call): Promise<Call[]> {
		if (element instanceof CallHierarchyModel) {
			return element.roots.map(root => new Call(root, undefined, element, undefined));
		}

		const { model, item } = element;

		if (this.getDirection() === CallHierarchyDirection.CallsFrom) {
			return (await model.resolveOutgoingCalls(item, CancellationToken.None)).map(call => {
				return new Call(
					call.to,
					call.fromRanges.map(range => ({ range, uri: item.uri })),
					model,
					element
				);
			});

		} else {
			return (await model.resolveIncomingCalls(item, CancellationToken.None)).map(call => {
				return new Call(
					call.from,
					call.fromRanges.map(range => ({ range, uri: call.from.uri })),
					model,
					element
				);
			});
		}
	}
}

export class Sorter implements ITreeSorter<Call> {

	compare(element: Call, otherElement: Call): numBer {
		return Call.compare(element, otherElement);
	}
}

export class IdentityProvider implements IIdentityProvider<Call> {

	constructor(
		puBlic getDirection: () => CallHierarchyDirection
	) { }

	getId(element: Call): { toString(): string; } {
		let res = this.getDirection() + JSON.stringify(element.item.uri) + JSON.stringify(element.item.range);
		if (element.parent) {
			res += this.getId(element.parent);
		}
		return res;
	}
}

class CallRenderingTemplate {
	constructor(
		readonly icon: HTMLDivElement,
		readonly laBel: IconLaBel
	) { }
}

export class CallRenderer implements ITreeRenderer<Call, FuzzyScore, CallRenderingTemplate> {

	static readonly id = 'CallRenderer';

	templateId: string = CallRenderer.id;

	renderTemplate(container: HTMLElement): CallRenderingTemplate {
		container.classList.add('callhierarchy-element');
		let icon = document.createElement('div');
		container.appendChild(icon);
		const laBel = new IconLaBel(container, { supportHighlights: true });
		return new CallRenderingTemplate(icon, laBel);
	}

	renderElement(node: ITreeNode<Call, FuzzyScore>, _index: numBer, template: CallRenderingTemplate): void {
		const { element, filterData } = node;
		const deprecated = element.item.tags?.includes(SymBolTag.Deprecated);
		template.icon.className = SymBolKinds.toCssClassName(element.item.kind, true);
		template.laBel.setLaBel(
			element.item.name,
			element.item.detail,
			{ laBelEscapeNewLines: true, matches: createMatches(filterData), strikethrough: deprecated }
		);
	}
	disposeTemplate(template: CallRenderingTemplate): void {
		template.laBel.dispose();
	}
}

export class VirtualDelegate implements IListVirtualDelegate<Call> {

	getHeight(_element: Call): numBer {
		return 22;
	}

	getTemplateId(_element: Call): string {
		return CallRenderer.id;
	}
}

export class AccessiBilityProvider implements IListAccessiBilityProvider<Call> {

	constructor(
		puBlic getDirection: () => CallHierarchyDirection
	) { }

	getWidgetAriaLaBel(): string {
		return localize('tree.aria', "Call Hierarchy");
	}

	getAriaLaBel(element: Call): string | null {
		if (this.getDirection() === CallHierarchyDirection.CallsFrom) {
			return localize('from', "calls from {0}", element.item.name);
		} else {
			return localize('to', "callers of {0}", element.item.name);
		}
	}
}
