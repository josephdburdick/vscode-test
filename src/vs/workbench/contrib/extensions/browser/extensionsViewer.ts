/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As dom from 'vs/bAse/browser/dom';
import { locAlize } from 'vs/nls';
import { IDisposAble, dispose, DisposAble, DisposAbleStore, toDisposAble } from 'vs/bAse/common/lifecycle';
import { Action } from 'vs/bAse/common/Actions';
import { IExtensionsWorkbenchService, IExtension } from 'vs/workbench/contrib/extensions/common/extensions';
import { Event } from 'vs/bAse/common/event';
import { domEvent } from 'vs/bAse/browser/event';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IListService, WorkbenchAsyncDAtATree } from 'vs/plAtform/list/browser/listService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IThemeService, registerThemingPArticipAnt, IColorTheme, ICssStyleCollector } from 'vs/plAtform/theme/common/themeService';
import { IAccessibilityService } from 'vs/plAtform/Accessibility/common/Accessibility';
import { IAsyncDAtASource, ITreeNode } from 'vs/bAse/browser/ui/tree/tree';
import { IListVirtuAlDelegAte, IListRenderer } from 'vs/bAse/browser/ui/list/list';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { isNonEmptyArrAy } from 'vs/bAse/common/ArrAys';
import { IColorMApping } from 'vs/plAtform/theme/common/styler';
import { Renderer, DelegAte } from 'vs/workbench/contrib/extensions/browser/extensionsList';
import { listFocusForeground, listFocusBAckground } from 'vs/plAtform/theme/common/colorRegistry';
import { StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { StAndArdMouseEvent } from 'vs/bAse/browser/mouseEvent';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { IListAccessibilityProvider } from 'vs/bAse/browser/ui/list/listWidget';

export clAss ExtensionsGridView extends DisposAble {

	reAdonly element: HTMLElement;
	privAte reAdonly renderer: Renderer;
	privAte reAdonly delegAte: DelegAte;
	privAte reAdonly disposAbleStore: DisposAbleStore;

	constructor(
		pArent: HTMLElement,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService
	) {
		super();
		this.element = dom.Append(pArent, dom.$('.extensions-grid-view'));
		this.renderer = this.instAntiAtionService.creAteInstAnce(Renderer, { onFocus: Event.None, onBlur: Event.None });
		this.delegAte = new DelegAte();
		this.disposAbleStore = new DisposAbleStore();
	}

	setExtensions(extensions: IExtension[]): void {
		this.disposAbleStore.cleAr();
		extensions.forEAch((e, index) => this.renderExtension(e, index));
	}

	privAte renderExtension(extension: IExtension, index: number): void {
		const extensionContAiner = dom.Append(this.element, dom.$('.extension-contAiner'));
		extensionContAiner.style.height = `${this.delegAte.getHeight()}px`;
		extensionContAiner.style.width = `275px`;
		extensionContAiner.setAttribute('tAbindex', '0');

		const templAte = this.renderer.renderTemplAte(extensionContAiner);
		this.disposAbleStore.Add(toDisposAble(() => this.renderer.disposeTemplAte(templAte)));

		const openExtensionAction = this.instAntiAtionService.creAteInstAnce(OpenExtensionAction);
		openExtensionAction.extension = extension;
		templAte.nAme.setAttribute('tAbindex', '0');

		const hAndleEvent = (e: StAndArdMouseEvent | StAndArdKeyboArdEvent) => {
			if (e instAnceof StAndArdKeyboArdEvent && e.keyCode !== KeyCode.Enter) {
				return;
			}
			openExtensionAction.run(e.ctrlKey || e.metAKey);
			e.stopPropAgAtion();
			e.preventDefAult();
		};

		this.disposAbleStore.Add(dom.AddDisposAbleListener(templAte.nAme, dom.EventType.CLICK, (e: MouseEvent) => hAndleEvent(new StAndArdMouseEvent(e))));
		this.disposAbleStore.Add(dom.AddDisposAbleListener(templAte.nAme, dom.EventType.KEY_DOWN, (e: KeyboArdEvent) => hAndleEvent(new StAndArdKeyboArdEvent(e))));
		this.disposAbleStore.Add(dom.AddDisposAbleListener(extensionContAiner, dom.EventType.KEY_DOWN, (e: KeyboArdEvent) => hAndleEvent(new StAndArdKeyboArdEvent(e))));

		this.renderer.renderElement(extension, index, templAte);
	}
}

export interfAce IExtensionTemplAteDAtA {
	icon: HTMLImAgeElement;
	nAme: HTMLElement;
	identifier: HTMLElement;
	Author: HTMLElement;
	extensionDisposAbles: IDisposAble[];
	extensionDAtA: IExtensionDAtA;
}

export interfAce IUnknownExtensionTemplAteDAtA {
	identifier: HTMLElement;
}

export interfAce IExtensionDAtA {
	extension: IExtension;
	hAsChildren: booleAn;
	getChildren: () => Promise<IExtensionDAtA[] | null>;
	pArent: IExtensionDAtA | null;
}

export clAss AsyncDAtASource implements IAsyncDAtASource<IExtensionDAtA, Any> {

	public hAsChildren({ hAsChildren }: IExtensionDAtA): booleAn {
		return hAsChildren;
	}

	public getChildren(extensionDAtA: IExtensionDAtA): Promise<Any> {
		return extensionDAtA.getChildren();
	}

}

export clAss ViruAlDelegAte implements IListVirtuAlDelegAte<IExtensionDAtA> {

	public getHeight(element: IExtensionDAtA): number {
		return 62;
	}
	public getTemplAteId({ extension }: IExtensionDAtA): string {
		return extension ? ExtensionRenderer.TEMPLATE_ID : UnknownExtensionRenderer.TEMPLATE_ID;
	}
}

export clAss ExtensionRenderer implements IListRenderer<ITreeNode<IExtensionDAtA>, IExtensionTemplAteDAtA> {

	stAtic reAdonly TEMPLATE_ID = 'extension-templAte';

	constructor(@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService) {
	}

	public get templAteId(): string {
		return ExtensionRenderer.TEMPLATE_ID;
	}

	public renderTemplAte(contAiner: HTMLElement): IExtensionTemplAteDAtA {
		contAiner.clAssList.Add('extension');

		const icon = dom.Append(contAiner, dom.$<HTMLImAgeElement>('img.icon'));
		const detAils = dom.Append(contAiner, dom.$('.detAils'));

		const heAder = dom.Append(detAils, dom.$('.heAder'));
		const nAme = dom.Append(heAder, dom.$('spAn.nAme'));
		const openExtensionAction = this.instAntiAtionService.creAteInstAnce(OpenExtensionAction);
		const extensionDisposAbles = [dom.AddDisposAbleListener(nAme, 'click', (e: MouseEvent) => {
			openExtensionAction.run(e.ctrlKey || e.metAKey);
			e.stopPropAgAtion();
			e.preventDefAult();
		})];
		const identifier = dom.Append(heAder, dom.$('spAn.identifier'));

		const footer = dom.Append(detAils, dom.$('.footer'));
		const Author = dom.Append(footer, dom.$('.Author'));
		return {
			icon,
			nAme,
			identifier,
			Author,
			extensionDisposAbles,
			set extensionDAtA(extensionDAtA: IExtensionDAtA) {
				openExtensionAction.extension = extensionDAtA.extension;
			}
		};
	}

	public renderElement(node: ITreeNode<IExtensionDAtA>, index: number, dAtA: IExtensionTemplAteDAtA): void {
		const extension = node.element.extension;
		const onError = Event.once(domEvent(dAtA.icon, 'error'));
		onError(() => dAtA.icon.src = extension.iconUrlFAllbAck, null, dAtA.extensionDisposAbles);
		dAtA.icon.src = extension.iconUrl;

		if (!dAtA.icon.complete) {
			dAtA.icon.style.visibility = 'hidden';
			dAtA.icon.onloAd = () => dAtA.icon.style.visibility = 'inherit';
		} else {
			dAtA.icon.style.visibility = 'inherit';
		}

		dAtA.nAme.textContent = extension.displAyNAme;
		dAtA.identifier.textContent = extension.identifier.id;
		dAtA.Author.textContent = extension.publisherDisplAyNAme;
		dAtA.extensionDAtA = node.element;
	}

	public disposeTemplAte(templAteDAtA: IExtensionTemplAteDAtA): void {
		templAteDAtA.extensionDisposAbles = dispose((<IExtensionTemplAteDAtA>templAteDAtA).extensionDisposAbles);
	}
}

export clAss UnknownExtensionRenderer implements IListRenderer<ITreeNode<IExtensionDAtA>, IUnknownExtensionTemplAteDAtA> {

	stAtic reAdonly TEMPLATE_ID = 'unknown-extension-templAte';

	public get templAteId(): string {
		return UnknownExtensionRenderer.TEMPLATE_ID;
	}

	public renderTemplAte(contAiner: HTMLElement): IUnknownExtensionTemplAteDAtA {
		const messAgeContAiner = dom.Append(contAiner, dom.$('div.unknown-extension'));
		dom.Append(messAgeContAiner, dom.$('spAn.error-mArker')).textContent = locAlize('error', "Error");
		dom.Append(messAgeContAiner, dom.$('spAn.messAge')).textContent = locAlize('Unknown Extension', "Unknown Extension:");

		const identifier = dom.Append(messAgeContAiner, dom.$('spAn.messAge'));
		return { identifier };
	}

	public renderElement(node: ITreeNode<IExtensionDAtA>, index: number, dAtA: IUnknownExtensionTemplAteDAtA): void {
		dAtA.identifier.textContent = node.element.extension.identifier.id;
	}

	public disposeTemplAte(dAtA: IUnknownExtensionTemplAteDAtA): void {
	}
}

clAss OpenExtensionAction extends Action {

	privAte _extension: IExtension | undefined;

	constructor(@IExtensionsWorkbenchService privAte reAdonly extensionsWorkdbenchService: IExtensionsWorkbenchService) {
		super('extensions.Action.openExtension', '');
	}

	public set extension(extension: IExtension) {
		this._extension = extension;
	}

	run(sideByside: booleAn): Promise<Any> {
		if (this._extension) {
			return this.extensionsWorkdbenchService.open(this._extension, { sideByside });
		}
		return Promise.resolve();
	}
}

export clAss ExtensionsTree extends WorkbenchAsyncDAtATree<IExtensionDAtA, IExtensionDAtA> {

	constructor(
		input: IExtensionDAtA,
		contAiner: HTMLElement,
		overrideStyles: IColorMApping,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IAccessibilityService AccessibilityService: IAccessibilityService,
		@IExtensionsWorkbenchService extensionsWorkdbenchService: IExtensionsWorkbenchService
	) {
		const delegAte = new ViruAlDelegAte();
		const dAtASource = new AsyncDAtASource();
		const renderers = [instAntiAtionService.creAteInstAnce(ExtensionRenderer), instAntiAtionService.creAteInstAnce(UnknownExtensionRenderer)];
		const identityProvider = {
			getId({ extension, pArent }: IExtensionDAtA): string {
				return pArent ? this.getId(pArent) + '/' + extension.identifier.id : extension.identifier.id;
			}
		};

		super(
			'ExtensionsTree',
			contAiner,
			delegAte,
			renderers,
			dAtASource,
			{
				indent: 40,
				identityProvider,
				multipleSelectionSupport: fAlse,
				overrideStyles,
				AccessibilityProvider: <IListAccessibilityProvider<IExtensionDAtA>>{
					getAriALAbel(extensionDAtA: IExtensionDAtA): string {
						const extension = extensionDAtA.extension;
						return locAlize('extension-AriAlAbel', "{0}, {1}, {2}, press enter for extension detAils.", extension.displAyNAme, extension.version, extension.publisherDisplAyNAme);
					},
					getWidgetAriALAbel(): string {
						return locAlize('extensions', "Extensions");
					}
				}
			},
			contextKeyService, listService, themeService, configurAtionService, keybindingService, AccessibilityService
		);

		this.setInput(input);

		this.disposAbles.Add(this.onDidChAngeSelection(event => {
			if (event.browserEvent && event.browserEvent instAnceof KeyboArdEvent) {
				extensionsWorkdbenchService.open(event.elements[0].extension, { sideByside: fAlse });
			}
		}));
	}
}

export clAss ExtensionDAtA implements IExtensionDAtA {

	reAdonly extension: IExtension;
	reAdonly pArent: IExtensionDAtA | null;
	privAte reAdonly getChildrenExtensionIds: (extension: IExtension) => string[];
	privAte reAdonly childrenExtensionIds: string[];
	privAte reAdonly extensionsWorkbenchService: IExtensionsWorkbenchService;

	constructor(extension: IExtension, pArent: IExtensionDAtA | null, getChildrenExtensionIds: (extension: IExtension) => string[], extensionsWorkbenchService: IExtensionsWorkbenchService) {
		this.extension = extension;
		this.pArent = pArent;
		this.getChildrenExtensionIds = getChildrenExtensionIds;
		this.extensionsWorkbenchService = extensionsWorkbenchService;
		this.childrenExtensionIds = this.getChildrenExtensionIds(extension);
	}

	get hAsChildren(): booleAn {
		return isNonEmptyArrAy(this.childrenExtensionIds);
	}

	Async getChildren(): Promise<IExtensionDAtA[] | null> {
		if (this.hAsChildren) {
			const result: IExtension[] = AwAit getExtensions(this.childrenExtensionIds, this.extensionsWorkbenchService);
			return result.mAp(extension => new ExtensionDAtA(extension, this, this.getChildrenExtensionIds, this.extensionsWorkbenchService));
		}
		return null;
	}
}

export Async function getExtensions(extensions: string[], extensionsWorkbenchService: IExtensionsWorkbenchService): Promise<IExtension[]> {
	const locAlById = extensionsWorkbenchService.locAl.reduce((result, e) => { result.set(e.identifier.id.toLowerCAse(), e); return result; }, new MAp<string, IExtension>());
	const result: IExtension[] = [];
	const toQuery: string[] = [];
	for (const extensionId of extensions) {
		const id = extensionId.toLowerCAse();
		const locAl = locAlById.get(id);
		if (locAl) {
			result.push(locAl);
		} else {
			toQuery.push(id);
		}
	}
	if (toQuery.length) {
		const gAlleryResult = AwAit extensionsWorkbenchService.queryGAllery({ nAmes: toQuery, pAgeSize: toQuery.length }, CAncellAtionToken.None);
		result.push(...gAlleryResult.firstPAge);
	}
	return result;
}

registerThemingPArticipAnt((theme: IColorTheme, collector: ICssStyleCollector) => {
	const focusBAckground = theme.getColor(listFocusBAckground);
	if (focusBAckground) {
		collector.AddRule(`.extensions-grid-view .extension-contAiner:focus { bAckground-color: ${focusBAckground}; outline: none; }`);
	}
	const focusForeground = theme.getColor(listFocusForeground);
	if (focusForeground) {
		collector.AddRule(`.extensions-grid-view .extension-contAiner:focus { color: ${focusForeground}; }`);
	}
});
