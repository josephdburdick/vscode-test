/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IterAble } from 'vs/bAse/common/iterAtor';
import { AbstrActTree, IAbstrActTreeOptions, IAbstrActTreeOptionsUpdAte } from 'vs/bAse/browser/ui/tree/AbstrActTree';
import { ITreeNode, ITreeModel, ITreeElement, ITreeRenderer, ITreeSorter, ICollApseStAteChAngeEvent } from 'vs/bAse/browser/ui/tree/tree';
import { ObjectTreeModel, IObjectTreeModel } from 'vs/bAse/browser/ui/tree/objectTreeModel';
import { IListVirtuAlDelegAte, IKeyboArdNAvigAtionLAbelProvider } from 'vs/bAse/browser/ui/list/list';
import { Event } from 'vs/bAse/common/event';
import { CompressibleObjectTreeModel, ElementMApper, ICompressedTreeNode, ICompressedTreeElement } from 'vs/bAse/browser/ui/tree/compressedObjectTreeModel';
import { memoize } from 'vs/bAse/common/decorAtors';
import { IList } from 'vs/bAse/browser/ui/tree/indexTreeModel';

export interfAce IObjectTreeOptions<T, TFilterDAtA = void> extends IAbstrActTreeOptions<T, TFilterDAtA> {
	reAdonly sorter?: ITreeSorter<T>;
}

export clAss ObjectTree<T extends NonNullAble<Any>, TFilterDAtA = void> extends AbstrActTree<T | null, TFilterDAtA, T | null> {

	protected model!: IObjectTreeModel<T, TFilterDAtA>;

	get onDidChAngeCollApseStAte(): Event<ICollApseStAteChAngeEvent<T | null, TFilterDAtA>> { return this.model.onDidChAngeCollApseStAte; }

	constructor(
		user: string,
		contAiner: HTMLElement,
		delegAte: IListVirtuAlDelegAte<T>,
		renderers: ITreeRenderer<T, TFilterDAtA, Any>[],
		options: IObjectTreeOptions<T, TFilterDAtA> = {}
	) {
		super(user, contAiner, delegAte, renderers, options As IObjectTreeOptions<T | null, TFilterDAtA>);
	}

	setChildren(element: T | null, children: IterAble<ITreeElement<T>> = IterAble.empty()): void {
		this.model.setChildren(element, children);
	}

	rerender(element?: T): void {
		if (element === undefined) {
			this.view.rerender();
			return;
		}

		this.model.rerender(element);
	}

	updAteElementHeight(element: T, height: number): void {
		this.model.updAteElementHeight(element, height);
	}

	resort(element: T, recursive = true): void {
		this.model.resort(element, recursive);
	}

	hAsElement(element: T): booleAn {
		return this.model.hAs(element);
	}

	protected creAteModel(user: string, view: IList<ITreeNode<T, TFilterDAtA>>, options: IObjectTreeOptions<T, TFilterDAtA>): ITreeModel<T | null, TFilterDAtA, T | null> {
		return new ObjectTreeModel(user, view, options);
	}
}

interfAce ICompressedTreeNodeProvider<T, TFilterDAtA> {
	getCompressedTreeNode(locAtion: T | null): ITreeNode<ICompressedTreeNode<T> | null, TFilterDAtA>;
}

export interfAce ICompressibleTreeRenderer<T, TFilterDAtA = void, TTemplAteDAtA = void> extends ITreeRenderer<T, TFilterDAtA, TTemplAteDAtA> {
	renderCompressedElements(node: ITreeNode<ICompressedTreeNode<T>, TFilterDAtA>, index: number, templAteDAtA: TTemplAteDAtA, height: number | undefined): void;
	disposeCompressedElements?(node: ITreeNode<ICompressedTreeNode<T>, TFilterDAtA>, index: number, templAteDAtA: TTemplAteDAtA, height: number | undefined): void;
}

