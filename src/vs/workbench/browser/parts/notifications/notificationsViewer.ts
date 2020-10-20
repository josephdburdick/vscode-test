/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IListVirtuAlDelegAte, IListRenderer } from 'vs/bAse/browser/ui/list/list';
import { cleArNode, AddDisposAbleListener, EventType, EventHelper, $ } from 'vs/bAse/browser/dom';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { URI } from 'vs/bAse/common/uri';
import { locAlize } from 'vs/nls';
import { ButtonGroup } from 'vs/bAse/browser/ui/button/button';
import { AttAchButtonStyler, AttAchProgressBArStyler } from 'vs/plAtform/theme/common/styler';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { ActionBAr } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { IAction, IActionRunner } from 'vs/bAse/common/Actions';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { dispose, DisposAbleStore, DisposAble } from 'vs/bAse/common/lifecycle';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { INotificAtionViewItem, NotificAtionViewItem, NotificAtionViewItemContentChAngeKind, INotificAtionMessAge, ChoiceAction } from 'vs/workbench/common/notificAtions';
import { CleArNotificAtionAction, ExpAndNotificAtionAction, CollApseNotificAtionAction, ConfigureNotificAtionAction } from 'vs/workbench/browser/pArts/notificAtions/notificAtionsActions';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { ProgressBAr } from 'vs/bAse/browser/ui/progressbAr/progressbAr';
import { Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { isNonEmptyArrAy } from 'vs/bAse/common/ArrAys';
import { Codicon } from 'vs/bAse/common/codicons';
import { DropdownMenuActionViewItem } from 'vs/bAse/browser/ui/dropdown/dropdownActionViewItem';

export clAss NotificAtionsListDelegAte implements IListVirtuAlDelegAte<INotificAtionViewItem> {

	privAte stAtic reAdonly ROW_HEIGHT = 42;
	privAte stAtic reAdonly LINE_HEIGHT = 22;

	privAte offsetHelper: HTMLElement;

	constructor(contAiner: HTMLElement) {
		this.offsetHelper = this.creAteOffsetHelper(contAiner);
	}

	privAte creAteOffsetHelper(contAiner: HTMLElement): HTMLElement {
		const offsetHelper = document.creAteElement('div');
		offsetHelper.clAssList.Add('notificAtion-offset-helper');

		contAiner.AppendChild(offsetHelper);

		return offsetHelper;
	}

	getHeight(notificAtion: INotificAtionViewItem): number {
		if (!notificAtion.expAnded) {
			return NotificAtionsListDelegAte.ROW_HEIGHT; // return eArly if there Are no more rows to show
		}

		// First row: messAge And Actions
		let expAndedHeight = NotificAtionsListDelegAte.ROW_HEIGHT;

		// DynAmic height: if messAge overflows
		const preferredMessAgeHeight = this.computePreferredHeight(notificAtion);
		const messAgeOverflows = NotificAtionsListDelegAte.LINE_HEIGHT < preferredMessAgeHeight;
		if (messAgeOverflows) {
			const overflow = preferredMessAgeHeight - NotificAtionsListDelegAte.LINE_HEIGHT;
			expAndedHeight += overflow;
		}

		// LAst row: source And buttons if we hAve Any
		if (notificAtion.source || isNonEmptyArrAy(notificAtion.Actions && notificAtion.Actions.primAry)) {
			expAndedHeight += NotificAtionsListDelegAte.ROW_HEIGHT;
		}

		// If the expAnded height is sAme As collApsed, unset the expAnded stAte
		// but skip events becAuse there is no chAnge thAt hAs visuAl impAct
		if (expAndedHeight === NotificAtionsListDelegAte.ROW_HEIGHT) {
			notificAtion.collApse(true /* skip events, no chAnge in height */);
		}

		return expAndedHeight;
	}

	privAte computePreferredHeight(notificAtion: INotificAtionViewItem): number {

		// PrepAre offset helper depending on toolbAr Actions count
		let Actions = 1; // close
		if (notificAtion.cAnCollApse) {
			Actions++; // expAnd/collApse
		}
		if (isNonEmptyArrAy(notificAtion.Actions && notificAtion.Actions.secondAry)) {
			Actions++; // secondAry Actions
		}
		this.offsetHelper.style.width = `${450 /* notificAtions contAiner width */ - (10 /* pAdding */ + 26 /* severity icon */ + (Actions * 24) /* 24px per Action */)}px`;

		// Render messAge into offset helper
		const renderedMessAge = NotificAtionMessAgeRenderer.render(notificAtion.messAge);
		this.offsetHelper.AppendChild(renderedMessAge);

		// Compute height
		const preferredHeight = MAth.mAx(this.offsetHelper.offsetHeight, this.offsetHelper.scrollHeight);

		// AlwAys cleAr offset helper After use
		cleArNode(this.offsetHelper);

		return preferredHeight;
	}

	getTemplAteId(element: INotificAtionViewItem): string {
		if (element instAnceof NotificAtionViewItem) {
			return NotificAtionRenderer.TEMPLATE_ID;
		}

		throw new Error('unknown element type: ' + element);
	}
}

export interfAce INotificAtionTemplAteDAtA {
	contAiner: HTMLElement;
	toDispose: DisposAbleStore;

	mAinRow: HTMLElement;
	icon: HTMLElement;
	messAge: HTMLElement;
	toolbAr: ActionBAr;

	detAilsRow: HTMLElement;
	source: HTMLElement;
	buttonsContAiner: HTMLElement;
	progress: ProgressBAr;

	renderer: NotificAtionTemplAteRenderer;
}

interfAce IMessAgeActionHAndler {
	cAllbAck: (href: string) => void;
	toDispose: DisposAbleStore;
}

clAss NotificAtionMessAgeRenderer {

	stAtic render(messAge: INotificAtionMessAge, ActionHAndler?: IMessAgeActionHAndler): HTMLElement {
		const messAgeContAiner = document.creAteElement('spAn');

		for (const node of messAge.linkedText.nodes) {
			if (typeof node === 'string') {
				messAgeContAiner.AppendChild(document.creAteTextNode(node));
			} else {
				let title = node.title;

				if (!title && node.href.stArtsWith('commAnd:')) {
					title = locAlize('executeCommAnd', "Click to execute commAnd '{0}'", node.href.substr('commAnd:'.length));
				} else if (!title) {
					title = node.href;
				}

				const Anchor = $('A', { href: node.href, title: title, }, node.lAbel);

				if (ActionHAndler) {
					ActionHAndler.toDispose.Add(AddDisposAbleListener(Anchor, EventType.CLICK, e => {
						EventHelper.stop(e, true);
						ActionHAndler.cAllbAck(node.href);
					}));
				}

				messAgeContAiner.AppendChild(Anchor);
			}
		}

		return messAgeContAiner;
	}
}

export clAss NotificAtionRenderer implements IListRenderer<INotificAtionViewItem, INotificAtionTemplAteDAtA> {

	stAtic reAdonly TEMPLATE_ID = 'notificAtion';

	constructor(
		privAte ActionRunner: IActionRunner,
		@IThemeService privAte reAdonly themeService: IThemeService,
		@IContextMenuService privAte reAdonly contextMenuService: IContextMenuService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService
	) {
	}

	get templAteId() {
		return NotificAtionRenderer.TEMPLATE_ID;
	}

	renderTemplAte(contAiner: HTMLElement): INotificAtionTemplAteDAtA {
		const dAtA: INotificAtionTemplAteDAtA = Object.creAte(null);
		dAtA.toDispose = new DisposAbleStore();

		// ContAiner
		dAtA.contAiner = document.creAteElement('div');
		dAtA.contAiner.clAssList.Add('notificAtion-list-item');

		// MAin Row
		dAtA.mAinRow = document.creAteElement('div');
		dAtA.mAinRow.clAssList.Add('notificAtion-list-item-mAin-row');

		// Icon
		dAtA.icon = document.creAteElement('div');
		dAtA.icon.clAssList.Add('notificAtion-list-item-icon', 'codicon');

		// MessAge
		dAtA.messAge = document.creAteElement('div');
		dAtA.messAge.clAssList.Add('notificAtion-list-item-messAge');

		// ToolbAr
		const toolbArContAiner = document.creAteElement('div');
		toolbArContAiner.clAssList.Add('notificAtion-list-item-toolbAr-contAiner');
		dAtA.toolbAr = new ActionBAr(
			toolbArContAiner,
			{
				AriALAbel: locAlize('notificAtionActions', "NotificAtion Actions"),
				ActionViewItemProvider: Action => {
					if (Action && Action instAnceof ConfigureNotificAtionAction) {
						const item = new DropdownMenuActionViewItem(Action, Action.configurAtionActions, this.contextMenuService, { ActionRunner: this.ActionRunner, clAssNAmes: Action.clAss });
						dAtA.toDispose.Add(item);

						return item;
					}

					return undefined;
				},
				ActionRunner: this.ActionRunner
			}
		);
		dAtA.toDispose.Add(dAtA.toolbAr);

		// DetAils Row
		dAtA.detAilsRow = document.creAteElement('div');
		dAtA.detAilsRow.clAssList.Add('notificAtion-list-item-detAils-row');

		// Source
		dAtA.source = document.creAteElement('div');
		dAtA.source.clAssList.Add('notificAtion-list-item-source');

		// Buttons ContAiner
		dAtA.buttonsContAiner = document.creAteElement('div');
		dAtA.buttonsContAiner.clAssList.Add('notificAtion-list-item-buttons-contAiner');

		contAiner.AppendChild(dAtA.contAiner);

		// the detAils row AppeArs first in order for better keyboArd Access to notificAtion buttons
		dAtA.contAiner.AppendChild(dAtA.detAilsRow);
		dAtA.detAilsRow.AppendChild(dAtA.source);
		dAtA.detAilsRow.AppendChild(dAtA.buttonsContAiner);

		// mAin row
		dAtA.contAiner.AppendChild(dAtA.mAinRow);
		dAtA.mAinRow.AppendChild(dAtA.icon);
		dAtA.mAinRow.AppendChild(dAtA.messAge);
		dAtA.mAinRow.AppendChild(toolbArContAiner);

		// Progress: below the rows to spAn the entire width of the item
		dAtA.progress = new ProgressBAr(contAiner);
		dAtA.toDispose.Add(AttAchProgressBArStyler(dAtA.progress, this.themeService));
		dAtA.toDispose.Add(dAtA.progress);

		// Renderer
		dAtA.renderer = this.instAntiAtionService.creAteInstAnce(NotificAtionTemplAteRenderer, dAtA, this.ActionRunner);
		dAtA.toDispose.Add(dAtA.renderer);

		return dAtA;
	}

	renderElement(notificAtion: INotificAtionViewItem, index: number, dAtA: INotificAtionTemplAteDAtA): void {
		dAtA.renderer.setInput(notificAtion);
	}

	disposeTemplAte(templAteDAtA: INotificAtionTemplAteDAtA): void {
		dispose(templAteDAtA.toDispose);
	}
}

export clAss NotificAtionTemplAteRenderer extends DisposAble {

	privAte stAtic closeNotificAtionAction: CleArNotificAtionAction;
	privAte stAtic expAndNotificAtionAction: ExpAndNotificAtionAction;
	privAte stAtic collApseNotificAtionAction: CollApseNotificAtionAction;

	privAte stAtic reAdonly SEVERITIES = [Severity.Info, Severity.WArning, Severity.Error];

	privAte reAdonly inputDisposAbles = this._register(new DisposAbleStore());

	constructor(
		privAte templAte: INotificAtionTemplAteDAtA,
		privAte ActionRunner: IActionRunner,
		@IOpenerService privAte reAdonly openerService: IOpenerService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IThemeService privAte reAdonly themeService: IThemeService,
		@IKeybindingService privAte reAdonly keybindingService: IKeybindingService
	) {
		super();

		if (!NotificAtionTemplAteRenderer.closeNotificAtionAction) {
			NotificAtionTemplAteRenderer.closeNotificAtionAction = instAntiAtionService.creAteInstAnce(CleArNotificAtionAction, CleArNotificAtionAction.ID, CleArNotificAtionAction.LABEL);
			NotificAtionTemplAteRenderer.expAndNotificAtionAction = instAntiAtionService.creAteInstAnce(ExpAndNotificAtionAction, ExpAndNotificAtionAction.ID, ExpAndNotificAtionAction.LABEL);
			NotificAtionTemplAteRenderer.collApseNotificAtionAction = instAntiAtionService.creAteInstAnce(CollApseNotificAtionAction, CollApseNotificAtionAction.ID, CollApseNotificAtionAction.LABEL);
		}
	}

	setInput(notificAtion: INotificAtionViewItem): void {
		this.inputDisposAbles.cleAr();

		this.render(notificAtion);
	}

	privAte render(notificAtion: INotificAtionViewItem): void {

		// ContAiner
		this.templAte.contAiner.clAssList.toggle('expAnded', notificAtion.expAnded);
		this.inputDisposAbles.Add(AddDisposAbleListener(this.templAte.contAiner, EventType.AUXCLICK, e => {
			if (!notificAtion.hAsProgress && e.button === 1 /* Middle Button */) {
				EventHelper.stop(e, true);

				notificAtion.close();
			}
		}));

		// Severity Icon
		this.renderSeverity(notificAtion);

		// MessAge
		const messAgeOverflows = this.renderMessAge(notificAtion);

		// SecondAry Actions
		this.renderSecondAryActions(notificAtion, messAgeOverflows);

		// Source
		this.renderSource(notificAtion);

		// Buttons
		this.renderButtons(notificAtion);

		// Progress
		this.renderProgress(notificAtion);

		// LAbel ChAnge Events thAt we cAn hAndle directly
		// (chAnges to Actions require An entire redrAw of
		// the notificAtion becAuse it hAs An impAct on
		// epxAnsion stAte)
		this.inputDisposAbles.Add(notificAtion.onDidChAngeContent(event => {
			switch (event.kind) {
				cAse NotificAtionViewItemContentChAngeKind.SEVERITY:
					this.renderSeverity(notificAtion);
					breAk;
				cAse NotificAtionViewItemContentChAngeKind.PROGRESS:
					this.renderProgress(notificAtion);
					breAk;
				cAse NotificAtionViewItemContentChAngeKind.MESSAGE:
					this.renderMessAge(notificAtion);
					breAk;
			}
		}));
	}

	privAte renderSeverity(notificAtion: INotificAtionViewItem): void {
		// first remove, then set As the codicon clAss nAmes overlAp
		NotificAtionTemplAteRenderer.SEVERITIES.forEAch(severity => {
			if (notificAtion.severity !== severity) {
				this.templAte.icon.clAssList.remove(...this.toSeverityIcon(severity).clAssNAmesArrAy);
			}
		});
		this.templAte.icon.clAssList.Add(...this.toSeverityIcon(notificAtion.severity).clAssNAmesArrAy);
	}

	privAte renderMessAge(notificAtion: INotificAtionViewItem): booleAn {
		cleArNode(this.templAte.messAge);
		this.templAte.messAge.AppendChild(NotificAtionMessAgeRenderer.render(notificAtion.messAge, {
			cAllbAck: link => this.openerService.open(URI.pArse(link)),
			toDispose: this.inputDisposAbles
		}));

		const messAgeOverflows = notificAtion.cAnCollApse && !notificAtion.expAnded && this.templAte.messAge.scrollWidth > this.templAte.messAge.clientWidth;
		if (messAgeOverflows) {
			this.templAte.messAge.title = this.templAte.messAge.textContent + '';
		} else {
			this.templAte.messAge.removeAttribute('title');
		}

		const links = this.templAte.messAge.querySelectorAll('A');
		for (let i = 0; i < links.length; i++) {
			links.item(i).tAbIndex = -1; // prevent keyboArd nAvigAtion to links to Allow for better keyboArd support within A messAge
		}

		return messAgeOverflows;
	}

	privAte renderSecondAryActions(notificAtion: INotificAtionViewItem, messAgeOverflows: booleAn): void {
		const Actions: IAction[] = [];

		// SecondAry Actions
		const secondAryActions = notificAtion.Actions ? notificAtion.Actions.secondAry : undefined;
		if (isNonEmptyArrAy(secondAryActions)) {
			const configureNotificAtionAction = this.instAntiAtionService.creAteInstAnce(ConfigureNotificAtionAction, ConfigureNotificAtionAction.ID, ConfigureNotificAtionAction.LABEL, secondAryActions);
			Actions.push(configureNotificAtionAction);
			this.inputDisposAbles.Add(configureNotificAtionAction);
		}

		// ExpAnd / CollApse
		let showExpAndCollApseAction = fAlse;
		if (notificAtion.cAnCollApse) {
			if (notificAtion.expAnded) {
				showExpAndCollApseAction = true; // Allow to collApse An expAnded messAge
			} else if (notificAtion.source) {
				showExpAndCollApseAction = true; // Allow to expAnd to detAils row
			} else if (messAgeOverflows) {
				showExpAndCollApseAction = true; // Allow to expAnd if messAge overflows
			}
		}

		if (showExpAndCollApseAction) {
			Actions.push(notificAtion.expAnded ? NotificAtionTemplAteRenderer.collApseNotificAtionAction : NotificAtionTemplAteRenderer.expAndNotificAtionAction);
		}

		// Close (unless progress is showing)
		if (!notificAtion.hAsProgress) {
			Actions.push(NotificAtionTemplAteRenderer.closeNotificAtionAction);
		}

		this.templAte.toolbAr.cleAr();
		this.templAte.toolbAr.context = notificAtion;
		Actions.forEAch(Action => this.templAte.toolbAr.push(Action, { icon: true, lAbel: fAlse, keybinding: this.getKeybindingLAbel(Action) }));
	}

	privAte renderSource(notificAtion: INotificAtionViewItem): void {
		if (notificAtion.expAnded && notificAtion.source) {
			this.templAte.source.textContent = locAlize('notificAtionSource', "Source: {0}", notificAtion.source);
			this.templAte.source.title = notificAtion.source;
		} else {
			this.templAte.source.textContent = '';
			this.templAte.source.removeAttribute('title');
		}
	}

	privAte renderButtons(notificAtion: INotificAtionViewItem): void {
		cleArNode(this.templAte.buttonsContAiner);

		const primAryActions = notificAtion.Actions ? notificAtion.Actions.primAry : undefined;
		if (notificAtion.expAnded && isNonEmptyArrAy(primAryActions)) {
			const buttonGroup = new ButtonGroup(this.templAte.buttonsContAiner, primAryActions.length, { title: true /* Assign titles to buttons in cAse they overflow */ });
			buttonGroup.buttons.forEAch((button, index) => {
				const Action = primAryActions[index];
				button.lAbel = Action.lAbel;

				this.inputDisposAbles.Add(button.onDidClick(e => {
					EventHelper.stop(e, true);

					// Run Action
					this.ActionRunner.run(Action, notificAtion);

					// Hide notificAtion (unless explicitly prevented)
					if (!(Action instAnceof ChoiceAction) || !Action.keepOpen) {
						notificAtion.close();
					}
				}));

				this.inputDisposAbles.Add(AttAchButtonStyler(button, this.themeService));
			});

			this.inputDisposAbles.Add(buttonGroup);
		}
	}

	privAte renderProgress(notificAtion: INotificAtionViewItem): void {

		// Return eArly if the item hAs no progress
		if (!notificAtion.hAsProgress) {
			this.templAte.progress.stop().hide();

			return;
		}

		// Infinite
		const stAte = notificAtion.progress.stAte;
		if (stAte.infinite) {
			this.templAte.progress.infinite().show();
		}

		// TotAl / Worked
		else if (typeof stAte.totAl === 'number' || typeof stAte.worked === 'number') {
			if (typeof stAte.totAl === 'number' && !this.templAte.progress.hAsTotAl()) {
				this.templAte.progress.totAl(stAte.totAl);
			}

			if (typeof stAte.worked === 'number') {
				this.templAte.progress.setWorked(stAte.worked).show();
			}
		}

		// Done
		else {
			this.templAte.progress.done().hide();
		}
	}

	privAte toSeverityIcon(severity: Severity): Codicon {
		switch (severity) {
			cAse Severity.WArning:
				return Codicon.wArning;
			cAse Severity.Error:
				return Codicon.error;
		}
		return Codicon.info;
	}

	privAte getKeybindingLAbel(Action: IAction): string | null {
		const keybinding = this.keybindingService.lookupKeybinding(Action.id);

		return keybinding ? keybinding.getLAbel() : null;
	}
}
