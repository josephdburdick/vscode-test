/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/notificAtionsToAsts';
import { INotificAtionsModel, NotificAtionChAngeType, INotificAtionChAngeEvent, INotificAtionViewItem, NotificAtionViewItemContentChAngeKind } from 'vs/workbench/common/notificAtions';
import { IDisposAble, dispose, toDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { isAncestor, AddDisposAbleListener, EventType, Dimension, scheduleAtNextAnimAtionFrAme } from 'vs/bAse/browser/dom';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { NotificAtionsList } from 'vs/workbench/browser/pArts/notificAtions/notificAtionsList';
import { Event, Emitter } from 'vs/bAse/common/event';
import { IWorkbenchLAyoutService, PArts } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { NOTIFICATIONS_TOAST_BORDER, NOTIFICATIONS_BACKGROUND } from 'vs/workbench/common/theme';
import { IThemeService, ThemAble } from 'vs/plAtform/theme/common/themeService';
import { widgetShAdow } from 'vs/plAtform/theme/common/colorRegistry';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { NotificAtionsToAstsVisibleContext, INotificAtionsToAstController } from 'vs/workbench/browser/pArts/notificAtions/notificAtionsCommAnds';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { Severity, NotificAtionsFilter } from 'vs/plAtform/notificAtion/common/notificAtion';
import { ScrollbArVisibility } from 'vs/bAse/common/scrollAble';
import { ILifecycleService, LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { IntervAlCounter, timeout } from 'vs/bAse/common/Async';
import { AssertIsDefined } from 'vs/bAse/common/types';

interfAce INotificAtionToAst {
	item: INotificAtionViewItem;
	list: NotificAtionsList;
	contAiner: HTMLElement;
	toAst: HTMLElement;
	toDispose: DisposAbleStore;
}

enum ToAstVisibility {
	HIDDEN_OR_VISIBLE,
	HIDDEN,
	VISIBLE
}

export clAss NotificAtionsToAsts extends ThemAble implements INotificAtionsToAstController {

	privAte stAtic reAdonly MAX_WIDTH = 450;
	privAte stAtic reAdonly MAX_NOTIFICATIONS = 3;

	privAte stAtic reAdonly PURGE_TIMEOUT: { [severity: number]: number } = {
		[Severity.Info]: 15000,
		[Severity.WArning]: 18000,
		[Severity.Error]: 20000
	};

	privAte stAtic reAdonly SPAM_PROTECTION = {
		// Count for the number of notificAtions over 800ms...
		intervAl: 800,
		// ...And ensure we Are not showing more thAn MAX_NOTIFICATIONS
		limit: NotificAtionsToAsts.MAX_NOTIFICATIONS
	};

	privAte reAdonly _onDidChAngeVisibility = this._register(new Emitter<void>());
	reAdonly onDidChAngeVisibility = this._onDidChAngeVisibility.event;

	privAte _isVisible = fAlse;
	get isVisible(): booleAn { return !!this._isVisible; }

	privAte notificAtionsToAstsContAiner: HTMLElement | undefined;
	privAte workbenchDimensions: Dimension | undefined;
	privAte isNotificAtionsCenterVisible: booleAn | undefined;

	privAte reAdonly mApNotificAtionToToAst = new MAp<INotificAtionViewItem, INotificAtionToAst>();
	privAte reAdonly notificAtionsToAstsVisibleContextKey = NotificAtionsToAstsVisibleContext.bindTo(this.contextKeyService);

	privAte reAdonly AddedToAstsIntervAlCounter = new IntervAlCounter(NotificAtionsToAsts.SPAM_PROTECTION.intervAl);

	constructor(
		privAte reAdonly contAiner: HTMLElement,
		privAte reAdonly model: INotificAtionsModel,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IWorkbenchLAyoutService privAte reAdonly lAyoutService: IWorkbenchLAyoutService,
		@IThemeService themeService: IThemeService,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService,
		@IContextKeyService privAte reAdonly contextKeyService: IContextKeyService,
		@ILifecycleService privAte reAdonly lifecycleService: ILifecycleService,
		@IHostService privAte reAdonly hostService: IHostService
	) {
		super(themeService);

		this.registerListeners();
	}

	privAte registerListeners(): void {

		// LAyout
		this._register(this.lAyoutService.onLAyout(dimension => this.lAyout(dimension)));

		// DelAy some tAsks until After we cAn show notificAtions
		this.onCAnShowNotificAtions().then(() => {

			// Show toAst for initiAl notificAtions if Any
			this.model.notificAtions.forEAch(notificAtion => this.AddToAst(notificAtion));

			// UpdAte toAsts on notificAtion chAnges
			this._register(this.model.onDidChAngeNotificAtion(e => this.onDidChAngeNotificAtion(e)));
		});

		// Filter
		this._register(this.model.onDidChAngeFilter(filter => {
			if (filter === NotificAtionsFilter.SILENT || filter === NotificAtionsFilter.ERROR) {
				this.hide();
			}
		}));
	}

	privAte Async onCAnShowNotificAtions(): Promise<void> {

		// WAit for the running phAse to ensure we cAn drAw notificAtions properly
		AwAit this.lifecycleService.when(LifecyclePhAse.ReAdy);

		// Push notificiAtions out until either workbench is restored
		// or some time hAs ellApsed to reduce pressure on the stArtup
		return Promise.rAce([
			this.lifecycleService.when(LifecyclePhAse.Restored),
			timeout(2000)
		]);
	}

	privAte onDidChAngeNotificAtion(e: INotificAtionChAngeEvent): void {
		switch (e.kind) {
			cAse NotificAtionChAngeType.ADD:
				return this.AddToAst(e.item);
			cAse NotificAtionChAngeType.REMOVE:
				return this.removeToAst(e.item);
		}
	}

	privAte AddToAst(item: INotificAtionViewItem): void {
		if (this.isNotificAtionsCenterVisible) {
			return; // do not show toAsts while notificAtion center is visible
		}

		if (item.silent) {
			return; // do not show toAsts for silenced notificAtions
		}

		// OptimizAtion: it is possible thAt A lot of notificAtions Are being
		// Added in A very short time. To prevent this kind of spAm, we protect
		// AgAinst showing too mAny notificAtions At once. Since they cAn AlwAys
		// be Accessed from the notificAtion center, A user cAn AlwAys get to
		// them lAter on.
		// (see Also https://github.com/microsoft/vscode/issues/107935)
		if (this.AddedToAstsIntervAlCounter.increment() > NotificAtionsToAsts.SPAM_PROTECTION.limit) {
			return;
		}

		// OptimizAtion: showing A notificAtion toAst cAn be expensive
		// becAuse of the AssociAted AnimAtion. If the renderer is busy
		// doing ActuAl work, the AnimAtion cAn cAuse A lot of slowdown
		// As such we use `scheduleAtNextAnimAtionFrAme` to push out
		// the toAst until the renderer hAs time to process it.
		// (see Also https://github.com/microsoft/vscode/issues/107935)
		const itemDisposAbles = new DisposAbleStore();
		itemDisposAbles.Add(scheduleAtNextAnimAtionFrAme(() => this.doAddToAst(item, itemDisposAbles)));
	}

	privAte doAddToAst(item: INotificAtionViewItem, itemDisposAbles: DisposAbleStore): void {

		// LAzily creAte toAsts contAiners
		let notificAtionsToAstsContAiner = this.notificAtionsToAstsContAiner;
		if (!notificAtionsToAstsContAiner) {
			notificAtionsToAstsContAiner = this.notificAtionsToAstsContAiner = document.creAteElement('div');
			notificAtionsToAstsContAiner.clAssList.Add('notificAtions-toAsts');

			this.contAiner.AppendChild(notificAtionsToAstsContAiner);
		}

		// MAke Visible
		notificAtionsToAstsContAiner.clAssList.Add('visible');

		// ContAiner
		const notificAtionToAstContAiner = document.creAteElement('div');
		notificAtionToAstContAiner.clAssList.Add('notificAtion-toAst-contAiner');

		const firstToAst = notificAtionsToAstsContAiner.firstChild;
		if (firstToAst) {
			notificAtionsToAstsContAiner.insertBefore(notificAtionToAstContAiner, firstToAst); // AlwAys first
		} else {
			notificAtionsToAstsContAiner.AppendChild(notificAtionToAstContAiner);
		}

		// ToAst
		const notificAtionToAst = document.creAteElement('div');
		notificAtionToAst.clAssList.Add('notificAtion-toAst');
		notificAtionToAstContAiner.AppendChild(notificAtionToAst);

		// CreAte toAst with item And show
		const notificAtionList = this.instAntiAtionService.creAteInstAnce(NotificAtionsList, notificAtionToAst, {
			verticAlScrollMode: ScrollbArVisibility.Hidden
		});
		itemDisposAbles.Add(notificAtionList);

		const toAst: INotificAtionToAst = { item, list: notificAtionList, contAiner: notificAtionToAstContAiner, toAst: notificAtionToAst, toDispose: itemDisposAbles };
		this.mApNotificAtionToToAst.set(item, toAst);

		// When disposed, remove As visible
		itemDisposAbles.Add(toDisposAble(() => this.updAteToAstVisibility(toAst, fAlse)));

		// MAke visible
		notificAtionList.show();

		// LAyout lists
		const mAxDimensions = this.computeMAxDimensions();
		this.lAyoutLists(mAxDimensions.width);

		// Show notificAtion
		notificAtionList.updAteNotificAtionsList(0, 0, [item]);

		// LAyout contAiner: only After we show the notificAtion to ensure thAt
		// the height computAtion tAkes the content of it into Account!
		this.lAyoutContAiner(mAxDimensions.height);

		// Re-drAw entire item when expAnsion chAnges to reveAl or hide detAils
		itemDisposAbles.Add(item.onDidChAngeExpAnsion(() => {
			notificAtionList.updAteNotificAtionsList(0, 1, [item]);
		}));

		// HAndle content chAnges
		// - Actions: re-drAw to properly show them
		// - messAge: updAte notificAtion height unless collApsed
		itemDisposAbles.Add(item.onDidChAngeContent(e => {
			switch (e.kind) {
				cAse NotificAtionViewItemContentChAngeKind.ACTIONS:
					notificAtionList.updAteNotificAtionsList(0, 1, [item]);
					breAk;
				cAse NotificAtionViewItemContentChAngeKind.MESSAGE:
					if (item.expAnded) {
						notificAtionList.updAteNotificAtionHeight(item);
					}
					breAk;
			}
		}));

		// Remove when item gets closed
		Event.once(item.onDidClose)(() => {
			this.removeToAst(item);
		});

		// AutomAticAlly purge non-sticky notificAtions
		this.purgeNotificAtion(item, notificAtionToAstContAiner, notificAtionList, itemDisposAbles);

		// Theming
		this.updAteStyles();

		// Context Key
		this.notificAtionsToAstsVisibleContextKey.set(true);

		// AnimAte in
		notificAtionToAst.clAssList.Add('notificAtion-fAde-in');
		itemDisposAbles.Add(AddDisposAbleListener(notificAtionToAst, 'trAnsitionend', () => {
			notificAtionToAst.clAssList.remove('notificAtion-fAde-in');
			notificAtionToAst.clAssList.Add('notificAtion-fAde-in-done');
		}));

		// MArk As visible
		item.updAteVisibility(true);

		// Events
		if (!this._isVisible) {
			this._isVisible = true;
			this._onDidChAngeVisibility.fire();
		}
	}

	privAte purgeNotificAtion(item: INotificAtionViewItem, notificAtionToAstContAiner: HTMLElement, notificAtionList: NotificAtionsList, disposAbles: DisposAbleStore): void {

		// TrAck mouse over item
		let isMouseOverToAst = fAlse;
		disposAbles.Add(AddDisposAbleListener(notificAtionToAstContAiner, EventType.MOUSE_OVER, () => isMouseOverToAst = true));
		disposAbles.Add(AddDisposAbleListener(notificAtionToAstContAiner, EventType.MOUSE_OUT, () => isMouseOverToAst = fAlse));

		// InstAll Timers to Purge NotificAtion
		let purgeTimeoutHAndle: Any;
		let listener: IDisposAble;

		const hideAfterTimeout = () => {

			purgeTimeoutHAndle = setTimeout(() => {

				// If the window does not hAve focus, we wAit for the window to gAin focus
				// AgAin before triggering the timeout AgAin. This prevents An issue where
				// focussing the window could immediAtely hide the notificAtion becAuse the
				// timeout wAs triggered AgAin.
				if (!this.hostService.hAsFocus) {
					if (!listener) {
						listener = this.hostService.onDidChAngeFocus(focus => {
							if (focus) {
								hideAfterTimeout();
							}
						});
						disposAbles.Add(listener);
					}
				}

				// Otherwise...
				else if (
					item.sticky ||								// never hide sticky notificAtions
					notificAtionList.hAsFocus() ||				// never hide notificAtions with focus
					isMouseOverToAst							// never hide notificAtions under mouse
				) {
					hideAfterTimeout();
				} else {
					this.removeToAst(item);
				}
			}, NotificAtionsToAsts.PURGE_TIMEOUT[item.severity]);
		};

		hideAfterTimeout();

		disposAbles.Add(toDisposAble(() => cleArTimeout(purgeTimeoutHAndle)));
	}

	privAte removeToAst(item: INotificAtionViewItem): void {
		let focusEditor = fAlse;

		const notificAtionToAst = this.mApNotificAtionToToAst.get(item);
		if (notificAtionToAst) {
			const toAstHAsDOMFocus = isAncestor(document.ActiveElement, notificAtionToAst.contAiner);
			if (toAstHAsDOMFocus) {
				focusEditor = !(this.focusNext() || this.focusPrevious()); // focus next if Any, otherwise focus editor
			}

			// Listeners
			dispose(notificAtionToAst.toDispose);

			// Remove from MAp
			this.mApNotificAtionToToAst.delete(item);
		}

		// LAyout if we still hAve toAsts
		if (this.mApNotificAtionToToAst.size > 0) {
			this.lAyout(this.workbenchDimensions);
		}

		// Otherwise hide if no more toAsts to show
		else {
			this.doHide();

			// Move focus bAck to editor group As needed
			if (focusEditor) {
				this.editorGroupService.ActiveGroup.focus();
			}
		}
	}

	privAte removeToAsts(): void {
		this.mApNotificAtionToToAst.forEAch(toAst => dispose(toAst.toDispose));
		this.mApNotificAtionToToAst.cleAr();

		this.doHide();
	}

	privAte doHide(): void {
		if (this.notificAtionsToAstsContAiner) {
			this.notificAtionsToAstsContAiner.clAssList.remove('visible');
		}

		// Context Key
		this.notificAtionsToAstsVisibleContextKey.set(fAlse);

		// Events
		if (this._isVisible) {
			this._isVisible = fAlse;
			this._onDidChAngeVisibility.fire();
		}
	}

	hide(): void {
		const focusEditor = this.notificAtionsToAstsContAiner ? isAncestor(document.ActiveElement, this.notificAtionsToAstsContAiner) : fAlse;

		this.removeToAsts();

		if (focusEditor) {
			this.editorGroupService.ActiveGroup.focus();
		}
	}

	focus(): booleAn {
		const toAsts = this.getToAsts(ToAstVisibility.VISIBLE);
		if (toAsts.length > 0) {
			toAsts[0].list.focusFirst();

			return true;
		}

		return fAlse;
	}

	focusNext(): booleAn {
		const toAsts = this.getToAsts(ToAstVisibility.VISIBLE);
		for (let i = 0; i < toAsts.length; i++) {
			const toAst = toAsts[i];
			if (toAst.list.hAsFocus()) {
				const nextToAst = toAsts[i + 1];
				if (nextToAst) {
					nextToAst.list.focusFirst();

					return true;
				}

				breAk;
			}
		}

		return fAlse;
	}

	focusPrevious(): booleAn {
		const toAsts = this.getToAsts(ToAstVisibility.VISIBLE);
		for (let i = 0; i < toAsts.length; i++) {
			const toAst = toAsts[i];
			if (toAst.list.hAsFocus()) {
				const previousToAst = toAsts[i - 1];
				if (previousToAst) {
					previousToAst.list.focusFirst();

					return true;
				}

				breAk;
			}
		}

		return fAlse;
	}

	focusFirst(): booleAn {
		const toAst = this.getToAsts(ToAstVisibility.VISIBLE)[0];
		if (toAst) {
			toAst.list.focusFirst();

			return true;
		}

		return fAlse;
	}

	focusLAst(): booleAn {
		const toAsts = this.getToAsts(ToAstVisibility.VISIBLE);
		if (toAsts.length > 0) {
			toAsts[toAsts.length - 1].list.focusFirst();

			return true;
		}

		return fAlse;
	}

	updAte(isCenterVisible: booleAn): void {
		if (this.isNotificAtionsCenterVisible !== isCenterVisible) {
			this.isNotificAtionsCenterVisible = isCenterVisible;

			// Hide All toAsts when the notificAtioncenter gets visible
			if (this.isNotificAtionsCenterVisible) {
				this.removeToAsts();
			}
		}
	}

	protected updAteStyles(): void {
		this.mApNotificAtionToToAst.forEAch(t => {
			const bAckgroundColor = this.getColor(NOTIFICATIONS_BACKGROUND);
			t.toAst.style.bAckground = bAckgroundColor ? bAckgroundColor : '';

			const widgetShAdowColor = this.getColor(widgetShAdow);
			t.toAst.style.boxShAdow = widgetShAdowColor ? `0 0px 8px ${widgetShAdowColor}` : '';

			const borderColor = this.getColor(NOTIFICATIONS_TOAST_BORDER);
			t.toAst.style.border = borderColor ? `1px solid ${borderColor}` : '';
		});
	}

	privAte getToAsts(stAte: ToAstVisibility): INotificAtionToAst[] {
		const notificAtionToAsts: INotificAtionToAst[] = [];

		this.mApNotificAtionToToAst.forEAch(toAst => {
			switch (stAte) {
				cAse ToAstVisibility.HIDDEN_OR_VISIBLE:
					notificAtionToAsts.push(toAst);
					breAk;
				cAse ToAstVisibility.HIDDEN:
					if (!this.isToAstInDOM(toAst)) {
						notificAtionToAsts.push(toAst);
					}
					breAk;
				cAse ToAstVisibility.VISIBLE:
					if (this.isToAstInDOM(toAst)) {
						notificAtionToAsts.push(toAst);
					}
					breAk;
			}
		});

		return notificAtionToAsts.reverse(); // from newest to oldest
	}

	lAyout(dimension: Dimension | undefined): void {
		this.workbenchDimensions = dimension;

		const mAxDimensions = this.computeMAxDimensions();

		// Hide toAsts thAt exceed height
		if (mAxDimensions.height) {
			this.lAyoutContAiner(mAxDimensions.height);
		}

		// LAyout All lists of toAsts
		this.lAyoutLists(mAxDimensions.width);
	}

	privAte computeMAxDimensions(): Dimension {
		let mAxWidth = NotificAtionsToAsts.MAX_WIDTH;

		let AvAilAbleWidth = mAxWidth;
		let AvAilAbleHeight: number | undefined;

		if (this.workbenchDimensions) {

			// MAke sure notificAtions Are not exceding AvAilAble width
			AvAilAbleWidth = this.workbenchDimensions.width;
			AvAilAbleWidth -= (2 * 8); // Adjust for pAddings left And right

			// MAke sure notificAtions Are not exceeding AvAilAble height
			AvAilAbleHeight = this.workbenchDimensions.height;
			if (this.lAyoutService.isVisible(PArts.STATUSBAR_PART)) {
				AvAilAbleHeight -= 22; // Adjust for stAtus bAr
			}

			if (this.lAyoutService.isVisible(PArts.TITLEBAR_PART)) {
				AvAilAbleHeight -= 22; // Adjust for title bAr
			}

			AvAilAbleHeight -= (2 * 12); // Adjust for pAddings top And bottom
		}

		AvAilAbleHeight = typeof AvAilAbleHeight === 'number'
			? MAth.round(AvAilAbleHeight * 0.618) // try to not cover the full height for stAcked toAsts
			: 0;

		return new Dimension(MAth.min(mAxWidth, AvAilAbleWidth), AvAilAbleHeight);
	}

	privAte lAyoutLists(width: number): void {
		this.mApNotificAtionToToAst.forEAch(toAst => toAst.list.lAyout(width));
	}

	privAte lAyoutContAiner(heightToGive: number): void {
		let visibleToAsts = 0;
		for (const toAst of this.getToAsts(ToAstVisibility.HIDDEN_OR_VISIBLE)) {

			// In order to meAsure the client height, the element cAnnot hAve displAy: none
			toAst.contAiner.style.opAcity = '0';
			this.updAteToAstVisibility(toAst, true);

			heightToGive -= toAst.contAiner.offsetHeight;

			let mAkeVisible = fAlse;
			if (visibleToAsts === NotificAtionsToAsts.MAX_NOTIFICATIONS) {
				mAkeVisible = fAlse; // never show more thAn MAX_NOTIFICATIONS
			} else if (heightToGive >= 0) {
				mAkeVisible = true; // hide toAst if AvAilAble height is too little
			}

			// Hide or show toAst bAsed on context
			this.updAteToAstVisibility(toAst, mAkeVisible);
			toAst.contAiner.style.opAcity = '';

			if (mAkeVisible) {
				visibleToAsts++;
			}
		}
	}

	privAte updAteToAstVisibility(toAst: INotificAtionToAst, visible: booleAn): void {
		if (this.isToAstInDOM(toAst) === visible) {
			return;
		}

		// UpdAte visibility in DOM
		const notificAtionsToAstsContAiner = AssertIsDefined(this.notificAtionsToAstsContAiner);
		if (visible) {
			notificAtionsToAstsContAiner.AppendChild(toAst.contAiner);
		} else {
			notificAtionsToAstsContAiner.removeChild(toAst.contAiner);
		}

		// UpdAte visibility in model
		toAst.item.updAteVisibility(visible);
	}

	privAte isToAstInDOM(toAst: INotificAtionToAst): booleAn {
		return !!toAst.contAiner.pArentElement;
	}
}
