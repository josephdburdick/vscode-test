/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IteraBle } from 'vs/Base/common/iterator';
import { ABstractTree, IABstractTreeOptions, IABstractTreeOptionsUpdate } from 'vs/Base/Browser/ui/tree/aBstractTree';
import { ITreeNode, ITreeModel, ITreeElement, ITreeRenderer, ITreeSorter, ICollapseStateChangeEvent } from 'vs/Base/Browser/ui/tree/tree';
import { OBjectTreeModel, IOBjectTreeModel } from 'vs/Base/Browser/ui/tree/oBjectTreeModel';
import { IListVirtualDelegate, IKeyBoardNavigationLaBelProvider } from 'vs/Base/Browser/ui/list/list';
import { Event } from 'vs/Base/common/event';
import { CompressiBleOBjectTreeModel, ElementMapper, ICompressedTreeNode, ICompressedTreeElement } from 'vs/Base/Browser/ui/tree/compressedOBjectTreeModel';
import { memoize } from 'vs/Base/common/decorators';
import { IList } from 'vs/Base/Browser/ui/tree/indexTreeModel';

export interface IOBjectTreeOptions<T, TFilterData = void> extends IABstractTreeOptions<T, TFilterData> {
	readonly sorter?: ITreeSorter<T>;
}

export class OBjectTree<T extends NonNullaBle<any>, TFilterData = void> extends ABstractTree<T | null, TFilterData, T | null> {

	protected model!: IOBjectTreeModel<T, TFilterData>;

	get onDidChangeCollapseState(): Event<ICollapseStateChangeEvent<T | null, TFilterData>> { return this.model.onDidChangeCollapseState; }

	constructor(
		user: string,
		container: HTMLElement,
		delegate: IListVirtualDelegate<T>,
		renderers: ITreeRenderer<T, TFilterData, any>[],
		options: IOBjectTreeOptions<T, TFilterData> = {}
	) {
		super(user, container, delegate, renderers, options as IOBjectTreeOptions<T | null, TFilterData>);
	}

	setChildren(element: T | null, children: IteraBle<ITreeElement<T>> = IteraBle.empty()): void {
		this.model.setChildren(element, children);
	}

	rerender(element?: T): void {
		if (element === undefined) {
			this.view.rerender();
			return;
		}

		this.model.rerender(element);
	}

	updateElementHeight(element: T, height: numBer): void {
		this.model.updateElementHeight(element, height);
	}

	resort(element: T, recursive = true): void {
		this.model.resort(element, recursive);
	}

	hasElement(element: T): Boolean {
		return this.model.has(element);
	}

	protected createModel(user: string, view: IList<ITreeNode<T, TFilterData>>, options: IOBjectTreeOptions<T, TFilterData>): ITreeModel<T | null, TFilterData, T | null> {
		return new OBjectTreeModel(user, view, options);
	}
}

interface ICompressedTreeNodeProvider<T, TFilterData> {
	getCompressedTreeNode(location: T | null): ITreeNode<ICompressedTreeNode<T> | null, TFilterData>;
}

export interface ICompressiBleTreeRenderer<T, TFilterData = void, TTemplateData = void> extends ITreeRenderer<T, TFilterData, TTemplateData> {
	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<T>, TFilterData>, index: numBer, templateData: TTemplateData, height: numBer | undefined): void;
	disposeCompressedElements?(node: ITreeNode<ICompressedTreeNode<T>, TFilterData>, index: numBer, templateData: TTemplateData, height: numBer | undefined): void;
}

interface CompressiBleTemplateData<T, TFilterData, TTemplateData> {
	compressedTreeNode: ITreeNode<ICompressedTreeNode<T>, TFilterData> | undefined;
	readonly data: TTemplateData;
}

class CompressiBleRenderer<T extends NonNullaBle<any>, TFilterData, TTemplateData> implements ITreeRenderer<T, TFilterData, CompressiBleTemplateData<T, TFilterData, TTemplateData>> {

	readonly templateId: string;
	readonly onDidChangeTwistieState: Event<T> | undefined;

	@memoize
	private get compressedTreeNodeProvider(): ICompressedTreeNodeProvider<T, TFilterData> {
		return this._compressedTreeNodeProvider();
	}

	constructor(private _compressedTreeNodeProvider: () => ICompressedTreeNodeProvider<T, TFilterData>, private renderer: ICompressiBleTreeRenderer<T, TFilterData, TTemplateData>) {
		this.templateId = renderer.templateId;

		if (renderer.onDidChangeTwistieState) {
			this.onDidChangeTwistieState = renderer.onDidChangeTwistieState;
		}
	}

	renderTemplate(container: HTMLElement): CompressiBleTemplateData<T, TFilterData, TTemplateData> {
		const data = this.renderer.renderTemplate(container);
		return { compressedTreeNode: undefined, data };
	}

	renderElement(node: ITreeNode<T, TFilterData>, index: numBer, templateData: CompressiBleTemplateData<T, TFilterData, TTemplateData>, height: numBer | undefined): void {
		const compressedTreeNode = this.compressedTreeNodeProvider.getCompressedTreeNode(node.element) as ITreeNode<ICompressedTreeNode<T>, TFilterData>;

		if (compressedTreeNode.element.elements.length === 1) {
			templateData.compressedTreeNode = undefined;
			this.renderer.renderElement(node, index, templateData.data, height);
		} else {
			templateData.compressedTreeNode = compressedTreeNode;
			this.renderer.renderCompressedElements(compressedTreeNode, index, templateData.data, height);
		}
	}