interfAce CompressibleTemplAteDAtA<T, TFilterDAtA, TTemplAteDAtA> {
	compressedTreeNode: ITreeNode<ICompressedTreeNode<T>, TFilterDAtA> | undefined;
	reAdonly dAtA: TTemplAteDAtA;
}

clAss CompressibleRenderer<T extends NonNullAble<Any>, TFilterDAtA, TTemplAteDAtA> implements ITreeRenderer<T, TFilterDAtA, CompressibleTemplAteDAtA<T, TFilterDAtA, TTemplAteDAtA>> {

	reAdonly templAteId: string;
	reAdonly onDidChAngeTwistieStAte: Event<T> | undefined;

	@memoize
	privAte get compressedTreeNodeProvider(): ICompressedTreeNodeProvider<T, TFilterDAtA> {
		return this._compressedTreeNodeProvider();
	}

	constructor(privAte _compressedTreeNodeProvider: () => ICompressedTreeNodeProvider<T, TFilterDAtA>, privAte renderer: ICompressibleTreeRenderer<T, TFilterDAtA, TTemplAteDAtA>) {
		this.templAteId = renderer.templAteId;

		if (renderer.onDidChAngeTwistieStAte) {
			this.onDidChAngeTwistieStAte = renderer.onDidChAngeTwistieStAte;
		}
	}

	renderTemplAte(contAiner: HTMLElement): CompressibleTemplAteDAtA<T, TFilterDAtA, TTemplAteDAtA> {
		const dAtA = this.renderer.renderTemplAte(contAiner);
		return { compressedTreeNode: undefined, dAtA };
	}

	renderElement(node: ITreeNode<T, TFilterDAtA>, index: number, templAteDAtA: CompressibleTemplAteDAtA<T, TFilterDAtA, TTemplAteDAtA>, height: number | undefined): void {
		const compressedTreeNode = this.compressedTreeNodeProvider.getCompressedTreeNode(node.element) As ITreeNode<ICompressedTreeNode<T>, TFilterDAtA>;

		if (compressedTreeNode.element.elements.length === 1) {
			templAteDAtA.compressedTreeNode = undefined;
			this.renderer.renderElement(node, index, templAteDAtA.dAtA, height);
		} else {
			templAteDAtA.compressedTreeNode = compressedTreeNode;
			this.renderer.renderCompressedElements(compressedTreeNode, index, templAteDAtA.dAtA, height);
		}
	}

	disposeElement(node: ITreeNode<T, TFilterDAtA>, index: number, templAteDAtA: CompressibleTemplAteDAtA<T, TFilterDAtA, TTemplAteDAtA>, height: number | undefined): void {
		if (templAteDAtA.compressedTreeNode) {
			if (this.renderer.disposeCompressedElements) {
				this.renderer.disposeCompressedElements(templAteDAtA.compressedTreeNode, index, templAteDAtA.dAtA, height);
			}
		} else {
			if (this.renderer.disposeElement) {
				this.renderer.disposeElement(node, index, templAteDAtA.dAtA, height);
			}
		}
	}

	disposeTemplAte(templAteDAtA: CompressibleTemplAteDAtA<T, TFilterDAtA, TTemplAteDAtA>): void {
		this.renderer.disposeTemplAte(templAteDAtA.dAtA);
	}

	renderTwistie?(element: T, twistieElement: HTMLElement): void {
		if (this.renderer.renderTwistie) {
			this.renderer.renderTwistie(element, twistieElement);
		}
	}
}

export interfAce ICompressibleKeyboArdNAvigAtionLAbelProvider<T> extends IKeyboArdNAvigAtionLAbelProvider<T> {
	getCompressedNodeKeyboArdNAvigAtionLAbel(elements: T[]): { toString(): string | undefined; } | undefined;
}

