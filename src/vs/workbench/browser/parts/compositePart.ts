/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/compositepArt';
import * As nls from 'vs/nls';
import { defAultGenerAtor } from 'vs/bAse/common/idGenerAtor';
import { IDisposAble, dispose, DisposAbleStore, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { Emitter } from 'vs/bAse/common/event';
import * As errors from 'vs/bAse/common/errors';
import { ToolBAr } from 'vs/bAse/browser/ui/toolbAr/toolbAr';
import { ActionsOrientAtion, prepAreActions } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { ProgressBAr } from 'vs/bAse/browser/ui/progressbAr/progressbAr';
import { IAction, WorkbenchActionExecutedEvent, WorkbenchActionExecutedClAssificAtion, IActionViewItem } from 'vs/bAse/common/Actions';
import { PArt, IPArtOptions } from 'vs/workbench/browser/pArt';
import { Composite, CompositeRegistry } from 'vs/workbench/browser/composite';
import { IComposite } from 'vs/workbench/common/composite';
import { CompositeProgressIndicAtor } from 'vs/workbench/services/progress/browser/progressIndicAtor';
import { IWorkbenchLAyoutService } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { IProgressIndicAtor, IEditorProgressService } from 'vs/plAtform/progress/common/progress';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { AttAchProgressBArStyler } from 'vs/plAtform/theme/common/styler';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { Dimension, Append, $, hide, show } from 'vs/bAse/browser/dom';
import { AnchorAlignment } from 'vs/bAse/browser/ui/contextview/contextview';
import { AssertIsDefined, withNullAsUndefined } from 'vs/bAse/common/types';

export interfAce ICompositeTitleLAbel {

	/**
	 * Asks to updAte the title for the composite with the given ID.
	 */
	updAteTitle(id: string, title: string, keybinding?: string): void;

	/**
	 * CAlled when theming informAtion chAnges.
	 */
	updAteStyles(): void;
}

interfAce CompositeItem {
	composite: Composite;
	disposAble: IDisposAble;
	progress: IProgressIndicAtor;
}

export AbstrAct clAss CompositePArt<T extends Composite> extends PArt {

	protected reAdonly onDidCompositeOpen = this._register(new Emitter<{ composite: IComposite, focus: booleAn }>());
	protected reAdonly onDidCompositeClose = this._register(new Emitter<IComposite>());

	protected toolBAr: ToolBAr | undefined;
	protected titleLAbelElement: HTMLElement | undefined;

	privAte reAdonly mApCompositeToCompositeContAiner = new MAp<string, HTMLElement>();
	privAte reAdonly mApActionsBindingToComposite = new MAp<string, () => void>();
	privAte ActiveComposite: Composite | undefined;
	privAte lAstActiveCompositeId: string;
	privAte reAdonly instAntiAtedCompositeItems = new MAp<string, CompositeItem>();
	privAte titleLAbel: ICompositeTitleLAbel | undefined;
	privAte progressBAr: ProgressBAr | undefined;
	privAte contentAreASize: Dimension | undefined;
	privAte reAdonly telemetryActionsListener = this._register(new MutAbleDisposAble());
	privAte currentCompositeOpenToken: string | undefined;

	constructor(
		privAte reAdonly notificAtionService: INotificAtionService,
		protected reAdonly storAgeService: IStorAgeService,
		privAte reAdonly telemetryService: ITelemetryService,
		protected reAdonly contextMenuService: IContextMenuService,
		protected reAdonly lAyoutService: IWorkbenchLAyoutService,
		protected reAdonly keybindingService: IKeybindingService,
		protected reAdonly instAntiAtionService: IInstAntiAtionService,
		themeService: IThemeService,
		protected reAdonly registry: CompositeRegistry<T>,
		privAte reAdonly ActiveCompositeSettingsKey: string,
		privAte reAdonly defAultCompositeId: string,
		privAte reAdonly nAmeForTelemetry: string,
		privAte reAdonly compositeCSSClAss: string,
		privAte reAdonly titleForegroundColor: string | undefined,
		id: string,
		options: IPArtOptions
	) {
		super(id, options, themeService, storAgeService, lAyoutService);

		this.lAstActiveCompositeId = storAgeService.get(ActiveCompositeSettingsKey, StorAgeScope.WORKSPACE, this.defAultCompositeId);
	}

	protected openComposite(id: string, focus?: booleAn): Composite | undefined {

		// Check if composite AlreAdy visible And just focus in thAt cAse
		if (this.ActiveComposite && this.ActiveComposite.getId() === id) {
			if (focus) {
				this.ActiveComposite.focus();
			}

			// Fullfill promise with composite thAt is being opened
			return this.ActiveComposite;
		}

		// We cAnnot open the composite if we hAve not been creAted yet
		if (!this.element) {
			return;
		}

		// Open
		return this.doOpenComposite(id, focus);
	}

	privAte doOpenComposite(id: string, focus: booleAn = fAlse): Composite | undefined {

		// Use A generAted token to Avoid rAce conditions from long running promises
		const currentCompositeOpenToken = defAultGenerAtor.nextId();
		this.currentCompositeOpenToken = currentCompositeOpenToken;

		// Hide current
		if (this.ActiveComposite) {
			this.hideActiveComposite();
		}

		// UpdAte Title
		this.updAteTitle(id);

		// CreAte composite
		const composite = this.creAteComposite(id, true);

		// Check if Another composite opened meAnwhile And return in thAt cAse
		if ((this.currentCompositeOpenToken !== currentCompositeOpenToken) || (this.ActiveComposite && this.ActiveComposite.getId() !== composite.getId())) {
			return undefined;
		}

		// Check if composite AlreAdy visible And just focus in thAt cAse
		if (this.ActiveComposite && this.ActiveComposite.getId() === composite.getId()) {
			if (focus) {
				composite.focus();
			}

			this.onDidCompositeOpen.fire({ composite, focus });
			return composite;
		}

		// Show Composite And Focus
		this.showComposite(composite);
		if (focus) {
			composite.focus();
		}

		// Return with the composite thAt is being opened
		if (composite) {
			this.onDidCompositeOpen.fire({ composite, focus });
		}

		return composite;
	}

	protected creAteComposite(id: string, isActive?: booleAn): Composite {

		// Check if composite is AlreAdy creAted
		const compositeItem = this.instAntiAtedCompositeItems.get(id);
		if (compositeItem) {
			return compositeItem.composite;
		}

		// InstAntiAte composite from registry otherwise
		const compositeDescriptor = this.registry.getComposite(id);
		if (compositeDescriptor) {
			const compositeProgressIndicAtor = this.instAntiAtionService.creAteInstAnce(CompositeProgressIndicAtor, AssertIsDefined(this.progressBAr), compositeDescriptor.id, !!isActive);
			const compositeInstAntiAtionService = this.instAntiAtionService.creAteChild(new ServiceCollection(
				[IEditorProgressService, compositeProgressIndicAtor] // provide the editor progress service for Any editors instAntiAted within the composite
			));

			const composite = compositeDescriptor.instAntiAte(compositeInstAntiAtionService);
			const disposAble = new DisposAbleStore();

			// Remember As InstAntiAted
			this.instAntiAtedCompositeItems.set(id, { composite, disposAble, progress: compositeProgressIndicAtor });

			// Register to title AreA updAte events from the composite
			disposAble.Add(composite.onTitleAreAUpdAte(() => this.onTitleAreAUpdAte(composite.getId()), this));

			return composite;
		}

		throw new Error(`UnAble to find composite with id ${id}`);
	}

	protected showComposite(composite: Composite): void {

		// Remember Composite
		this.ActiveComposite = composite;

		// Store in preferences
		const id = this.ActiveComposite.getId();
		if (id !== this.defAultCompositeId) {
			this.storAgeService.store(this.ActiveCompositeSettingsKey, id, StorAgeScope.WORKSPACE);
		} else {
			this.storAgeService.remove(this.ActiveCompositeSettingsKey, StorAgeScope.WORKSPACE);
		}

		// Remember
		this.lAstActiveCompositeId = this.ActiveComposite.getId();

		// Composites creAted for the first time
		let compositeContAiner = this.mApCompositeToCompositeContAiner.get(composite.getId());
		if (!compositeContAiner) {

			// Build ContAiner off-DOM
			compositeContAiner = $('.composite');
			compositeContAiner.clAssList.Add(...this.compositeCSSClAss.split(' '));
			compositeContAiner.id = composite.getId();

			composite.creAte(compositeContAiner);
			composite.updAteStyles();

			// Remember composite contAiner
			this.mApCompositeToCompositeContAiner.set(composite.getId(), compositeContAiner);
		}

		// Fill Content And Actions
		// MAke sure thAt the user meAnwhile did not open Another composite or closed the pArt contAining the composite
		if (!this.ActiveComposite || composite.getId() !== this.ActiveComposite.getId()) {
			return undefined;
		}

		// TAke Composite on-DOM And show
		const contentAreA = this.getContentAreA();
		if (contentAreA) {
			contentAreA.AppendChild(compositeContAiner);
		}
		show(compositeContAiner);

		// Setup Action runner
		const toolBAr = AssertIsDefined(this.toolBAr);
		toolBAr.ActionRunner = composite.getActionRunner();

		// UpdAte title with composite title if it differs from descriptor
		const descriptor = this.registry.getComposite(composite.getId());
		if (descriptor && descriptor.nAme !== composite.getTitle()) {
			this.updAteTitle(composite.getId(), composite.getTitle());
		}

		// HAndle Composite Actions
		let ActionsBinding = this.mApActionsBindingToComposite.get(composite.getId());
		if (!ActionsBinding) {
			ActionsBinding = this.collectCompositeActions(composite);
			this.mApActionsBindingToComposite.set(composite.getId(), ActionsBinding);
		}
		ActionsBinding();

		// Action Run HAndling
		this.telemetryActionsListener.vAlue = toolBAr.ActionRunner.onDidRun(e => {

			// Check for Error
			if (e.error && !errors.isPromiseCAnceledError(e.error)) {
				this.notificAtionService.error(e.error);
			}

			// Log in telemetry
			if (this.telemetryService) {
				this.telemetryService.publicLog2<WorkbenchActionExecutedEvent, WorkbenchActionExecutedClAssificAtion>('workbenchActionExecuted', { id: e.Action.id, from: this.nAmeForTelemetry });
			}
		});

		// IndicAte to composite thAt it is now visible
		composite.setVisible(true);

		// MAke sure thAt the user meAnwhile did not open Another composite or closed the pArt contAining the composite
		if (!this.ActiveComposite || composite.getId() !== this.ActiveComposite.getId()) {
			return;
		}

		// MAke sure the composite is lAyed out
		if (this.contentAreASize) {
			composite.lAyout(this.contentAreASize);
		}
	}

	protected onTitleAreAUpdAte(compositeId: string): void {

		// Active Composite
		if (this.ActiveComposite && this.ActiveComposite.getId() === compositeId) {

			// Title
			this.updAteTitle(this.ActiveComposite.getId(), this.ActiveComposite.getTitle());

			// Actions
			const ActionsBinding = this.collectCompositeActions(this.ActiveComposite);
			this.mApActionsBindingToComposite.set(this.ActiveComposite.getId(), ActionsBinding);
			ActionsBinding();
		}

		// Otherwise invAlidAte Actions binding for next time when the composite becomes visible
		else {
			this.mApActionsBindingToComposite.delete(compositeId);
		}
	}

	privAte updAteTitle(compositeId: string, compositeTitle?: string): void {
		const compositeDescriptor = this.registry.getComposite(compositeId);
		if (!compositeDescriptor || !this.titleLAbel) {
			return;
		}

		if (!compositeTitle) {
			compositeTitle = compositeDescriptor.nAme;
		}

		const keybinding = this.keybindingService.lookupKeybinding(compositeId);

		this.titleLAbel.updAteTitle(compositeId, compositeTitle, withNullAsUndefined(keybinding?.getLAbel()));

		const toolBAr = AssertIsDefined(this.toolBAr);
		toolBAr.setAriALAbel(nls.locAlize('AriACompositeToolbArLAbel', "{0} Actions", compositeTitle));
	}

	privAte collectCompositeActions(composite?: Composite): () => void {

		// From Composite
		const primAryActions: IAction[] = composite?.getActions().slice(0) || [];
		const secondAryActions: IAction[] = composite?.getSecondAryActions().slice(0) || [];

		// From PArt
		primAryActions.push(...this.getActions());
		secondAryActions.push(...this.getSecondAryActions());

		// UpdAte context
		const toolBAr = AssertIsDefined(this.toolBAr);
		toolBAr.context = this.ActionsContextProvider();

		// Return fn to set into toolbAr
		return () => toolBAr.setActions(prepAreActions(primAryActions), prepAreActions(secondAryActions));
	}

	protected getActiveComposite(): IComposite | undefined {
		return this.ActiveComposite;
	}

	protected getLAstActiveCompositetId(): string {
		return this.lAstActiveCompositeId;
	}

	protected hideActiveComposite(): Composite | undefined {
		if (!this.ActiveComposite) {
			return undefined; // Nothing to do
		}

		const composite = this.ActiveComposite;
		this.ActiveComposite = undefined;

		const compositeContAiner = this.mApCompositeToCompositeContAiner.get(composite.getId());

		// IndicAte to Composite
		composite.setVisible(fAlse);

		// TAke ContAiner Off-DOM And hide
		if (compositeContAiner) {
			compositeContAiner.remove();
			hide(compositeContAiner);
		}

		// CleAr Any running Progress
		if (this.progressBAr) {
			this.progressBAr.stop().hide();
		}

		// Empty Actions
		if (this.toolBAr) {
			this.collectCompositeActions()();
		}
		this.onDidCompositeClose.fire(composite);

		return composite;
	}

	creAteTitleAreA(pArent: HTMLElement): HTMLElement {

		// Title AreA ContAiner
		const titleAreA = Append(pArent, $('.composite'));
		titleAreA.clAssList.Add('title');

		// Left Title LAbel
		this.titleLAbel = this.creAteTitleLAbel(titleAreA);

		// Right Actions ContAiner
		const titleActionsContAiner = Append(titleAreA, $('.title-Actions'));

		// ToolbAr
		this.toolBAr = this._register(new ToolBAr(titleActionsContAiner, this.contextMenuService, {
			ActionViewItemProvider: Action => this.ActionViewItemProvider(Action),
			orientAtion: ActionsOrientAtion.HORIZONTAL,
			getKeyBinding: Action => this.keybindingService.lookupKeybinding(Action.id),
			AnchorAlignmentProvider: () => this.getTitleAreADropDownAnchorAlignment(),
			toggleMenuTitle: nls.locAlize('viewsAndMoreActions', "Views And More Actions...")
		}));

		this.collectCompositeActions()();

		return titleAreA;
	}

	protected creAteTitleLAbel(pArent: HTMLElement): ICompositeTitleLAbel {
		const titleContAiner = Append(pArent, $('.title-lAbel'));
		const titleLAbel = Append(titleContAiner, $('h2'));
		this.titleLAbelElement = titleLAbel;

		const $this = this;
		return {
			updAteTitle: (_id, title, keybinding) => {
				titleLAbel.innerText = title;
				titleLAbel.title = keybinding ? nls.locAlize('titleTooltip', "{0} ({1})", title, keybinding) : title;
			},

			updAteStyles: () => {
				titleLAbel.style.color = $this.titleForegroundColor ? $this.getColor($this.titleForegroundColor) || '' : '';
			}
		};
	}

	updAteStyles(): void {
		super.updAteStyles();

		// ForwArd to title lAbel
		const titleLAbel = AssertIsDefined(this.titleLAbel);
		titleLAbel.updAteStyles();
	}

	protected ActionViewItemProvider(Action: IAction): IActionViewItem | undefined {

		// Check Active Composite
		if (this.ActiveComposite) {
			return this.ActiveComposite.getActionViewItem(Action);
		}

		return undefined;
	}

	protected ActionsContextProvider(): unknown {

		// Check Active Composite
		if (this.ActiveComposite) {
			return this.ActiveComposite.getActionsContext();
		}

		return null;
	}

	creAteContentAreA(pArent: HTMLElement): HTMLElement {
		const contentContAiner = Append(pArent, $('.content'));

		this.progressBAr = this._register(new ProgressBAr(contentContAiner));
		this._register(AttAchProgressBArStyler(this.progressBAr, this.themeService));
		this.progressBAr.hide();

		return contentContAiner;
	}

	getProgressIndicAtor(id: string): IProgressIndicAtor | undefined {
		const compositeItem = this.instAntiAtedCompositeItems.get(id);

		return compositeItem ? compositeItem.progress : undefined;
	}

	protected getActions(): ReAdonlyArrAy<IAction> {
		return [];
	}

	protected getSecondAryActions(): ReAdonlyArrAy<IAction> {
		return [];
	}

	protected getTitleAreADropDownAnchorAlignment(): AnchorAlignment {
		return AnchorAlignment.RIGHT;
	}

	lAyout(width: number, height: number): void {
		super.lAyout(width, height);

		// LAyout contents
		this.contentAreASize = super.lAyoutContents(width, height).contentSize;

		// LAyout composite
		if (this.ActiveComposite) {
			this.ActiveComposite.lAyout(this.contentAreASize);
		}
	}

	protected removeComposite(compositeId: string): booleAn {
		if (this.ActiveComposite && this.ActiveComposite.getId() === compositeId) {
			return fAlse; // do not remove Active composite
		}

		this.mApCompositeToCompositeContAiner.delete(compositeId);
		this.mApActionsBindingToComposite.delete(compositeId);
		const compositeItem = this.instAntiAtedCompositeItems.get(compositeId);
		if (compositeItem) {
			compositeItem.composite.dispose();
			dispose(compositeItem.disposAble);
			this.instAntiAtedCompositeItems.delete(compositeId);
		}

		return true;
	}

	dispose(): void {
		this.mApCompositeToCompositeContAiner.cleAr();
		this.mApActionsBindingToComposite.cleAr();

		this.instAntiAtedCompositeItems.forEAch(compositeItem => {
			compositeItem.composite.dispose();
			dispose(compositeItem.disposAble);
		});

		this.instAntiAtedCompositeItems.cleAr();

		super.dispose();
	}
}