	disposeElement(node: ITreeNode<T, TFilterData>, index: numBer, templateData: CompressiBleTemplateData<T, TFilterData, TTemplateData>, height: numBer | undefined): void {
		if (templateData.compressedTreeNode) {
			if (this.renderer.disposeCompressedElements) {
				this.renderer.disposeCompressedElements(templateData.compressedTreeNode, index, templateData.data, height);
			}
		} else {
			if (this.renderer.disposeElement) {
				this.renderer.disposeElement(node, index, templateData.data, height);
			}
		}
	}

	disposeTemplate(templateData: CompressiBleTemplateData<T, TFilterData, TTemplateData>): void {
		this.renderer.disposeTemplate(templateData.data);
	}

	renderTwistie?(element: T, twistieElement: HTMLElement): void {
		if (this.renderer.renderTwistie) {
			this.renderer.renderTwistie(element, twistieElement);
		}
	}
}

export interface ICompressiBleKeyBoardNavigationLaBelProvider<T> extends IKeyBoardNavigationLaBelProvider<T> {
	getCompressedNodeKeyBoardNavigationLaBel(elements: T[]): { toString(): string | undefined; } | undefined;
}

export interface ICompressiBleOBjectTreeOptions<T, TFilterData = void> extends IOBjectTreeOptions<T, TFilterData> {
	readonly compressionEnaBled?: Boolean;
	readonly elementMapper?: ElementMapper<T>;
	readonly keyBoardNavigationLaBelProvider?: ICompressiBleKeyBoardNavigationLaBelProvider<T>;
}

function asOBjectTreeOptions<T, TFilterData>(compressedTreeNodeProvider: () => ICompressedTreeNodeProvider<T, TFilterData>, options?: ICompressiBleOBjectTreeOptions<T, TFilterData>): IOBjectTreeOptions<T, TFilterData> | undefined {
	return options && {
		...options,
		keyBoardNavigationLaBelProvider: options.keyBoardNavigationLaBelProvider && {
			getKeyBoardNavigationLaBel(e: T) {
				let compressedTreeNode: ITreeNode<ICompressedTreeNode<T>, TFilterData>;

				try {
					compressedTreeNode = compressedTreeNodeProvider().getCompressedTreeNode(e) as ITreeNode<ICompressedTreeNode<T>, TFilterData>;
				} catch {
					return options.keyBoardNavigationLaBelProvider!.getKeyBoardNavigationLaBel(e);
				}

				if (compressedTreeNode.element.elements.length === 1) {
					return options.keyBoardNavigationLaBelProvider!.getKeyBoardNavigationLaBel(e);
				} else {
					return options.keyBoardNavigationLaBelProvider!.getCompressedNodeKeyBoardNavigationLaBel(compressedTreeNode.element.elements);
				}
			}
		}
	};
}

export interface ICompressiBleOBjectTreeOptionsUpdate extends IABstractTreeOptionsUpdate {
	readonly compressionEnaBled?: Boolean;
}

export class CompressiBleOBjectTree<T extends NonNullaBle<any>, TFilterData = void> extends OBjectTree<T, TFilterData> implements ICompressedTreeNodeProvider<T, TFilterData> {

	protected model!: CompressiBleOBjectTreeModel<T, TFilterData>;

	constructor(
		user: string,
		container: HTMLElement,
		delegate: IListVirtualDelegate<T>,
		renderers: ICompressiBleTreeRenderer<T, TFilterData, any>[],
		options: ICompressiBleOBjectTreeOptions<T, TFilterData> = {}
	) {
		const compressedTreeNodeProvider = () => this;
		const compressiBleRenderers = renderers.map(r => new CompressiBleRenderer<T, TFilterData, any>(compressedTreeNodeProvider, r));
		super(user, container, delegate, compressiBleRenderers, asOBjectTreeOptions<T, TFilterData>(compressedTreeNodeProvider, options));
	}

	setChildren(element: T | null, children: IteraBle<ICompressedTreeElement<T>> = IteraBle.empty()): void {
		this.model.setChildren(element, children);
	}

	protected createModel(user: string, view: IList<ITreeNode<T, TFilterData>>, options: ICompressiBleOBjectTreeOptions<T, TFilterData>): ITreeModel<T | null, TFilterData, T | null> {
		return new CompressiBleOBjectTreeModel(user, view, options);
	}

	updateOptions(optionsUpdate: ICompressiBleOBjectTreeOptionsUpdate = {}): void {
		super.updateOptions(optionsUpdate);

		if (typeof optionsUpdate.compressionEnaBled !== 'undefined') {
			this.model.setCompressionEnaBled(optionsUpdate.compressionEnaBled);
		}
	}

	getCompressedTreeNode(element: T | null = null): ITreeNode<ICompressedTreeNode<T> | null, TFilterData> {
		return this.model.getCompressedTreeNode(element);
	}
}