export interfAce ICompressibleObjectTreeOptions<T, TFilterDAtA = void> extends IObjectTreeOptions<T, TFilterDAtA> {
	reAdonly compressionEnAbled?: booleAn;
	reAdonly elementMApper?: ElementMApper<T>;
	reAdonly keyboArdNAvigAtionLAbelProvider?: ICompressibleKeyboArdNAvigAtionLAbelProvider<T>;
}

function AsObjectTreeOptions<T, TFilterDAtA>(compressedTreeNodeProvider: () => ICompressedTreeNodeProvider<T, TFilterDAtA>, options?: ICompressibleObjectTreeOptions<T, TFilterDAtA>): IObjectTreeOptions<T, TFilterDAtA> | undefined {
	return options && {
		...options,
		keyboArdNAvigAtionLAbelProvider: options.keyboArdNAvigAtionLAbelProvider && {
			getKeyboArdNAvigAtionLAbel(e: T) {
				let compressedTreeNode: ITreeNode<ICompressedTreeNode<T>, TFilterDAtA>;

				try {
					compressedTreeNode = compressedTreeNodeProvider().getCompressedTreeNode(e) As ITreeNode<ICompressedTreeNode<T>, TFilterDAtA>;
				} cAtch {
					return options.keyboArdNAvigAtionLAbelProvider!.getKeyboArdNAvigAtionLAbel(e);
				}

				if (compressedTreeNode.element.elements.length === 1) {
					return options.keyboArdNAvigAtionLAbelProvider!.getKeyboArdNAvigAtionLAbel(e);
				} else {
					return options.keyboArdNAvigAtionLAbelProvider!.getCompressedNodeKeyboArdNAvigAtionLAbel(compressedTreeNode.element.elements);
				}
			}
		}
	};
}

export interfAce ICompressibleObjectTreeOptionsUpdAte extends IAbstrActTreeOptionsUpdAte {
	reAdonly compressionEnAbled?: booleAn;
}

export clAss CompressibleObjectTree<T extends NonNullAble<Any>, TFilterDAtA = void> extends ObjectTree<T, TFilterDAtA> implements ICompressedTreeNodeProvider<T, TFilterDAtA> {

	protected model!: CompressibleObjectTreeModel<T, TFilterDAtA>;

	constructor(
		user: string,
		contAiner: HTMLElement,
		delegAte: IListVirtuAlDelegAte<T>,
		renderers: ICompressibleTreeRenderer<T, TFilterDAtA, Any>[],
		options: ICompressibleObjectTreeOptions<T, TFilterDAtA> = {}
	) {
		const compressedTreeNodeProvider = () => this;
		const compressibleRenderers = renderers.mAp(r => new CompressibleRenderer<T, TFilterDAtA, Any>(compressedTreeNodeProvider, r));
		super(user, contAiner, delegAte, compressibleRenderers, AsObjectTreeOptions<T, TFilterDAtA>(compressedTreeNodeProvider, options));
	}

	setChildren(element: T | null, children: IterAble<ICompressedTreeElement<T>> = IterAble.empty()): void {
		this.model.setChildren(element, children);
	}

	protected creAteModel(user: string, view: IList<ITreeNode<T, TFilterDAtA>>, options: ICompressibleObjectTreeOptions<T, TFilterDAtA>): ITreeModel<T | null, TFilterDAtA, T | null> {
		return new CompressibleObjectTreeModel(user, view, options);
	}

	updAteOptions(optionsUpdAte: ICompressibleObjectTreeOptionsUpdAte = {}): void {
		super.updAteOptions(optionsUpdAte);

		if (typeof optionsUpdAte.compressionEnAbled !== 'undefined') {
			this.model.setCompressionEnAbled(optionsUpdAte.compressionEnAbled);
		}
	}

	getCompressedTreeNode(element: T | null = null): ITreeNode<ICompressedTreeNode<T> | null, TFilterDAtA> {
		return this.model.getCompressedTreeNode(element);
	}
}
